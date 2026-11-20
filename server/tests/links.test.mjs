import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, PDFName, PDFString } from 'pdf-lib';
import { extractPdfLinks, preservePdfLinks, visibleLinks, safeWebUrl } from '../lib/pdf-links.mjs';

test('preserves annotation URLs even if visible PDF label is only LinkedIn', async () => {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612,792]);
  const annotation = doc.context.obj({
    Type:'Annot', Subtype:'Link', Rect:[20,700,130,720], Border:[0,0,0],
    A:{Type:'Action',S:'URI',URI:PDFString.of('https://www.linkedin.com/in/alex-morgan')}
  });
  page.node.set(PDFName.of('Annots'), doc.context.obj([doc.context.register(annotation)]));
  const links = await extractPdfLinks(Buffer.from(await doc.save()));
  assert.deepEqual(links,['https://www.linkedin.com/in/alex-morgan']);
  const text=preservePdfLinks('Alex Morgan\nLinkedIn\nEDUCATION\nEXPERIENCE\nPROJECTS',links);
  assert.ok(text.includes('LINKS FROM MASTER RESUME'));
  assert.ok(!text.split('LINKS FROM MASTER RESUME')[0].includes('https://'));
  assert.ok(text.includes('LinkedIn: https://www.linkedin.com/in/alex-morgan'));
  assert.equal(visibleLinks(text)[0].label,'LinkedIn');
});

test('links are restricted to normal http(s) URL targets',()=>{
  assert.equal(safeWebUrl('javascript:alert(1)'),'');
  assert.equal(safeWebUrl('file:///tmp/secret'),'');
  assert.equal(safeWebUrl('https://github.com/test'),'https://github.com/test');
});
