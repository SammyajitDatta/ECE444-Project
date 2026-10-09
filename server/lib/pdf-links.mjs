import { PDFArray, PDFDict, PDFDocument, PDFHexString, PDFName, PDFString } from 'pdf-lib';
import { safeUrl, linkInfo, extractResumeLinks, organizeMasterText } from '../../shared/resume-links.mjs';

export const safeWebUrl = safeUrl;
export function linkLabel(value) { return linkInfo(value)?.label || 'Website'; }

// PDF annotations contain the actual link target, even when the visible text is only "LinkedIn".
export async function extractPdfLinks(buffer) {
  try {
    const pdf = await PDFDocument.load(buffer);
    const found = new Set();
    for (const page of pdf.getPages()) {
      const rawAnnots = page.node.Annots();
      if (!rawAnnots) continue;
      const annots = pdf.context.lookup(rawAnnots, PDFArray);
      if (!annots) continue;
      for (let i = 0; i < annots.size(); i++) {
        const annot = pdf.context.lookup(annots.get(i), PDFDict);
        if (!annot) continue;
        const actionRef = annot.get(PDFName.of('A'));
        if (!actionRef) continue;
        const action = pdf.context.lookup(actionRef, PDFDict);
        const uri = action?.get(PDFName.of('URI'));
        const target = uri instanceof PDFString || uri instanceof PDFHexString ? uri.decodeText() : '';
        const value = safeWebUrl(target);
        if (value && found.size < 24) found.add(value);
      }
    }
    return [...found];
  } catch { return []; }
}

export function visibleLinks(text, extractedLinks = []) {
  return extractResumeLinks(text, extractedLinks);
}

export function preservePdfLinks(rawText, urls) {
  return organizeMasterText(rawText, urls).text;
}
