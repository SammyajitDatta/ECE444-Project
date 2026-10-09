# ApplyPilot

A React + Node.js application that helps users prepare **truthful, one-page, text-based PDF resumes** with Gemini. ApplyPilot includes an editable master resume, three visually distinct document designs, manual job-posting entry, a PDF preview, and a download button.

## Features

1. **Master information:** Type or paste your entire master resume, or upload a PDF. Uploading a PDF **replaces** the current master resume only after successful extraction. Digital PDFs use direct text-layer extraction (to avoid rewriting); scanned PDFs can use Gemini to transcribe text.
2. **Clickable source links:** PDF hyperlinks whose text only says “LinkedIn” or “GitHub” are extracted from PDF link annotations when present. Any recovered URLs are appended to the editable master text under `LINKS FROM MASTER RESUME`. Clickable URL cards also appear beside the editor. Links supplied as text are detected as well, and visible web links are written into the generated PDF as clickable URL annotations.
3. **Required master fields:** Applicant name, EDUCATION, EXPERIENCE, and PROJECTS. The initial generation threshold is 130 words; the PDF builder also checks that the page is not mostly blank.
4. **Three resume designs:** Masthead (forest-green banner and copper rule), Heritage (centered serif with traditional fine rules), and Typeset (large name, warm section bars, copper accents). Masthead is selected by default. All layouts use a single text column and text-selectable content. Results can differ across applicant-tracking systems, so ATS compatibility is **not guaranteed**.
5. **Manual job posting only:** Paste a job description. HTML upload has been intentionally removed.
6. **Gemini resume tailoring:** The backend sends master text and job requirements to Gemini; a structured JSON response with source evidence is validated before PDF export. Gemini is instructed to select relevant material, optionally rephrase without changing meaning, and never invent facts. **Always personally verify generated text.**
7. **One-page embedded PDF viewer and download:** Changing the design after generation re-renders the document locally without calling Gemini again.
8. **Blank by default:** No master resume, job description, uploaded filename, or generated PDF is preloaded. Nothing is restored from previous browser storage. Inputs are in-memory only and reset on refresh. The **Clear all fields** control wipes the current session.

## Prerequisites

- Node.js **20.19+ or 22+** (recommended: Node 22)
- npm
- A recent desktop or mobile browser
- A new Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)

## Install and run

1. Unzip the project and open the `ApplyPilot` directory in your terminal.
2. Run `npm install` from the project root.
3. Copy `.env.example` to `.env` in the **project root**. On Windows PowerShell:
   ```powershell
   Copy-Item .env.example .env
   ```
   On macOS/Linux:
   ```sh
   cp .env.example .env
   ```
4. Add your **new private** key to `.env`:
   ```dotenv
   GEMINI_API_KEY=your_private_new_key
   GEMINI_MODEL=gemini-3.5-flash-lite
   PORT=3001
   ```
   Never commit `.env`. Use a backend key, not a `VITE_` environment variable.
5. Start the web app and server together:
   ```sh
   npm run dev
   ```
6. Open **http://localhost:5173**.

### Fixing “The configured Gemini model is unavailable”

Newer Google AI Studio projects may not have access to some Gemini 2.5 models even when they appear in model listings. If your old `.env` contains `GEMINI_MODEL=gemini-2.5-flash`, replace it with:

```dotenv
GEMINI_MODEL=gemini-3.5-flash-lite
```

Then stop and restart `npm run dev`. The backend also automatically tries alternative current model IDs (`gemini-3.8-flash` then `gemini-3.5-flash`) **if a generation request returns 404**. It doesn't retry for API-key failures, invalid requests, or exhausted quotas. Model availability, feature support, and quotas depend on your Google account and project. We cannot guarantee any model will be accessible to every account.

Use `http://localhost:3001/api/health` to check whether an API key is set and see the active/requested model name. No credentials are returned.

**Important:** If your API key was ever pasted into a chat, public issue, or code repository, revoke or rotate it before using this app. Store the new key only in `.env`.

## How to use

1. Enter your name, education, experience and projects, or upload a resume PDF.
2. Verify PDF extraction and all recovered links. Manually correct any text or missing URLs.
3. Choose **Masthead**, **Heritage**, or **Typeset**.
4. Paste the job posting into the manual input field, which unlocks after valid master information.
5. Click **Generate one-page PDF**. The backend invokes Gemini; the frontend lays out the result in one page.
6. Inspect the embedded preview and try a different template, then download the PDF.

**Note:** This revision intentionally does not auto-save applicant data in localStorage. Refreshing the page begins with empty input fields. Copy your master resume elsewhere if you need to keep a draft.

**Verification fix:** Education, job and project labels returned by Gemini may be shortened or paraphrased. The server now maps those labels back to source lines from the original resume rather than immediately failing with an “unverified education/experience details” message. Bullet evidence is checked against the original resume. New or mismatched metrics are replaced with their original source wording. Users still need to verify every generated claim manually; this is not a guarantee that AI paraphrases are error-free.

**PDF spacing fix:** The PDF engine measures text widths and wraps every line with a consistent baseline/line height, spacing between entries, and margin constraints. It uses selectable text and trims lower-priority items when necessary to keep one US Letter page. Very short source resumes still produce an insufficient-information error.

If the master doesn't contain enough source material, the application reports: “There is not enough information in the master resume to fill out a full templated resume.”

## Stack and project structure

| Layer | Technology |
| --- | --- |
| UI | React 18, Vite 6, Lucide icons, CSS |
| API | Node.js, Express 4, multer |
| Gemini | `@google/genai` on the server only |
| PDF import | `pdf-parse`, `pdf-lib` for embedded URI annotations |
| PDF creation | `pdf-lib` in browser, text-based single-page documents |
| Tests | Node built-in test runner |

