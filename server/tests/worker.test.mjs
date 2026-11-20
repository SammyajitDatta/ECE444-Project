import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { PDFDocument } from 'pdf-lib';
import multer from 'multer';
import { catalogMaster } from '../lib/backfill.mjs';
import { createWorkerApp } from '../lib/worker.mjs';

const master = readFileSync(new URL('../../samples/Sammyajit_Datta_SYNTHETIC_Master_Resume.txt', import.meta.url), 'utf8');
const pdfFixture = readFileSync(new URL('../../samples/Sammyajit_Datta_SYNTHETIC_Master_Resume.pdf', import.meta.url));
const posting = 'Build embedded Linux and C++ validation tools.';

function captureRoutes() {
  const middleware = [];
  const routes = new Map();
  const app = {
    disable() {},
    use(fn) { middleware.push(fn); },
    get(path, ...handlers) { routes.set(`GET ${path}`, handlers.at(-1)); },
    post(path, ...handlers) { routes.set(`POST ${path}`, handlers.at(-1)); },
  };
  createWorkerApp(app);
  return { middleware, routes };
}

function response() {
  return {
    statusCode: 200,
    headers: {},
    status(code) { this.statusCode = code; return this; },
    json(data) { this.data = data; return this; },
    setHeader(key, value) { this.headers[key] = value; },
  };
}

async function invoke(route, request = {}) {
  const { middleware, routes } = captureRoutes();
  const res = response();
  const onError = middleware.at(-1);
  await routes.get(route)(request, res, (error) => onError(error, request, res, () => {}));
  return res;
}

function gemini(t, text) {
  process.env.GEMINI_API_KEY = 'worker-test-key';
  process.env.GEMINI_MODEL = 'worker-test-model';
  return t.mock.method(globalThis, 'fetch', async () => Response.json({
    candidates: [{ content: { parts: [{ text }] } }],
  }));
}

test('worker middleware authenticates the gateway even for equal-length invalid tokens', () => {
  const { middleware } = captureRoutes();
  const [authorize, , noStore] = middleware;
  process.env.RESUME_WORKER_TOKEN = 'fixture-token';
  for (const token of [undefined, 'short', 'different-key']) {
    const res = response();
    authorize({ headers: { 'x-worker-token': token } }, res, () => assert.fail('Invalid token was accepted'));
    assert.equal(res.statusCode, 401);
  }
  let calls = 0;
  authorize({ headers: { 'x-worker-token': 'fixture-token' } }, response(), () => calls++);
  const res = response();
  noStore({}, res, () => calls++);
  assert.equal(calls, 2);
  assert.equal(res.headers['Cache-Control'], 'no-store');
});

test('worker health reports configured model and missing Gemini key', async () => {
  delete process.env.GEMINI_API_KEY;
  process.env.GEMINI_MODEL = 'worker-test-model';
  const res = await invoke('GET /api/health');
  assert.deepEqual(res.data, { ok: true, model: 'worker-test-model', geminiConfigured: false });
});

test('research ranking and outreach validate requests before calling Gemini', async () => {
  for (const [route, body] of [
    ['POST /api/research/rank', {}],
    ['POST /api/research/rank', { company: 'Acme', role: 'Developer', excerpts: ['x'.repeat(1201)] }],
    ['POST /api/outreach/draft', { company: 'Acme', role: 'Developer', description: ' ', background: '' }],
    ['POST /api/outreach/draft', { company: 'Acme', role: 'Developer', description: posting, background: 'x'.repeat(801) }],
  ]) {
    const res = await invoke(route, { body });
    assert.equal(res.statusCode, 400);
  }
});

