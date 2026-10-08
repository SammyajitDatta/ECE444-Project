import type { CSSProperties } from "react";
import type { ApplicationStatus } from "./types";

export const colors = {
  page: "#C4CFD8",
  card: "#FFFFFF",
  ink: "#10202C",
  muted: "#44535F",
  line: "#9AA9B5",
  accent: "#10202C",
} as const;

export const font = `"Bricolage Grotesque", "Segoe UI", system-ui, sans-serif`;

// Status colour is the card's main visual signal: it drives the left stripe and the pill.
export const statusColors: Record<ApplicationStatus, string> = {
  applied: "#4F6D8F",
  screening: "#B87A0E",
  interviewing: "#17808A",
  offer: "#2A8A52",
  rejected: "#B3453D",
  withdrawn: "#7C8590",
};

export const statusLabels: Record<ApplicationStatus, string> = {
  applied: "Applied",
  screening: "Screening",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export const page: Record<string, CSSProperties> = {
  root: { fontFamily: font, color: colors.ink, minHeight: "100vh", padding: "40px 24px 64px" },
  container: { maxWidth: 1080, margin: "0 auto" },
  header: { display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap", marginBottom: 24 },
  title: { fontSize: 36, fontWeight: 700, letterSpacing: "-0.02em", margin: 0 },
  count: { fontSize: 16, color: colors.muted },
};
