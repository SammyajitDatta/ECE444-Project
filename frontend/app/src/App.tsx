import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { fetchApplications } from "./api";
import { ApplicationCard } from "./components/ApplicationCard";
import { Filters } from "./components/Filters";
import { Pagination } from "./components/Pagination";
import { colors, page as pageStyles } from "./theme";
import type { Application, ApplicationFilters } from "./types";

const PER_PAGE = 12;
const NO_FILTERS: ApplicationFilters = { statuses: [], dateFrom: "", dateTo: "" };

const grid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 16 };
const message: CSSProperties = { padding: "48px 0", textAlign: "center", color: colors.muted, fontSize: 16 };

export default function App() {
  const [filters, setFilters] = useState<ApplicationFilters>(NO_FILTERS);
  const [pageNum, setPageNum] = useState(1);
  const [items, setItems] = useState<Application[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetchApplications(filters, pageNum, PER_PAGE, controller.signal)
      .then((data) => {
        setItems(data.items);
        setTotal(data.total);
        setTotalPages(data.total_pages);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Something went wrong");
        setLoading(false);
      });
    return () => controller.abort();
  }, [filters, pageNum]);

  const changeFilters = (next: ApplicationFilters) => {
    setFilters(next);
    setPageNum(1);
  };

  return (
    <div style={pageStyles.root}>
      <div style={pageStyles.container}>
        <header style={pageStyles.header}>
          <h1 style={pageStyles.title}>Applications</h1>
          {!error && <span style={pageStyles.count}>{total} {total === 1 ? "application" : "applications"}</span>}
        </header>

        <Filters filters={filters} onChange={changeFilters} />

        {error ? (
          <p role="alert" style={{ ...message, color: "#B3453D" }}>
            Couldn't load applications: {error}. Check that the Flask server is running on port 5000.
          </p>
        ) : loading && items.length === 0 ? (
          <p style={message}>Loading applications…</p>
        ) : items.length === 0 ? (
          <p style={message}>No applications match these filters. Try clearing a status or widening the dates.</p>
        ) : (
          <div style={{ ...grid, opacity: loading ? 0.6 : 1 }}>
            {items.map((a) => <ApplicationCard key={a.id} application={a} />)}
          </div>
        )}

        <Pagination page={pageNum} totalPages={totalPages} onChange={setPageNum} />
      </div>
    </div>
  );
}