test('research ranking returns the mocked provider order and reports unavailability', async (t) => {
  const request = { body: { company: 'Acme', role: 'Developer', excerpts: ['First', 'Second'] } };
  delete process.env.GEMINI_API_KEY;
  const unavailable = await invoke('POST /api/research/rank', request);
  assert.equal(unavailable.statusCode, 503);
  const transport = gemini(t, '[1, 0]');
  const res = await invoke('POST /api/research/rank', request);
  assert.deepEqual(res.data, { indices: [1, 0] });
  assert.equal(transport.mock.callCount(), 1);
  const [, options] = transport.mock.calls[0].arguments;
  const body = JSON.parse(options.body);
  assert.deepEqual(JSON.parse(body.contents[0].parts[0].text), request.body);
});

test('outreach returns a paragraph from the mocked provider', async (t) => {
  const paragraph = "I'm interested in your team's work building validation tools.";
  const transport = gemini(t, JSON.stringify({ paragraph }));
  const res = await invoke('POST /api/outreach/draft', {
    body: { company: 'Acme', role: 'Developer', description: posting, background: '' },
  });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.data, { paragraph });
  assert.equal(transport.mock.callCount(), 1);
});

test('resume generation rejects missing or incomplete input before calling Gemini', async () => {
  const brief = 'Avery Smith\nEDUCATION\nUniversity\nEXPERIENCE\nDeveloper\nPROJECTS\nWebsite';
  for (const [body, status, message] of [
    [{}, 400, /master resume/],
    [{ master: 'x'.repeat(42_001), posting }, 400, /master resume/],
    [{ master: 'Avery Smith', posting }, 422, /missing/],
    [{ master, posting: '' }, 400, /job description/],
    [{ master, posting: 'x'.repeat(20_001) }, 400, /job description/],
    [{ master: brief, posting }, 422, /not enough information/],
  ]) {
    const res = await invoke('POST /api/generate', { body });
    assert.equal(res.statusCode, status);
    assert.match(res.data.error, message);
  }
});

test('resume generation grounds the mocked response and restores source-backed content', async (t) => {
  const catalog = catalogMaster(master);
  const transport = gemini(t, JSON.stringify({
    name: 'Sammyajit Anindya Datta', contact: 'invented@example.test',
    education: [catalog.education[0]], experience: [catalog.experience[0]],
    projects: [catalog.projects[0]], skills: [],
  }));
  const res = await invoke('POST /api/generate', { body: { master, posting } });
  assert.equal(res.statusCode, 200);
  assert.equal(transport.mock.callCount(), 1);
  assert.equal(res.data.resume.name, 'Sammyajit Anindya Datta');
  assert.match(res.data.resume.contact, /sammyajit\.demo@example\.com/);
  assert.ok(res.data.resume.experience.length > 1);
  assert.ok(res.data.resume.experience.flatMap((entry) => entry.bullets).every((item) => master.includes(item.source)));
});

test('resume generation rejects malformed Gemini output', async (t) => {
  t.mock.method(console, 'error', () => {});
  gemini(t, 'not JSON');
  const res = await invoke('POST /api/generate', { body: { master, posting } });
  assert.equal(res.statusCode, 502);
  assert.match(res.data.error, /malformed JSON/);
});

test('worker rejects invalid resume PDFs and handles upload-size errors', async () => {
  const invalid = await invoke('POST /api/parse-resume', { file: { buffer: Buffer.from('not a PDF') } });
  assert.equal(invalid.statusCode, 400);
  assert.match(invalid.data.error, /valid PDF/);

  const sizeError = new multer.MulterError('LIMIT_FILE_SIZE');
  const res = response();
  captureRoutes().middleware.at(-1)(sizeError, {}, res, () => {});
  assert.equal(res.statusCode, 400);
  assert.match(res.data.error, /10 MB/);
});

test('worker reads fixture PDF text using the local parser', async () => {
  const res = await invoke('POST /api/parse-resume', { file: { buffer: pdfFixture } });
  assert.equal(res.statusCode, 200);
  assert.match(res.data.text, /Sammyajit/);
  assert.match(res.data.note, /underlying text layer/);
});

