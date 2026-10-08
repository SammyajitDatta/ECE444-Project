import { useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createApplication } from "../api";

interface SkillInputProps {
  label: string;
  skills: string[];
  onChange: (skills: string[]) => void;
  placeholder?: string;
}

function SkillInput({
  label,
  skills,
  onChange,
  placeholder = "Type item and press Enter",
}: SkillInputProps) {
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addSkill = () => {
    const skill = value.trim();
    if (!skill) return;

    if (skills.some((existing) => existing.toLowerCase() === skill.toLowerCase())) {
      setValue("");
      return;
    }

    onChange([...skills, skill]);
    setValue("");
  };

  const removeSkill = (skillToRemove: string) => {
    onChange(skills.filter((skill) => skill !== skillToRemove));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addSkill();
    }
    if (event.key === "Backspace" && value === "" && skills.length > 0) {
      onChange(skills.slice(0, -1));
    }
  };

  return (
    <label style={fieldStyle}>
      <span style={labelStyle}>{label}</span>

      <div
        style={{
          ...skillBoxStyle,
          borderColor: isFocused ? "#3b82f6" : "#e2e8f0",
          boxShadow: isFocused ? "0 0 0 3px rgba(59, 130, 246, 0.15)" : "none",
        }}
        onClick={() => inputRef.current?.focus()}
      >
        {skills.map((skill) => (
          <span key={skill} style={skillChipStyle}>
            {skill}
            <button
              type="button"
              aria-label={`Remove ${skill}`}
              style={removeSkillButtonStyle}
              onClick={(event) => {
                event.stopPropagation();
                removeSkill(skill);
              }}
            >
              ×
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          type="text"
          value={value}
          placeholder={skills.length === 0 ? placeholder : "Add another..."}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={skillInputStyle}
        />
      </div>

      <span style={hintStyle}>Press Enter to add</span>
    </label>
  );
}

export default function CreateApplicationPage() {
  const navigate = useNavigate();

  const today = new Date().toISOString().split("T")[0];

  const [title, setTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobType, setJobType] = useState("");
  const [salaryLow, setSalaryLow] = useState("");
  const [salaryHigh, setSalaryHigh] = useState("");
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [preferredSkills, setPreferredSkills] = useState<string[]>([]);
  const [perks, setPerks] = useState<string[]>([]);
  const [jobDescription, setJobDescription] = useState("");
  const [about, setAbout] = useState("");
  const [dateApplied, setDateApplied] = useState(today);

  const [resume, setResume] = useState<File | null>(null);
  const [coverLetter, setCoverLetter] = useState<File | null>(null);
  const [transcript, setTranscript] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!title.trim() || !companyName.trim()) {
      setError("Job title and company name are required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("company_name", companyName.trim());

      if (jobType) formData.append("job_type", jobType);
      if (salaryLow.trim()) formData.append("salary_low", salaryLow.trim());
      if (salaryHigh.trim()) formData.append("salary_high", salaryHigh.trim());

      formData.append("required_skills", JSON.stringify(requiredSkills));
      formData.append("preferred_skills", JSON.stringify(preferredSkills));
      formData.append("perks", JSON.stringify(perks));

      if (jobDescription.trim()) formData.append("job_description", jobDescription.trim());
      if (about.trim()) formData.append("about", about.trim());
      if (dateApplied) formData.append("date_applied", dateApplied);
      if (resume) formData.append("resume", resume);
      if (coverLetter) formData.append("cover_letter", coverLetter);
      if (transcript) formData.append("transcript", transcript);

      await createApplication(formData);

      navigate("/");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't create application."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <Link to="/" style={backButtonStyle}>
          ← Back to Applications
        </Link>

        <header style={headerStyle}>
          <h1 style={titleStyle}>Add Application</h1>
          <p style={subtitleStyle}>
            Track and manage details for your target roles.
          </p>
        </header>

        <form onSubmit={handleSubmit}>
          {/* Section 1: Basic Info */}
          <section style={cardSectionStyle}>
            <h2 style={sectionTitleStyle}>Job Details</h2>

            <div style={twoColumnStyle}>
              <TextField
                label="Job title"
                value={title}
                onChange={setTitle}
                required
                placeholder="e.g. Role Name"
              />

              <TextField
                label="Company"
                value={companyName}
                onChange={setCompanyName}
                required
                placeholder="e.g. Organization Name"
              />
            </div>

            <div style={twoColumnStyle}>
              <SelectField
                label="Job type"
                value={jobType}
                onChange={setJobType}
                options={[
                  { label: "Full-time", value: "full_time" },
                  { label: "Part-time", value: "part_time" },
                  { label: "Contract", value: "contract" },
                  { label: "Internship", value: "internship" },
                  { label: "Temporary", value: "temporary" },
                ]}
              />

              <TextField
                label="Date Applied"
                value={dateApplied}
                onChange={setDateApplied}
                type="date"
              />
            </div>

            <div style={twoColumnStyle}>
              <TextField
                label="Minimum salary"
                value={salaryLow}
                onChange={setSalaryLow}
                placeholder="e.g. 80000"
              />

              <TextField
                label="Maximum salary"
                value={salaryHigh}
                onChange={setSalaryHigh}
                placeholder="e.g. 100000"
              />
            </div>
          </section>

          {/* Section 2: Skills & Benefits */}
          <section style={cardSectionStyle}>
            <h2 style={sectionTitleStyle}>Skills & Benefits</h2>

            <SkillInput
              label="Required skills"
              skills={requiredSkills}
              onChange={setRequiredSkills}
              placeholder="Add required skill"
            />

            <SkillInput
              label="Preferred skills"
              skills={preferredSkills}
              onChange={setPreferredSkills}
              placeholder="Add preferred skill"
            />

            <SkillInput
              label="Perks & Benefits"
              skills={perks}
              onChange={setPerks}
              placeholder="Add perk or benefit"
            />
          </section>

          {/* Section 3: Job Description & About */}
          <section style={cardSectionStyle}>
            <h2 style={sectionTitleStyle}>Descriptions & Notes</h2>

            <label style={fieldStyle}>
              <span style={labelStyle}>Job Description</span>
              <TextArea
                value={jobDescription}
                onChange={setJobDescription}
                placeholder="Paste official job description, responsibilities, or requirements here..."
                rows={5}
              />
            </label>

            <label style={fieldStyle}>
              <span style={labelStyle}>About</span>
              <TextArea
                value={about}
                onChange={setAbout}
                placeholder="Company Notes"
                rows={3}
              />
            </label>
          </section>

          {/* Section 4: Documents */}
          <section style={cardSectionStyle}>
            <h2 style={sectionTitleStyle}>Documents</h2>

            <div style={fileGridStyle}>
              <FileInput
                label="Resume"
                file={resume}
                onChange={setResume}
              />

              <FileInput
                label="Cover letter"
                file={coverLetter}
                onChange={setCoverLetter}
              />

              <FileInput
                label="Transcript"
                file={transcript}
                onChange={setTranscript}
              />
            </div>
          </section>

          {error && (
            <div style={errorContainerStyle}>
              <p role="alert" style={errorMessageStyle}>
                {error}
              </p>
            </div>
          )}

          <div style={actionsStyle}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                ...submitButtonStyle,
                opacity: submitting ? 0.6 : 1,
                cursor: submitting ? "not-allowed" : "pointer",
              }}
            >
              {submitting ? "Saving Application..." : "Save Application"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------------- Focusable Form Controls ---------------- */

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  type = "text",
}: TextFieldProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <label style={fieldStyle}>
      <span style={labelStyle}>
        {label}
        {required && <span style={requiredMarkStyle}> *</span>}
      </span>

      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={{
          ...inputBaseStyle,
          borderColor: isFocused ? "#3b82f6" : "#e2e8f0",
          boxShadow: isFocused ? "0 0 0 3px rgba(59, 130, 246, 0.15)" : "none",
        }}
      />
    </label>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
}

function SelectField({ label, value, onChange, options }: SelectFieldProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <label style={fieldStyle}>
      <span style={labelStyle}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={{
          ...inputBaseStyle,
          borderColor: isFocused ? "#3b82f6" : "#e2e8f0",
          boxShadow: isFocused ? "0 0 0 3px rgba(59, 130, 246, 0.15)" : "none",
        }}
      >
        <option value="">Select job type...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextArea({
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      placeholder={placeholder}
      rows={rows}
      style={{
        ...inputBaseStyle,
        resize: "vertical",
        minHeight: rows * 24,
        borderColor: isFocused ? "#3b82f6" : "#e2e8f0",
        boxShadow: isFocused ? "0 0 0 3px rgba(59, 130, 246, 0.15)" : "none",
      }}
    />
  );
}

interface FileInputProps {
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
}

function FileInput({ label, file, onChange }: FileInputProps) {
  return (
    <label style={fileDropzoneStyle}>
      <span style={labelStyle}>{label}</span>
      <div style={fileDropzoneBoxStyle}>
        <span style={{ fontSize: 13, color: file ? "#2563eb" : "#64748b" }}>
          {file ? `📄 ${file.name}` : "Click to upload file"}
        </span>
      </div>
      <input
        type="file"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        style={{ display: "none" }}
      />
    </label>
  );
}


const pageStyle: CSSProperties = {
  minHeight: "100vh",
  padding: "48px 24px 80px",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
};

const containerStyle: CSSProperties = {
  maxWidth: 720,
  margin: "0 auto",
};

const backButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  color: "#64748b",
  fontSize: "14px",
  fontWeight: 500,
  textDecoration: "none",
  marginBottom: "20px",
  transition: "color 0.15s ease",
};

const headerStyle: CSSProperties = {
  marginBottom: 28,
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: "28px",
  fontWeight: 700,
  color: "#0f172a",
  letterSpacing: "-0.02em",
};

const subtitleStyle: CSSProperties = {
  margin: "6px 0 0",
  fontSize: "15px",
  color: "#64748b",
};

const cardSectionStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: 24,
  marginBottom: 20,
  boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)",
};

