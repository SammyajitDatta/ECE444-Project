import { Link } from "react-router-dom";
import PreparationPanel from "../components/PreparationPanel";
import { page as pageStyles } from "../theme";
import type { Application } from "../types";

export default function CompanyPreparationPage({ application }: { application: Application }) {
  const { id, job } = application;

  return (
    <main style={pageStyles.root}>
      <div style={{ ...pageStyles.container, maxWidth: 760 }}>
        <Link to={`/applications/${id}`}>← Back to application</Link>
        <h1 style={{ ...pageStyles.title, margin: "20px 0 8px" }}>Company &amp; role preparation</h1>
        <p style={{ margin: 0 }}>{job.title} at {job.company_name}</p>
        <PreparationPanel applicationId={id} />
      </div>
    </main>
  );
}
