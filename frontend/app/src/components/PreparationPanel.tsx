import { useState } from 'react';
import { apiFetch } from '../session';
type Evidence = { text: string; kind: string; source_url: string; source_name: string; retrieved_at: string };
export default function PreparationPanel({ applicationId, kind = 'research', enabled = true }: { applicationId: number; kind?: 'research' | 'interview'; enabled?: boolean }) {
  const [url, setUrl] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [result, setResult] = useState<{ items: Evidence[]; notes: string[]; message: string } | null>(null);
  async function retrieve() {
    setBusy(true); setError(''); setResult(null);
    try {
      const r = await apiFetch(`/api/applications/${applicationId}/${kind}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ source_url:url }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Research unavailable.'); setResult(d);
    } catch(e) { setError(e instanceof Error ? e.message : 'Research unavailable.'); } finally { setBusy(false); }
  }
  const interview = kind === 'interview';
  return <section className="prep-panel"><span className="eyebrow">{interview ? 'LEARN FROM PAST EXPERIENCES' : 'GET TO KNOW THE COMPANY'}</span><h2>{interview ? 'Reported interview questions' : 'Company & role research'}</h2><p>{interview ? 'Past candidate reports, with links to the original sources. These are not guaranteed questions for your interview.' : 'Read short excerpts from public sources, with links and retrieval dates.'}</p>{!enabled ? <p>Set this application’s status to Interviewing to retrieve reported questions.</p> : <><label>Public source URL (optional)<input type="url" value={url} placeholder="https://…" onChange={e=>setUrl(e.target.value)}/></label><small>Use sources that permit retrieval. Leave blank to use configured web search. Login walls and blocked pages are skipped.</small><button className="primary" disabled={busy} onClick={retrieve}>{busy ? 'Checking sources…' : interview ? 'Find reported questions' : 'Research company'}</button></>}{error && <p role="alert">{error}</p>}{result && <div aria-live="polite"><p>{result.message}</p>{result.notes.map((n,i)=><p className="muted" key={i}>{n}</p>)}{result.items.map((item,i)=><article key={i}><small>{item.kind}</small><blockquote>{item.text}</blockquote><a href={item.source_url} target="_blank" rel="noopener noreferrer">View source · {item.source_name}</a><small>Retrieved {new Date(item.retrieved_at).toLocaleString()}</small></article>)}</div>}</section>;
}
