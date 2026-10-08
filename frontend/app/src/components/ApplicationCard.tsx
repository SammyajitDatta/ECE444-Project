import type { CSSProperties } from "react";
import type { Application } from "../types";
import { colors, statusColors, statusLabels } from "../theme";

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const base: CSSProperties = {
  background: colors.card, borderRadius: 10, padding: "18px 20px 16px 22px",
  display: "flex", flexDirection: "column", gap: 4, margin: 0,
};

export function ApplicationCard({ application }: { application: Application }) {
  const { job, status } = application;
  const color = statusColors[status];

  return (
    <article style={{ ...base, borderLeft: `6px solid ${color}` }}>
      <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, lineHeight: 1.25 }}>{job.title}</h2>
      <div style={{ fontSize: 15, color: colors.muted }}>{job.company_name}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
        <time dateTime={application.date_applied} style={{ fontSize: 14, color: colors.muted }}>
          Applied {formatDate(application.date_applied)}
        </time>
        <span style={{
          fontSize: 13, fontWeight: 500, color, background: `${color}1F`,
          padding: "4px 10px", borderRadius: 999,
        }}>
          {statusLabels[status]}
        </span>
      </div>
    </article>
  );
}
