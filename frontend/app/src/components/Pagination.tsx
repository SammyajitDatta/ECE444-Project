import type { CSSProperties } from "react";
import { colors, font } from "../theme";

interface Props {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

const btn = (disabled: boolean): CSSProperties => ({
  font: `500 14px ${font}`, padding: "8px 16px", borderRadius: 6, cursor: disabled ? "default" : "pointer",
  border: `1px solid ${colors.line}`, background: colors.card, color: disabled ? colors.line : colors.ink,
});

export function Pagination({ page, totalPages, onChange }: Props) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Pagination" style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16, marginTop: 32 }}>
      <button type="button" style={btn(page <= 1)} disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</button>
      <span style={{ fontSize: 14, color: colors.muted }}>Page {page} of {totalPages}</span>
      <button type="button" style={btn(page >= totalPages)} disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Next</button>
    </nav>
  );
}
