export const APPLICATION_STATUSES = [
  "applied",
  "screening",
  "interviewing",
  "offer",
  "rejected",
  "withdrawn",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export type JobType = "full_time" | "part_time";

export interface Job {
  id: number;
  title: string;
  company_name: string;
  job_type: JobType | null;
  salary_low: string | null;
  salary_high: string | null; 
  required_skills: string[];
  preferred_skills: string[];
  perks: string[];
  about: string | null;
}

export interface Application {
  id: number;
  date_applied: string; // YYYY-MM-DD
  status: ApplicationStatus;
  resume_path: string | null;
  cover_letter_path: string | null;
  transcript_path: string | null;
  job: Job;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface ApplicationFilters {
  statuses: ApplicationStatus[];
  dateFrom: string; // "" = unset
  dateTo: string;
}
