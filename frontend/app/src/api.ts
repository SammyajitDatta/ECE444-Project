import { apiFetch } from "./session";
import type { Application, ApplicationFilters, Paginated, ApplicationStatus } from "./types";

export async function fetchApplications(
  filters: ApplicationFilters,
  page: number,
  perPage: number,
  signal?: AbortSignal,
): Promise<Paginated<Application>> {
  const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
  if (filters.statuses.length > 0) params.set("status", filters.statuses.join(","));
  if (filters.dateFrom) params.set("date_from", filters.dateFrom);
  if (filters.dateTo) params.set("date_to", filters.dateTo);

  const res = await apiFetch(`/api/applications?${params.toString()}`, { signal });
  if (!res.ok) {
    const body: { error?: string } = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return (await res.json()) as Paginated<Application>;
}

export async function updateApplicationStatus(id: number, status: ApplicationStatus): Promise<Application> {
  const res = await apiFetch(`/api/applications/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const body: { error?: string } = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return (await res.json()) as Application;
}

export async function createApplication(
  formData: FormData
): Promise<Application> {
  const response = await apiFetch("/api/applications", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(
      data?.error ?? "Couldn't create application"
    );
  }

  return response.json();
}

export type FileKind = "resume" | "cover_letter" | "transcript";
 
export async function fetchApplication(id: number, signal?: AbortSignal): Promise<Application> {
  const res = await apiFetch(`/api/applications/${id}`, { signal });
  if (!res.ok) {
    const body: { error?: string } = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return (await res.json()) as Application;
}
 
export function fileUrl(applicationId: number, kind: FileKind): string {
  return `/api/applications/${applicationId}/files/${kind}`;
}

export type OutreachDraft = { subject: string; body: string };

export async function generateOutreachDraft(
  applicationId: number,
  details: { recruiter_name: string; background: string; description?: string },
): Promise<OutreachDraft> {
  const response = await apiFetch(`/api/applications/${applicationId}/outreach`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(details),
  });
  if (!response.ok) {
    const data: { error?: string } = await response.json().catch(() => ({}));
    throw new Error(data.error ?? "Could not generate the outreach draft.");
  }
  return response.json();
}
