import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchApplication, fileUrl } from "../api";
import type { FileKind } from "../api";
import { colors, font, page as pageStyles, statusColors, statusLabels } from "../theme";
import type { Application, JobType } from "../types";

const JOB_TYPE_LABELS: Record<JobType, string> = { full_time: "Full time", part_time: "Part time" };

const shadow = "0 10px 24px rgba(16, 32, 44, 0.20), 0 2px 4px rgba(16, 32, 44, 0.12)";

const card: CSSProperties = {
  background: colors.card, borderRadius: 12, padding: "22px 26px", marginBottom: 20, boxShadow: shadow,
};
const sectionTitle: CSSProperties = { margin: "0 0 14px", fontSize: 18, fontWeight: 700 };
const chip: CSSProperties = {
  padding: "5px 12px", borderRadius: 999, background: "#E8EDF1", fontSize: 14, color: colors.ink,
};
const downloadBtn: CSSProperties = {
  font: `500 14px ${font}`, color: "#fff", background: colors.ink, textDecoration: "none",
  padding: "8px 16px", borderRadius: 8,
};

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={card}>
      <h2 style={sectionTitle}>{title}</h2>
      {children}
    </section>
  );
}

function Chips({ items }: { items: string[] }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {items.map((item) => <span key={item} style={chip}>{item}</span>)}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 13, color: colors.muted }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 500 }}>{value}</div>
    </div>
  );
}

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const applicationId = Number(id);
    if (!Number.isInteger(applicationId)) {
      setError("That isn't a valid application link.");
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetchApplication(applicationId, controller.signal)
      .then((data) => {
        setApplication(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Something went wrong");
        setLoading(false);
      });
    return () => controller.abort();
  }, [id]);

  const back = (
    <Link to="/" style={{ display: "inline-block", marginBottom: 24, color: colors.ink, fontWeight: 500, textDecoration: "none" }}>
      ← Back to applications
    </Link>
  );

  let body: ReactNode;
  if (loading) {
    body = <p style={{ color: colors.muted }}>Loading application…</p>;
  } else if (error || !application) {
    body = <p role="alert" style={{ color: "#B3453D" }}>Couldn't load this application: {error}</p>;
  } else {
    const { job, status } = application;
    const color = statusColors[status];
    const salary = job.salary_low ? (job.salary_high ? `${job.salary_low} – ${job.salary_high}` : job.salary_low) : null;

    const documents: { kind: FileKind; label: string; path: string | null }[] = [
      { kind: "resume", label: "Resume", path: application.resume_path },
      { kind: "cover_letter", label: "Cover letter", path: application.cover_letter_path },
      { kind: "transcript", label: "Transcript", path: application.transcript_path },
    ];

    body = (
      <>
        <div style={{ ...card, borderLeft: `6px solid ${color}` }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: colors.muted }}>{job.company_name}</div>
          <h1 style={{ ...pageStyles.title, fontSize: 30, margin: "2px 0 16px" }}>{job.title}</h1>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 32, alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 13, color: colors.muted, marginBottom: 4 }}>Status</div>
              <span style={{ fontSize: 14, fontWeight: 500, color, background: `${color}1F`, padding: "4px 12px", borderRadius: 999 }}>
                {statusLabels[status]}
              </span>
            </div>
            <Fact label="Date applied" value={formatDate(application.date_applied)} />
            {job.job_type && <Fact label="Job type" value={JOB_TYPE_LABELS[job.job_type]} />}
            {salary && <Fact label="Salary" value={salary} />}
          </div>
        </div>

        {job.required_skills.length > 0 && <Section title="Required skills"><Chips items={job.required_skills} /></Section>}
        {job.preferred_skills.length > 0 && <Section title="Preferred skills"><Chips items={job.preferred_skills} /></Section>}
        {job.perks.length > 0 && <Section title="Perks"><Chips items={job.perks} /></Section>}
        {job.about && (
          <Section title="About the job">
            <p style={{ margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{job.about}</p>
          </Section>
        )}

        <Section title="Documents">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {documents.map(({ kind, label, path }) => (
              <div key={kind} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 16 }}>{label}</span>
                {path ? (
                  <a href={fileUrl(application.id, kind)} download style={downloadBtn} aria-label={`Download ${label.toLowerCase()}`}>
                    Download
                  </a>
                ) : (
                  <span style={{ fontSize: 14, color: colors.muted }}>Not provided</span>
                )}
              </div>
            ))}
          </div>
        </Section>
      </>
    );
  }

  return (
    <div style={pageStyles.root}>
      <div style={{ ...pageStyles.container, maxWidth: 760 }}>
        {back}
        {body}
      </div>
    </div>
  );
}