export const MIN_MASTER_WORDS = 75;
export const MAX_MASTER_CHARS = 42000;
export const MAX_JOB_CHARS = 20000;

export function countWords(text = '') {
  return (String(text).match(/\b[\p{L}\p{N}][\p{L}\p{N}'’-]*\b/gu) || []).length;
}

export function validateMaster(text) {
  const raw = String(text || '').trim();
  const lines = raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const heading = re => lines.some(line => re.test(line));
  const firstHeading = lines.findIndex(line => /^(education|experience|work experience|professional experience|projects|skills|summary|profile|contact)\s*:?$/i.test(line));
  const firstLines = lines.slice(0, firstHeading >= 0 ? firstHeading : 3).slice(0, 3);
  const name = firstLines.some(line => /^[\p{L}][\p{L}.'’\-]*(?:\s+[\p{L}][\p{L}.'’\-]*){1,4}$/u.test(line) && line.length <= 80);
  const education = heading(/^(education|academic background|academic history|academic qualifications)\s*:?$/i);
  const experience = heading(/^(professional |work |relevant |employment |internship |volunteer )?experience\s*:?$/i) || heading(/^(employment history|work history)\s*:?$/i);
  const projects = heading(/^(projects|selected projects|academic projects|personal projects|technical projects|relevant projects|project experience)\s*:?$/i);
  const missing = [];
  if (!name) missing.push('applicant name (on its own line near the top)');
  if (!education) missing.push('EDUCATION section');
  if (!experience) missing.push('EXPERIENCE section');
  if (!projects) missing.push('PROJECTS section');
  return { valid: missing.length === 0, missing, wordCount: countWords(raw), tooLong: raw.length > MAX_MASTER_CHARS };
}

export function normalized(text = '') {
  return String(text).normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}
export function isSourcePresent(master, source) {
  const s = normalized(source);
  return s.length >= 8 && normalized(master).includes(s);
}

const headingRe = /^(?:education|academic background|academic history|academic qualifications|professional experience|work experience|relevant experience|employment experience|internship experience|volunteer experience|experience|employment history|work history|projects|selected projects|academic projects|personal projects|technical projects|relevant projects|project experience|skills|technical skills|summary|profile|certifications|awards|activities|references|links from original pdf|links from master resume|contact)\s*:?$/i;
const sectionRe = {
  education: /^(?:education|academic background|academic history|academic qualifications)\s*:?$/i,
  experience: /^(?:(?:professional |work |relevant |employment |internship |volunteer )?experience|employment history|work history)\s*:?$/i,
  projects: /^(?:projects|selected projects|academic projects|personal projects|technical projects|relevant projects|project experience)\s*:?$/i,
  skills: /^(?:skills|technical skills)\s*:?$/i
};
const bulletRe = /^(?:[-*•▪●]|\d+[.)])\s*/;
const value = (v, max = 500) => typeof v === 'string' ? v.trim().slice(0, max) : '';
const tokens = v => new Set(normalized(v).split(' ').filter(w => w.length > 2));
function similarity(a, b) {
  const aTokens = tokens(a), bTokens = tokens(b);
  if (!aTokens.size || !bTokens.size) return 0;
  let shared = 0;
  for (const word of aTokens) if (bTokens.has(word)) shared++;
  return 2 * shared / (aTokens.size + bTokens.size);
}
function sectionsFromMaster(master) {
  const result = { education: [], experience: [], projects: [], skills: [] };
  let current = null;
  for (const line of master.split(/\r?\n/).map(line => line.trim()).filter(Boolean)) {
    const matching = Object.keys(sectionRe).find(key => sectionRe[key].test(line));
    if (matching) { current = matching; continue; }
    if (headingRe.test(line)) { current = null; continue; }
    if (current) result[current].push(line);
  }
  return result;
}
function sourceLine(valueFromModel, options, { bullet = false, exclude = [] } = {}) {
  const candidates = options.filter(line => !exclude.includes(line) && (bullet ? bulletRe.test(line) : !bulletRe.test(line)));
  if (!candidates.length) return '';
  const sought = value(valueFromModel, 900);
  if (!sought) return '';
  const cleaned = line => bullet ? line.replace(bulletRe, '').trim() : line;
  const exact = candidates.find(line => normalized(cleaned(line)) === normalized(sought));
  if (exact) return cleaned(exact);
  // A title such as "Software Engineer Intern" may be a shortened phrase from
  // "Embedded Software Engineer Intern". Recover the *original* line.
  const partial = candidates.find(line => normalized(cleaned(line)).includes(normalized(sought)) && normalized(sought).length >= 8);
  if (partial) return cleaned(partial);
  const ranked = candidates.map(line => ({ line, score: similarity(sought, cleaned(line)) }))
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.score >= (bullet ? .47 : .38) ? cleaned(ranked[0].line) : '';
}
function safeBulletText(suggestion, original) {
  const proposed = value(suggestion, 650);
  if (!proposed) return original;
  const originalNumbers = normalized(original).match(/\b\d+\b/g) || [];
  const proposedNumbers = normalized(proposed).match(/\b\d+\b/g) || [];
  // New dates, sizes, metrics or percentages are not allowed.
  if (proposedNumbers.some(n => !originalNumbers.includes(n))) return original;
  if (similarity(proposed, original) < .56) return original;
  const sensitive = /\b(?:led|managed|supervised|architected|owned|founded|increased|decreased|saved|reduced|achieved)\b/gi;
  const modifiers = proposed.match(sensitive) || [];
  if (modifiers.some(v => !normalized(original).includes(normalized(v)))) return original;
  return proposed;
}

/** Validate factual anchors without rejecting legitimate Gemini paraphrases of titles.
 * Unverifiable output is replaced by original source lines, not invented content. */
export function cleanTailored(data, master) {
  if (!data || typeof data !== 'object') throw new Error('Gemini did not return a valid resume object.');
  const source = sectionsFromMaster(master);
  const name = value(data.name, 160);
  if (!name || !normalized(master).includes(normalized(name))) {
    throw new Error('Gemini returned an unverified applicant name. Please retry.');
  }
  function process(entries, field) {
    const originals = source[field];
    return (Array.isArray(entries) ? entries.slice(0, 8) : []).map((item, index) => {
      // Gemini is allowed to REWORD a label, but the PDF only uses words taken
      // from the source. The first original line is a safe last resort.
      const title = sourceLine(item?.title, originals) || originals.find(x => !bulletRe.test(x)) || '';
      if (!title) return null;
      const titlePosition = originals.indexOf(title);
      const adjacent = titlePosition >= 0 ? originals[titlePosition + 1] : '';
      const meta = sourceLine(item?.meta, originals, { exclude: [title] }) ||
        (item?.meta && adjacent && !bulletRe.test(adjacent) && !headingRe.test(adjacent) ? adjacent : '');
      const bullets = [];
      for (const proposed of (Array.isArray(item?.bullets) ? item.bullets.slice(0, 10) : [])) {
        const evidence = value(proposed?.source, 1000);
        let original = sourceLine(evidence, originals, { bullet: true });
        // Some PDFs place a bullet across multiple lines, so support source spans.
        if (!original && isSourcePresent(master, evidence)) original = evidence;
        if (!original || bullets.some(b => normalized(b.source) === normalized(original))) continue;
        bullets.push({ source: original, text: safeBulletText(proposed?.text, original) });
      }
      if (bullets.length === 0) {
        // A missing AI citation shouldn't discard real accomplishments.
        // Take nearby bullets from the original section as a conservative fallback.
        const titlePos = originals.indexOf(title);
        const start = titlePos >= 0 ? titlePos + 1 : 0;
        const nearby = originals.slice(start).filter(x => bulletRe.test(x)).slice(0, field === 'education' ? 1 : 3);
        for (const raw of nearby) {
          const original = raw.replace(bulletRe, '').trim();
          if (original) bullets.push({ source: original, text: original });
        }
      }
      return { title, meta, bullets };
    }).filter(Boolean);
  }
  const education = process(data.education, 'education');
  const experience = process(data.experience, 'experience');
  const projects = process(data.projects, 'projects');
  if (!education.length || !experience.length || !projects.length) {
    throw new Error('Could not find supporting education, experience, and project entries in the master resume. Review its section formatting and retry.');
  }
  const skills = (Array.isArray(data.skills) ? data.skills.slice(0, 6) : []).map(item => {
    const original = sourceLine(item?.source, source.skills) || (isSourcePresent(master, item?.source) ? value(item.source) : '');
    return original ? { source: original, text: original } : null;
  }).filter(Boolean);
  const directContact = master.split(/\r?\n/).slice(1, 6).map(x=>x.trim())
    .find(x => /@|\b(?:https?:\/\/|linkedin\.com|github\.com|\+?\d[\d() .-]{7})/i.test(x)) || '';
  // Never let Gemini invent or modify identifying contact details.
  const contact = directContact || (isSourcePresent(master, data.contact) ? value(data.contact, 360) : '');
  let summary = null;
  const summarySource = value(data.summary?.source, 650);
  if (summarySource && isSourcePresent(master, summarySource)) {
    summary = { source: summarySource, text: safeBulletText(data.summary?.text, summarySource) };
  }
  return { name, contact, education, experience, projects, skills, summary };
}
