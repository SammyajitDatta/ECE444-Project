import { timingSafeEqual } from 'node:crypto';
import express from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateMaster, countWords, MAX_MASTER_CHARS, MAX_JOB_CHARS } from './lib/validation.mjs';
import { transcribePDF, tailorResume, getActiveModel, rankResearchExcerpts } from './lib/gemini.mjs';
import { extractPdfLinks } from './lib/pdf-links.mjs';
import { organizeMasterText } from '../shared/resume-links.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, '.env') });
const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
  const expected = Buffer.from(process.env.RESUME_WORKER_TOKEN || '');
  const actual = Buffer.from(req.headers['x-worker-token'] || '');
  if (!expected.length || expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return res.status(401).json({ error: 'Resume worker requires gateway authentication.' });
  }
  next();
});
app.use(express.json({ limit: '150kb' }));
app.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => callback(null, file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf'))
});

app.get('/api/health', (_req, res) => res.json({ ok: true, model: getActiveModel(), geminiConfigured: !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'replace_with_your_new_key' }));

app.post('/api/research/rank', async (req, res) => {
  const { company, role, excerpts } = req.body ?? {};
  const validLabel = (value) => typeof value === 'string' && value.trim() && value.length <= 200;
  if (!validLabel(company) || !validLabel(role) || !Array.isArray(excerpts) ||
    excerpts.length < 1 || excerpts.length > 24 ||
    !excerpts.every((excerpt) => typeof excerpt === 'string' && excerpt.length <= 1200)) {
    return res.status(400).json({ error: 'Invalid research excerpts.' });
  }
  try {
    const indices = await rankResearchExcerpts(company, role, excerpts);
    res.json({ indices });
  } catch {
    res.status(503).json({ error: 'Gemini excerpt ranking is unavailable.' });
  }
});

app.post('/api/parse-resume', upload.single('file'), async (req, res, next) => {
  try {
    const file = req.file;
    if (!file || file.buffer.subarray(0, 5).toString() !== '%PDF-') return res.status(400).json({ error: 'Please upload a valid PDF file (maximum 10 MB).' });
    let raw = '';
    try { raw = String((await pdfParse(file.buffer)).text || '').trim(); } catch (e) { console.warn('Native text extraction unavailable:', e.message); }
    let transcription = '';
    let extractionNote = '';
    if (raw.length < 100) {
      try { transcription = await transcribePDF(file.buffer); }
      catch (e) { return next(e); }
    }
    const useDirect = raw.length >= 100;
    const pdfLinks = await extractPdfLinks(file.buffer);
    const organized = organizeMasterText(useDirect ? raw : transcription, pdfLinks);
    const text = organized.text.slice(0, MAX_MASTER_CHARS);
    if (countWords(text) < 10) return res.status(422).json({ error: 'Could not extract enough readable text from the PDF. Try a text-based PDF or manual entry.' });
    const note = extractionNote || (useDirect
      ? 'Text copied from the PDF’s underlying text layer to avoid AI rewriting. Verify PDF reading order and formatting.'
      : 'Gemini transcribed this scanned PDF. AI transcription can make mistakes: review every detail before continuing.');
    res.json({ text, links: organized.links, note: organized.links.length ? `${note} Moved ${organized.links.length} link(s) to LINKS FROM MASTER RESUME and the Links we found panel.` : note, validation: validateMaster(text) });
  } catch (e) { next(e); }
});

app.post('/api/generate', async (req, res, next) => {
  try {
    const master = typeof req.body?.master === 'string' ? req.body.master.trim() : '';
    const posting = typeof req.body?.posting === 'string' ? req.body.posting.trim() : '';
    if (!master || master.length > MAX_MASTER_CHARS) return res.status(400).json({ error: 'Provide a master resume below 42,000 characters.' });
    const result = validateMaster(master);
    if (!result.valid) return res.status(422).json({ error: `Master resume is missing: ${result.missing.join(', ')}.` });
    if (!posting || posting.length > MAX_JOB_CHARS) return res.status(400).json({ error: 'Provide a job description below 20,000 characters.' });
    if (result.wordCount < 130) return res.status(422).json({ error: 'There is not enough information in the master resume to fill out a full templated resume.' });
    const tailored = await tailorResume(master, posting);
    res.json({ resume: tailored });
  } catch (e) { next(e); }
});

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) return res.status(400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'PDF must be 10 MB or smaller.' : 'PDF upload failed.' });
  console.error('API error:', error.message);
  res.status(error.status && error.status >= 400 && error.status <= 599 ? error.status : 500).json({ error: error.message || 'Unexpected server error.' });
});

const port = Number(process.env.PORT || 3001);
app.listen(port, '127.0.0.1', () => console.log(`ApplyPilot API running at http://localhost:${port}`));
