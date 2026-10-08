import type { CSSProperties } from "react";
import type { Application, ApplicationStatus } from "../types";
import { APPLICATION_STATUSES } from "../types";
import { colors, font, statusColors, statusLabels } from "../theme";

interface Props {
  application: Application;
  onStatusChange: (id: number, status: ApplicationStatus) => void;
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const base: CSSProperties = {
  background: colors.card, borderRadius: 12, padding: "20px 22px 20px 24px", margin: 0,
  display: "flex", flexDirection: "column", gap: 4,
  boxShadow: "0 10px 24px rgba(16, 32, 44, 0.20), 0 2px 4px rgba(16, 32, 44, 0.12)",
};

export function ApplicationCard({ application, onStatusChange }: Props) {
  const { job, status } = application;
  const color = statusColors[status];

  const select: CSSProperties = {
    marginTop: 14, font: `500 14px ${font}`, color, background: `${color}1F`,
    border: `1.5px solid ${color}`, borderRadius: 8, padding: "8px 10px", cursor: "pointer",
  };

  return (
    <article style={{ ...base, borderLeft: `6px solid ${color}` }}>
      <div style={{ fontSize: 14, fontWeight: 500, color: colors.muted }}>{job.company_name}</div>
      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, lineHeight: 1.25 }}>{job.title}</h2>
      <time dateTime={application.date_applied} style={{ fontSize: 14, color: colors.muted, marginTop: 6 }}>
        Applied {formatDate(application.date_applied)}
      </time>
      <select
        style={select}
        value={status}
        aria-label={`Status for ${job.title} at ${job.company_name}`}
        onChange={(e) => onStatusChange(application.id, e.target.value as ApplicationStatus)}
      >
        {APPLICATION_STATUSES.map((s) => (
          <option key={s} value={s}>{statusLabels[s]}</option>
        ))}
      </select>
    </article>
  );
}