const sectionTitleStyle: CSSProperties = {
  margin: "0 0 18px",
  fontSize: "16px",
  fontWeight: 600,
  color: "#0f172a",
  letterSpacing: "-0.01em",
};

const twoColumnStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 16,
  marginBottom: 16,
};

const fieldStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  marginBottom: 16,
};

const labelStyle: CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  color: "#334155",
};

const requiredMarkStyle: CSSProperties = {
  color: "#ef4444",
};

const inputBaseStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  fontSize: "14px",
  color: "#0f172a",
  padding: "10px 14px",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  background: "#ffffff",
  outline: "none",
  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
};

const skillBoxStyle: CSSProperties = {
  minHeight: 44,
  boxSizing: "border-box",
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 6,
  padding: "6px 10px",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  background: "#ffffff",
  cursor: "text",
  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
};

const skillInputStyle: CSSProperties = {
  flex: 1,
  minWidth: 120,
  border: "none",
  outline: "none",
  fontSize: "14px",
  color: "#0f172a",
  padding: "4px 2px",
  background: "transparent",
};

const skillChipStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "4px 10px",
  borderRadius: 6,
  background: "#f1f5f9",
  color: "#334155",
  fontSize: "13px",
  fontWeight: 500,
};

const removeSkillButtonStyle: CSSProperties = {
  border: "none",
  background: "none",
  color: "#94a3b8",
  padding: 0,
  fontSize: "15px",
  lineHeight: 1,
  cursor: "pointer",
};

const hintStyle: CSSProperties = {
  fontSize: "12px",
  color: "#94a3b8",
  marginTop: 2,
};

const fileGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 12,
};

const fileDropzoneStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  cursor: "pointer",
};

const fileDropzoneBoxStyle: CSSProperties = {
  border: "1px dashed #cbd5e1",
  borderRadius: 8,
  padding: "16px 12px",
  textAlign: "center",
  background: "#f8fafc",
  transition: "background 0.15s ease, border-color 0.15s ease",
};

const actionsStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  marginTop: 24,
};

const submitButtonStyle: CSSProperties = {
  border: "none",
  borderRadius: 8,
  padding: "12px 24px",
  fontSize: "14px",
  fontWeight: 600,
  color: "#ffffff",
  background: "#2563eb",
  boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  transition: "background-color 0.15s ease",
};

const errorContainerStyle: CSSProperties = {
  background: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: 8,
  padding: "12px 16px",
  marginBottom: 16,
};

const errorMessageStyle: CSSProperties = {
  color: "#dc2626",
  fontSize: "14px",
  margin: 0,
};