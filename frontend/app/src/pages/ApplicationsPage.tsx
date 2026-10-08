import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { fetchApplications, updateApplicationStatus } from "../api";
import { ApplicationCard } from "../components/ApplicationCard";
import { Filters } from "../components/Filters";
import { Pagination } from "../components/Pagination";
import { colors, page as pageStyles } from "../theme";

import { Link } from "react-router-dom";

import type {
  Application,
  ApplicationFilters,
  ApplicationStatus,
} from "../types";

const PER_PAGE = 12;
const NO_FILTERS: ApplicationFilters = {
  statuses: [],
  dateFrom: "",
  dateTo: "",
};

const grid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
  gap: 20,
};

const message: CSSProperties = {
  padding: "48px 0",
  textAlign: "center",
  color: colors.muted,
  fontSize: 16,
};

export default function ApplicationsPage() {
  const [filters, setFilters] =
    useState<ApplicationFilters>(NO_FILTERS);
  const [pageNum, setPageNum] = useState(1);
  const [items, setItems] = useState<Application[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError(null);

    fetchApplications(
      filters,
      pageNum,
      PER_PAGE,
      controller.signal
    )
      .then((data) => {
        setItems(data.items);
        setTotal(data.total);
        setTotalPages(data.total_pages);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (
          err instanceof DOMException &&
          err.name === "AbortError"
        ) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong"
        );
        setLoading(false);
      });

    return () => controller.abort();
  }, [filters, pageNum]);

  const changeFilters = (next: ApplicationFilters) => {
    setFilters(next);
    setPageNum(1);
  };

  const handleStatusChange = async (
    id: number,
    status: ApplicationStatus
  ) => {
    const previous = items.find((a) => a.id === id)?.status;

    if (previous === undefined || previous === status) {
      return;
    }

    setActionError(null);

    setItems((cur) =>
      cur.map((a) =>
        a.id === id ? { ...a, status } : a
      )
    );

    try {
      await updateApplicationStatus(id, status);
    } catch (err) {
      setItems((cur) =>
        cur.map((a) =>
          a.id === id
            ? { ...a, status: previous }
            : a
        )
      );

      setActionError(
        err instanceof Error
          ? err.message
          : "Couldn't update status"
      );
    }
  };

  const hasFilters =
    filters.statuses.length > 0 ||
    filters.dateFrom !== "" ||
    filters.dateTo !== "";

  return (
    <div style={pageStyles.root}>
      <div style={pageStyles.container}>
        <header style={pageStyles.header}>
          <h1 style={pageStyles.title}>Applications</h1>
          
          {!error && (
            <span style={pageStyles.count}>
              {total}{" "}
              {total === 1
                ? "application"
                : "applications"}
            </span>
          )}

          <Link
            to="/create"
            style={{
              display: "inline-block",
              padding: "8px 16px",
              backgroundColor: "#0070f3",
              color: "#ffffff",
              borderRadius: "6px",
              textDecoration: "none",
              fontWeight: "600",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Create Application
          </Link>
      </header>

        <Filters
          filters={filters}
          onChange={changeFilters}
        />

        {actionError && (
          <p
            role="alert"
            style={{
              color: "#B3453D",
              margin: "0 0 16px",
            }}
          >
            Couldn't update status: {actionError}
          </p>
        )}

        {error ? (
          <p
            role="alert"
            style={{
              ...message,
              color: "#B3453D",
            }}
          >
            Couldn't load applications: {error}.
            Check that the Flask server is running on
            port 5000.
          </p>
        ) : loading && items.length === 0 ? (
          <p style={message}>
            Loading applications…
          </p>
        ) : items.length === 0 ? (
          <p style={message}>
            {hasFilters
              ? "No applications match these filters. Try clearing a status or widening the dates."
              : "No applications yet."}
          </p>
        ) : (
          <div
            style={{
              ...grid,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {items.map((application) => (
              <ApplicationCard
                key={application.id}
                application={application}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}

        <Pagination
          page={pageNum}
          totalPages={totalPages}
          onChange={setPageNum}
        />
      </div>
    </div>
  );
}