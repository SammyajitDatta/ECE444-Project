import { useState } from 'react';
import { apiFetch } from '../session';
export type ImportedJob = { title: string; company_name: string; about: string; job_type: string; salary_low: string; salary_high: string; required_skills: string[]; preferred_skills: string[]; perks: string[] };
export default function JobImport({ onImport }: { onImport: (job: ImportedJob) => void }) {
  const [mode, setMode] = useState('url'); const [url, setUrl] = useState(''); const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const [error, setError] = useState('');
  async function parse() {
    setBusy(true); setError(''); setMessage('');
    try {
      const body = new FormData(); if (mode === 'url') body.append('url', url); else if (file) body.append('file', file);
      const r = await apiFetch('/api/jobs/parse', { method: 'POST', body }); const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Import failed.'); onImport(d.job); setMessage(d.note);
    } catch (e) { setError(e instanceof Error ? e.message : 'Import failed.'); } finally { setBusy(false); }
  }
  return <section className="prep-panel"><h2>Start with a job posting</h2><p>Import a draft, then review and edit the fields below. Importing replaces the current job details.</p><label>Import from<select value={mode} onChange={e => {setMode(e.target.value);setError('');}}><option value="url">Public website URL</option><option value="file">Uploaded file</option></select></label>{mode === 'url' ? <label>Job posting URL<input type="url" placeholder="https://company.com/careers/role" value={url} onChange={e => setUrl(e.target.value)}/></label> : <label>PDF, HTML or TXT · maximum 2 MB<input type="file" accept=".pdf,.html,.htm,.txt" onChange={e => setFile(e.target.files?.[0] || null)}/></label>}<button type="button" className="primary" disabled={busy || (mode === 'url' ? !url.trim() : !file)} onClick={parse}>{busy ? 'Reading posting…' : 'Fill job details'}</button>{error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}</section>;
}
