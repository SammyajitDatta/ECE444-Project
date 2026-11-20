import { useState } from "react";
import type { SubmitEvent } from "react";
import { Link } from "react-router-dom";
import { generateOutreachDraft } from "../api";
import type { OutreachDraft } from "../api";
import { page as pageStyles } from "../theme";
import type { Application } from "../types";

const DESCRIPTION_LIMIT = 20_000;
const singleEmail = /^[^\s@,;]+@[^\s@,;]+$/;

function emailLink(address: string, draft: OutreachDraft) {
  const recipient = encodeURIComponent(address).replace("%40", "@");
  const body = draft.body.replace(/\r?\n/g, "\r\n");
  return `mailto:${recipient}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(body)}`;
}

export default function RecruiterOutreachPage({ application }: { application: Application }) {
  const { id, job } = application;
  const savedDescription = (job.about ?? "").trim().slice(0, DESCRIPTION_LIMIT);
  const [description, setDescription] = useState(savedDescription);
  const [recruiterName, setRecruiterName] = useState("");
  const [recruiterEmail, setRecruiterEmail] = useState("");
  const [background, setBackground] = useState("");
  const [draft, setDraft] = useState<OutreachDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const address = recruiterEmail.trim();

  async function generate(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!description.trim()) {
      setError("Add a job description to generate a tailored email.");
      return;
    }
    setBusy(true);
    setError("");
    setCopyStatus("");
    try {
      const result = await generateOutreachDraft(id, {
        recruiter_name: recruiterName.trim(),
        background: background.trim(),
        description: description === savedDescription ? undefined : description,
      });
      setDraft(result);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not generate the outreach draft.");
    } finally {
      setBusy(false);
    }
  }

  async function copyDraft() {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.body}`);
      setCopyStatus("Draft copied.");
    } catch {
      setCopyStatus("Clipboard access is unavailable. You can select and copy the draft fields.");
    }
  }

  return (
    <main style={pageStyles.root}>
      <div style={{ ...pageStyles.container, maxWidth: 760 }}>
        <Link to={`/applications/${id}`}>← Back to application</Link>
        <h1 style={{ ...pageStyles.title, margin: "20px 0 8px" }}>Recruiter outreach</h1>
        <p style={{ margin: 0 }}>{job.title} at {job.company_name}</p>

        <section className="prep-panel" aria-labelledby="outreach-details">
          <h2 id="outreach-details">Draft an email</h2>
          <form onSubmit={generate} aria-busy={busy}>
            <div className="outreach-fields">
              <label>
                Recruiter name (optional)
                <input autoComplete="off" value={recruiterName} onChange={(event) => setRecruiterName(event.target.value)}
                  maxLength={100} disabled={busy} />
              </label>
              <label>
                Recruiter email (optional)
                <input type="email" autoComplete="off" value={recruiterEmail} onChange={(event) => setRecruiterEmail(event.target.value)}
                  maxLength={254} disabled={busy} />
                <small>Used only to address the email in your mail app.</small>
              </label>
            </div>
            <label>
              Job description
              <textarea rows={6} value={description} onChange={(event) => setDescription(event.target.value)}
                maxLength={DESCRIPTION_LIMIT} required disabled={busy} placeholder="Paste the job posting or a description of the role." />
            </label>
            <label>
              Your relevant background (optional)
              <textarea rows={3} value={background} onChange={(event) => setBackground(event.target.value)}
                maxLength={800} disabled={busy} placeholder="For example, a project or skill that relates to the role." />
            </label>
            <small>Gemini uses the job details and any background you provide to draft the email.</small>
            <button type="submit" className="primary" disabled={busy}>
              {busy ? "Generating…" : draft ? "Regenerate draft" : "Generate draft"}
            </button>
          </form>
          {busy && <p role="status">Drafting your outreach email…</p>}
          {error && <p role="alert">{error}</p>}
        </section>

        {draft && (
          <section className="prep-panel" aria-labelledby="outreach-draft">
            <h2 id="outreach-draft">Email draft</h2>
            <p>Review and edit the draft before sending.</p>
            <label>
              Subject
              <input value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} />
            </label>
            <label>
              Message
              <textarea rows={10} value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} />
            </label>
            <div className="outreach-actions">
              <button type="button" className="secondary" onClick={copyDraft}>Copy draft</button>
              {(!address || singleEmail.test(address)) && (
                <a className="primary" href={emailLink(address, draft)}>Open in email app</a>
              )}
            </div>
            <small role="status">{copyStatus}</small>
          </section>
        )}
      </div>
    </main>
  );
}
