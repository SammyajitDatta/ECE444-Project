import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import { buildResumePdf } from '../../client/src/lib/pdf.js';

const points = (n) => Array.from({ length: n }, (_, i) => ({
  source: `Built project component ${i + 1} using modern JavaScript tools.`,
  text: `Built project component ${i + 1} using modern JavaScript tools, delivering tested features and clearly documented integrations for other developers.`
}));
const resume = {
  name: 'Avery Smith', contact: 'avery@example.com | Toronto, ON | github.com/avery',
  summary: { text: 'Software engineering student with experience in web and embedded systems, automation, collaboration, and iterative delivery of production software.' },
  education: [{ title: 'University of Toronto', meta: 'BASc, Computer Engineering - 2027', bullets: points(2) }],
  experience: [
    { title: 'Software Engineer Intern', meta: 'Sample Company | 2025 - 2026', bullets: points(6) },
    { title: 'Data Analyst Intern', meta: 'Other Company | 2024 - 2025', bullets: points(4) }
  ],
  projects: [
    { title: 'ApplyPilot', meta: 'React, Node, Gemini', bullets: points(3) },
    { title: 'Personal Portfolio', meta: 'HTML, CSS, JS', bullets: points(3) }
  ],
  skills: [{ text: 'JavaScript, React, Node.js, SQL, Git, Python, Linux, REST APIs and automated testing.' }],
  linkItems: [{ label: 'LinkedIn', url: 'https://www.linkedin.com/in/avery-smith' }]
};
for (const template of ['modern', 'classic', 'editorial']) {
  test(`${template} generates exactly one page`, async () => {
    const { blob, pages } = await buildResumePdf(resume, template);
    assert.equal(pages, 1);
    const loaded = await PDFDocument.load(await blob.arrayBuffer());
    assert.equal(loaded.getPageCount(), 1);
    assert.equal(loaded.getPage(0).getWidth(), 612);
    assert.ok(loaded.getPage(0).node.Annots(), 'PDF should contain clickable link annotations');
  });
}
test('fails on insufficient information instead of outputting half a page', async () => {
  const minimal = { ...resume, summary: null, education: [{ title: 'University of Toronto', meta: '', bullets: [] }], experience: [{ title: 'Intern', meta: '', bullets: [] }], projects: [{ title: 'Project', meta: '', bullets: [] }], skills: [] };
  await assert.rejects(buildResumePdf(minimal, 'modern'), /There is not enough information/);
});
