import { useState } from "react";
import type { FormEvent } from "react";
import { apiFetch } from "../session";

type Evidence = {
  text: string;
  kind: string;
  source_url: string;
  source_name: string;
  retrieved_at: string;
};

type PreparationResult = {
  items: Evidence[];
  notes: string[];
  message: string;
  gemini_ranked?: boolean;
};

function ExcerptList({ items, showKind = false }: { items: Evidence[]; showKind?: boolean }) {
  return items.map((item) => (
    <article key={JSON.stringify([item.kind, item.source_url, item.text])} className="prep-excerpt">
      {showKind && <small>{item.kind}</small>}
      <blockquote>{item.text}</blockquote>
      <a href={item.source_url} target="_blank" rel="noopener noreferrer">
        View source · {item.source_name}
      </a>
      <small>
        Retrieved <time dateTime={item.retrieved_at}>{new Date(item.retrieved_at).toLocaleDateString()}</time>
      </small>
    </article>
  ));
}

const researchSections = [
  { kind: "Company source excerpt", title: "Company", empty: "No company excerpts found." },
  { kind: "Role source excerpt", title: "Role", empty: "No role excerpts found." },
];

export default function PreparationPanel({ applicationId, kind = "research", enabled = true }: {
  applicationId: number;
  kind?: "research" | "interview";
  enabled?: boolean;
}) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<PreparationResult | null>(null);
  const interview = kind === "interview";

  async function retrieve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const response = await apiFetch(`/api/applications/${applicationId}/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_url: url.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Research unavailable.");
      setResult(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Research unavailable.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="prep-panel" aria-label={interview ? "Reported interview questions" : "Public source lookup"}>
      <h2>{interview ? "Reported interview questions" : "Find public sources"}</h2>
      <p>{interview
        ? "These questions come from past candidate reports. Your interview questions may differ."
        : "Find excerpts you can verify in the original pages. If configured, Gemini receives the excerpts and the saved company and role to rank them."}
      </p>
      {enabled ? (
        <form onSubmit={retrieve} aria-busy={busy}>
          <label>
            Public source URL (optional)
            <input type="url" value={url} placeholder="https://…" onChange={(event) => setUrl(event.target.value)}
              maxLength={2000} disabled={busy} />
          </label>
          <small>Paste a public HTTPS URL or leave it blank to search with Brave.</small>
          <button className="primary" disabled={busy} type="submit">
            {busy ? "Checking sources…" : interview ? "Find reported questions" : "Research company & role"}
          </button>
        </form>
      ) : <p>Set this application’s status to Interviewing to retrieve reported questions.</p>}
      {busy && <p role="status">Looking for relevant excerpts…</p>}
      {error && <p role="alert">{error}</p>}
      {result && (
        <div aria-live="polite" className="prep-results">
          <p>{result.message}</p>
          {result.notes.map((note, index) => <p className="muted" key={index}>{note}</p>)}
          {result.gemini_ranked && <p className="muted">Excerpts ranked by Gemini</p>}
          {interview ? <ExcerptList items={result.items} showKind /> : (
            result.items.length > 0 && researchSections.map(({ kind, title, empty }) => {
              const items = result.items.filter((item) => item.kind === kind);
              return (
                <section key={kind} className="prep-result-group">
                  <h3>{title}</h3>
                  {items.length ? <ExcerptList items={items} /> : <p className="muted">{empty}</p>}
                </section>
              );
            })
          )}
        </div>
      )}
    </section>
  );
}