```text
ApplyPilot/
  client/
    src/App.jsx          # Full scrolling workflow and state
    src/styles.css       # Styles, responsive behavior, live thumbnails
    src/lib/pdf.js       # Three real PDF designs + clickable URI annotations
  server/
    index.mjs            # Express endpoints, PDF upload, validation
    lib/gemini.mjs       # Transcription, tailoring, model failover
    lib/pdf-links.mjs    # Extract real PDF annotations and organize links
    lib/validation.mjs   # Content checks and source evidence validation
    tests/               # Unit tests
  shared/resume-links.mjs # Shared link parsing, classification and project matching
  .env.example
  README.md
```

## Developer scripts

| Command | Action |
| --- | --- |
| `npm run dev` | Start Vite + Express in parallel |
| `npm run build` | Produce frontend build in `client/dist` |
| `npm test` | Run backend validation and PDF tests |
| `npm run start -w server` | Run Express server |

Vite serves the React frontend on port **5173** and proxies `/api` requests to the backend on **3001** during development. A separate deployment integration is not provided in this prototype.

## Team standards

- Work in descriptive feature branches; keep PRs focused and code readable.
- Validate every backend request; treat the PDF and job description as untrusted input.
- Keep secrets server-side and outside Git. Do not log resume content or API credentials.
- Write tests for data validation, link preservation, and generated PDF behavior.
- Never claim ATS compatibility or AI factual accuracy is guaranteed; human review is required.

## Current limitations

- No login, shared database, hosted deployment, or live application-tracking integration yet.
- A PDF's hyperlink annotation may not always be readable, and scanned or image-only PDFs need AI transcription (which may be inaccurate). Always verify recovered details.
- PDF text areas are plain-text controls, so link clicks work in the separate links panel and generated PDF, **not inside the textarea itself**.
- Source substring checks detect whether AI outputs have supporting text, but cannot prove every rephrase is factually equivalent.
- Some PDF readers may display the embedded PDF differently; download and inspect the final file before using it.
- Most styles will fit typical student resumes, but very long words or unusual layouts might need manual shortening.

## Current CI/CD status

Automated CI/CD workflows have **not** been set up; no build/deploy status badges or live links are available yet. A production environment would also need HTTPS, secure server-side key management, and appropriate data-privacy controls. This repository is intended as a local working prototype.


## Updating from an older ApplyPilot version

Stop both development servers first. Replace the old source folder with the files in this archive, but retain your private `.env` separately; do **not** copy the old project over the new files. Run `npm install` and then `npm run dev` from the new project root. Refresh `http://localhost:5173`.

Unlike v2, v3 removes legacy `applypilot:*` browser storage keys on load. **The master-resume and job-posting editors deliberately start blank**, and new text is not auto-saved. The demo-loading button has been removed.

If you still see the old demo control or earlier formatting, you are likely hitting a stale frontend or backend. Stop its Node process and restart the server from this archive.


## Link handling (v4)

Uploaded PDF URLs and URLs pasted into the master resume are moved to a **LINKS FROM MASTER RESUME** appendix at the bottom of the text editor and shown as clickable items in **Links we found**. This preserves the source URL without inserting long repository URLs in the resume contact line. Only LinkedIn, the main GitHub/GitLab account, or other general website links are placed in the PDF header. GitHub repository links are linked next to matching project titles (matched by project/repository name). An unmatched repository link is still available in the sidebar but is not silently assigned to an unrelated project.

The **Load demo** control has been removed. Resumes and job postings start blank on refresh. Output PDFs remain one-page, searchable text with selectable, clickable annotations.

The template previews are illustrative and may differ in wording from your generated resume; fonts, heading treatment and page spacing have been adjusted to better mirror exported PDF layouts. Review every generated claim before use.

## v5 — Dense master resume, stronger one-page fit, and template spacing

The project includes two **optional, separate testing fixtures** under `samples/`:

- `Sammyajit_Datta_SYNTHETIC_Master_Resume.txt` — editable master resume to paste in the Master Resume editor.
- `Sammyajit_Datta_SYNTHETIC_Master_Resume.pdf` — the same master resume, formatted for upload testing.
- `Sample_Embedded_Software_Job_Posting.txt` — manual-paste role description for tailoring tests.

**These are explicitly fictional test fixtures.** Company names, accomplishments, awards, measurements, and demo contact information are invented for software testing; they are **not** factual claims about the named applicant. Do not submit them for real jobs. Neither the resume nor the job posting loads automatically when the app starts. The template previews use `LAST FIRST`, not a real or invented person's name.

**Content fitting (v5):** Gemini selects source-backed role-relevant bullets; the server then retrieves *unused verbatim master resume bullets* and additional sections. The client builds the one-page PDF incrementally: an education entry, strongest role/project, then additional positions and facts as available until the chosen layout fills. If verified material is still insufficient to fill a readable page, the original insufficient-information error remains. The app will never fabricate experience to occupy blank space. The renderer also uses larger readable body text, measured word wrapping, more generous header-to-content spacing, and separate metadata lines below titles. Text-based PDFs remain preferred for ATS parsing, but no template can be universally guaranteed 'ATS approved.'

The sample TXT file is the highest-fidelity format for testing text import. PDF extraction depends on a document's text layer and may introduce line-wrap differences, so always review the extracted master resume before generating.

**Testing:** `npm test` runs all tests after `npm install`; when dependencies aren't installed, run `node --test server/tests/backfill.test.mjs server/tests/link-organization.test.mjs server/tests/validation.test.mjs` for the pure Node tests. Live Gemini calls and actual browser PDF rendering require a configured key, installed dependencies, and a local browser.
