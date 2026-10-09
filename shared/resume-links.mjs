/** Shared, dependency-free link extraction for both the import API and React.
 * Real PDF link annotations are supplied separately by the server.
 * The editor keeps factual resume text intact, moving URLs into a clearly
 * labelled appendix, so project links don't pollute the contact header.
 */
const URL_RE = /https?:\/\/[^\s<>"'\]\[|]+|\b(?:www\.)?(?:linkedin\.com|github\.com|gitlab\.com|bitbucket\.org)\/[^\s<>"'\]\[|]+/gi;
const LINK_HEADING = /^\s*LINKS FROM (?:MASTER RESUME|ORIGINAL PDF)\s*:?\s*$/i;

export function safeUrl(value) {
  try {
    const clean = String(value || '').trim().replace(/[),.;:]+$/, '');
    const url = new URL(/^https?:\/\//i.test(clean) ? clean : `https://${clean}`);
    if (!['https:', 'http:'].includes(url.protocol) || !url.hostname.includes('.') || url.username || url.password) return '';
    return url.toString();
  } catch { return ''; }
}

export function linkInfo(raw) {
  const url = safeUrl(raw);
  if (!url) return null;
  const parsed = new URL(url);
  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  const parts = parsed.pathname.split('/').filter(Boolean);
  const repoHost = ['github.com', 'gitlab.com', 'bitbucket.org'].includes(host);
  if (repoHost && parts.length >= 2) {
    let slug;
    try { slug = decodeURIComponent(parts[1]).replace(/\.git$/i, ''); }
    catch { slug = parts[1].replace(/\.git$/i, ''); }
    const projectName = slug.replace(/[-_]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim();
    return { url, kind: 'project', label: projectName || 'Project', platform: host.split('.')[0], slug };
  }
  if (host.endsWith('linkedin.com') && parts[0]?.toLowerCase() === 'in') return { url, kind: 'profile', label: 'LinkedIn', platform: 'linkedin' };
  if (repoHost && parts.length === 1) return { url, kind: 'profile', label: host === 'github.com' ? 'GitHub' : host === 'gitlab.com' ? 'GitLab' : 'Bitbucket', platform: host.split('.')[0] };
  if (host === 'linkedin.com') return { url, kind: 'profile', label: 'LinkedIn', platform: 'linkedin' };
  return { url, kind: 'website', label: 'Website', platform: host };
}

export function extractResumeLinks(text, annotations = []) {
  const found = new Map();
  for (const value of annotations) {
    const info = linkInfo(value);
    if (info) found.set(info.url, info);
  }
  for (const match of String(text || '').matchAll(URL_RE)) {
    const info = linkInfo(match[0]);
    if (info) found.set(info.url, info);
  }
  return Array.from(found.values()).slice(0, 30);
}

/** Keep the original body copy (aside from URL tokens and now-empty contact
 * labels) verbatim. Links get their own section at the BOTTOM of the editor.
 * Repeated normalization is idempotent, including when users paste URLs. */
export function organizeMasterText(text, annotations = []) {
  const original = String(text || '').replace(/\r\n?/g, '\n');
  const links = extractResumeLinks(original, annotations);
  const inputLines = original.split('\n');
  const headingAt = inputLines.findIndex(l => LINK_HEADING.test(l));
  const bodyLines = (headingAt < 0 ? inputLines : inputLines.slice(0, headingAt));
  const cleaned = bodyLines.map((line, index) => {
    let content = line.replace(URL_RE, '').replace(/\s+([,;])(?=\s|$)/g, '$1');
    // Trim empty LinkedIn/GitHub labels in the *contact* lines only.
    if (index < 8) {
      content = content.replace(/\b(?:Linked\s*In|GitHub|GitLab)\s*:\s*(?=\||$)/gi, '')
        .replace(/\|\s*(?:Linked\s*In|GitHub|GitLab)\s*(?=\||$)/gi, '')
        .replace(/^\s*(?:Linked\s*In|GitHub|GitLab)\s*:?\s*$/i, '')
        .replace(/\s*\|\s*\|/g, ' | ');
    }
    if (line.match(URL_RE) && /^(?:Linked\s*In|GitHub|GitLab|Portfolio|Website)\s*:?$/i.test(content.trim())) content = '';
    return content.replace(/\s+$/,'').replace(/^\s+$/,'');
  });
  const body = cleaned.join('\n').replace(/\n{4,}/g, '\n\n\n').trim();
  const appendix = links.length ? [
    'LINKS FROM MASTER RESUME',
    ...links.map(l => `${l.kind === 'project' ? `Project: ${l.label}` : l.label}: ${l.url}`)
  ].join('\n') : '';
  return { text: [body, appendix].filter(Boolean).join('\n\n'), links };
}

/** Match repository URLs to project names even if the repo's slug and the
 * resume's display title differ by plurals or separators. Never blindly
 * attach an unrelated repository to the next project. */
export function matchingProjectLink(title, links) {
  const tokens = s => new Set(String(s || '').toLowerCase().replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/).filter(w => w.length > 2).map(w => w.replace(/s$/, '')));
  const left = tokens(title);
  if (!left.size) return null;
  let winner=null, score=0;
  for (const link of links || []) {
    if (link.kind !== 'project') continue;
    const right = tokens(link.label || link.slug);
    let common=0;
    for (const word of left) if (right.has(word)) common++;
    const value = common / Math.max(1, Math.max(left.size, right.size));
    if (value > score) { score=value; winner=link; }
  }
  return score >= .6 ? winner : null;
}

export function cleanContactLine(contact) {
  return String(contact || '')
    .replace(URL_RE, '')
    .replace(/(?:^|\|)\s*(?:Linked\s*In|GitHub|GitLab|Portfolio|Website)\s*:?\s*(?=\||$)/gi, '')
    .split('|').map(x => x.trim().replace(/[,;:]+$/, '')).filter(Boolean).join('  |  ')
    .replace(/\s{3,}/g, '  ').trim();
}
