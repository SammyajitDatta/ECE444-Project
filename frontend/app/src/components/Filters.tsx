import type { CSSProperties } from "react";
import type { ApplicationFilters, ApplicationStatus } from "../types";
import { APPLICATION_STATUSES } from "../types";
import { colors, font, statusColors, statusLabels } from "../theme";

interface Props {
  filters: ApplicationFilters;
  onChange: (next: ApplicationFilters) => void;
}

const bar: CSSProperties = {
  display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-end", justifyContent: "space-between",
  paddingBottom: 20, marginBottom: 24, borderBottom: `1px solid ${colors.line}`,
};
const group: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 8 };
const dateLabel: CSSProperties = { display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: colors.muted };
const dateInput: CSSProperties = {
  font: `400 14px ${font}`, color: colors.ink, padding: "7px 10px",
  border: `1px solid ${colors.line}`, borderRadius: 6, background: colors.card,
};
const clearBtn: CSSProperties = {
  font: `500 14px ${font}`, color: colors.muted, background: "none", border: "none",
  padding: "8px 4px", cursor: "pointer", textDecoration: "underline",
};

function chipStyle(status: ApplicationStatus, active: boolean): CSSProperties {
  const c = statusColors[status];
  return {
    font: `500 14px ${font}`, cursor: "pointer", padding: "7px 14px", borderRadius: 999,
    border: `1.5px solid ${c}`, background: active ? c : "transparent", color: active ? "#fff" : c,
  };
}

export function Filters({ filters, onChange }: Props) {
  const toggle = (status: ApplicationStatus) => {
    const statuses = filters.statuses.includes(status)
      ? filters.statuses.filter((s) => s !== status)
      : [...filters.statuses, status];
    onChange({ ...filters, statuses });
  };
  const hasFilters = filters.statuses.length > 0 || filters.dateFrom !== "" || filters.dateTo !== "";

  return (
    <div style={bar}>
      <div style={group} role="group" aria-label="Filter by status">
        {APPLICATION_STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            aria-pressed={filters.statuses.includes(status)}
            style={chipStyle(status, filters.statuses.includes(status))}
            onClick={() => toggle(status)}
          >
            {statusLabels[status]}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
        <label style={dateLabel}>
          Applied from
          <input type="date" style={dateInput} value={filters.dateFrom} max={filters.dateTo || undefined}
            onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })} />
        </label>
        <label style={dateLabel}>
          Applied to
          <input type="date" style={dateInput} value={filters.dateTo} min={filters.dateFrom || undefined}
            onChange={(e) => onChange({ ...filters, dateTo: e.target.value })} />
        </label>
        {hasFilters && (
          <button type="button" style={clearBtn}
            onClick={() => onChange({ statuses: [], dateFrom: "", dateTo: "" })}>
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