test('worker uses mocked transcription for PDFs without enough embedded text', async (t) => {
  const doc = await PDFDocument.create();
  doc.addPage();
  const buffer = Buffer.from(await doc.save({ useObjectStreams: false }));
  const text = 'Avery Smith\nDeveloped useful reporting tools that help small teams document repeated processing errors.';
  const transport = gemini(t, text);
  const res = await invoke('POST /api/parse-resume', { file: { buffer } });
  assert.equal(res.statusCode, 200);
  assert.match(res.data.text, /useful reporting tools/);
  assert.match(res.data.note, /Gemini transcribed/);
  const [, options] = transport.mock.calls[0].arguments;
  assert.equal(JSON.parse(options.body).contents[0].parts[1].inlineData.mimeType, 'application/pdf');
});

test('worker rejects sparse transcriptions', async (t) => {
  const doc = await PDFDocument.create();
  doc.addPage();
  const buffer = Buffer.from(await doc.save({ useObjectStreams: false }));
  gemini(t, 'Too short');
  const res = await invoke('POST /api/parse-resume', { file: { buffer } });
  assert.equal(res.statusCode, 422);
  assert.match(res.data.error, /enough readable text/);
});

test('worker reports unavailable Gemini configuration for scanned PDFs', async (t) => {
  delete process.env.GEMINI_API_KEY;
  t.mock.method(console, 'error', () => {});
  const doc = await PDFDocument.create();
  doc.addPage();
  const buffer = Buffer.from(await doc.save({ useObjectStreams: false }));
  const res = await invoke('POST /api/parse-resume', { file: { buffer } });
  assert.equal(res.statusCode, 503);
  assert.match(res.data.error, /not configured/);
});

test('worker retries only an unavailable model and reports the model that worked', async (t) => {
  process.env.GEMINI_API_KEY = 'worker-test-key';
  process.env.GEMINI_MODEL = 'worker-test-model';
  t.mock.method(console, 'warn', () => {});
  const urls = [];
  t.mock.method(globalThis, 'fetch', async (url) => {
    urls.push(String(url));
    if (urls.length === 1) {
      return Response.json({ error: { code: 404, status: 'NOT_FOUND', message: 'Test model unavailable' } }, { status: 404 });
    }
    return Response.json({ candidates: [{ content: { parts: [{ text: '[0]' }] } }] });
  });
  const res = await invoke('POST /api/research/rank', {
    body: { company: 'Acme', role: 'Developer', excerpts: ['First'] },
  });
  assert.deepEqual(res.data, { indices: [0] });
  assert.equal(urls.length, 2);
  assert.notEqual(urls[0], urls[1]);
  const health = await invoke('GET /api/health');
  assert.ok(urls[1].includes(`models/${health.data.model}:generateContent`));
});

test('resume generation reports quota without retrying other models', async (t) => {
  process.env.GEMINI_API_KEY = 'worker-test-key';
  t.mock.method(console, 'error', () => {});
  const transport = t.mock.method(globalThis, 'fetch', async () => Response.json({
    error: { code: 429, status: 'RESOURCE_EXHAUSTED', message: 'Test quota exceeded' },
  }, { status: 429 }));
  const res = await invoke('POST /api/generate', { body: { master, posting } });
  assert.equal(res.statusCode, 502);
  assert.match(res.data.error, /quota/);
  assert.equal(transport.mock.callCount(), 1);
});

test('resume generation reports when no configured or fallback model is accessible', async (t) => {
  process.env.GEMINI_API_KEY = 'worker-test-key';
  t.mock.method(console, 'warn', () => {});
  t.mock.method(console, 'error', () => {});
  const transport = t.mock.method(globalThis, 'fetch', async () => Response.json({
    error: { code: 404, status: 'NOT_FOUND', message: 'Test model unavailable' },
  }, { status: 404 }));
  const res = await invoke('POST /api/generate', { body: { master, posting } });
  assert.equal(res.statusCode, 502);
  assert.match(res.data.error, /No accessible Gemini model found/);
  const candidates = transport.mock.calls.map((call) => String(call.arguments[0]));
  assert.ok(candidates.length > 1);
  assert.equal(new Set(candidates).size, candidates.length);
});
