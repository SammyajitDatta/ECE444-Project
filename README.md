# ApplyPilot

**ECE444 Software Engineering | Team Blue**

ApplyPilot is a web application designed to simplify the job search process. It brings resume customization, job-application management, job import, company research, and interview preparation into one platform so job seekers can spend less time on repetitive administrative work.

The Sprint 2 integration (React + TypeScript frontend, Flask/SQLite application API with Google authentication, and the Node/Gemini resume worker) lives on the `integration/sprint-2` branch. It is the complete runnable version of the project and has **not** been merged into `main`.

## Project Description and Purpose

Job seekers often maintain multiple versions of their resumes, manually record application progress, and prepare separately for interviews. ApplyPilot aims to streamline these activities through a reusable master resume, tailored resume generation, and a central application view. Applications are scoped to the signed-in Google identity, and new users are registered on their first successful Google login.

### Features

| Feature | Description | Status |
| --- | --- | --- |
| Master resume parser | Accept and process information from a master resume. | Implemented |
| Tailored resume generation | Produce a resume based on master-resume information, a job description, and a selected template. | In Progress |
| Resume templates | Offer three selectable resume layouts. | In Progress |
| PDF preview and export | Preview and download the generated resume. | Implemented |
| Application View | Display and manage job-application information. | Implemented |
| Database models | Model users, jobs, and applications. | Implemented |
| Jobs and applications CRUD APIs | Create, read, update, and delete jobs and applications. | Implemented |
| Google sign-in (issue #26) | Google-only OIDC authentication with per-account data isolation. | Implemented (`integration/sprint-2`) |
| Job import (issue #17) | Import job postings from public HTTPS URLs or PDF/HTML/TXT files. | Implemented (`integration/sprint-2`) |
| Company/role research (issue #16, revised story #5) | Show sourced excerpts about the company and role. | Implemented (`integration/sprint-2`) |
| Reported interview questions (issue #15, revised story #6) | Retrieve explicitly reported interview questions for Interviewing applications. | Implemented (`integration/sprint-2`) |
| Unified UI and resume integration (issue #21) | Resume studio routed through the authenticated Flask gateway, with regression tests. | Implemented (`integration/sprint-2`) |
| Full application integration | Connect the application's frontend, APIs, and data persistence into one workflow. | Implemented on `integration/sprint-2`; not yet merged to `main`; production deployment not included |
| Email-assisted status updates | Help update application statuses from relevant emails. | Planned |
| Interview practice | Provide interview preparation questions and exercises. | Planned |
| Recruiter outreach drafts | Help create personalized recruiter outreach messages. | Planned |
| Resume explanation sidebar | Explain decisions made while tailoring a resume. | Planned |
| Application analytics | Summarize application activity and outcomes. | Planned |

**Known limitations:**

- Resume generation works, but the generated templates need improved spacing, alignment, and overall formatting. These refinements are why tailored generation and templates are marked **In Progress** rather than complete.
- Remaining human and live-provider acceptance tasks are listed in `docs/sprint-2-verification.md`.

### Feature Details (Sprint 2)

- **Authentication:** Google OIDC through Authlib with state/nonce/token validation, an HttpOnly session cookie, server-side session revocation, and CSRF protection. Accounts are linked by Google's immutable `sub`, never silently linked to an old local account by email.
- **Applications:** Listing, filtering, pagination, document downloads, creation, and status updates, now isolated per account.
- **Job import:** Accepts public HTTPS URLs or PDF/HTML/TXT files (2 MB limit). JSON-LD `JobPosting` metadata fills structured fields; the text/PDF fallback uses explicit labels where possible and preserves the description. Review fields and salary units before saving. Scanned job PDFs require OCR before upload, and multi-posting pages use the first `JobPosting`.
- **Company/role research:** Displays short direct excerpts, each with a source URL and retrieval date. It does not generate unsupported company claims.
- **Reported interview questions:** Available for applications in the Interviewing stage. Extraction is deliberately conservative: the same sentence must name the company and exact role, include a report marker such as "interviewer asked," and contain a quoted question. This can miss valid reports. Empty results are shown explicitly and never replaced with generated questions. Candidate reports are not independently confirmed facts.
- **Resume studio:** Retains the original master-resume input, templates, PDF preview, and download. Its API now goes through the authenticated Flask gateway. Resume content stays in component memory and clears on page exit/reload, as in the original version.

### Data Retrieval, Privacy, and Terms

- Public retrieval respects `robots.txt` and skips login walls, inaccessible pages, and unsupported formats. DNS addresses and redirects are validated, connections are pinned to the validated public IP, and responses have size and time limits.
- Permission to retrieve must still be consistent with each source's terms; `robots.txt` alone is not a license.
- Automatic discovery queries disclose the application's company and role to Brave Search.
- Resume AI processing sends the submitted resume and job description to Gemini.

## Prerequisites

- [Node.js and npm](https://nodejs.org/): **Node 22.12+** (Node 24 recommended) for React/Vite frontend development and the resume worker.
- [Python](https://www.python.org/) **3.11+** for running the Flask backend.
- [Git](https://git-scm.com/) to clone the repository and switch branches.
- A modern web browser.
- A code editor, such as Visual Studio Code.
- A Google Cloud OAuth client (see [Environment Configuration](#environment-configuration)) to sign in.
- A Gemini API key for AI resume generation.

## Required Tooling and Technology Stack

| Technology or Tool | Purpose |
| --- | --- |
| [React](https://react.dev/) with TypeScript | Frontend user interface and resume-generation workflow. |
| [Vite](https://vite.dev/) | Frontend development server and build tooling (port 5173). |
| JavaScript / JSX / TSX | React components and frontend application logic. |
| HTML and CSS | Webpage structure and styling; React uses JSX to describe the elements rendered in the browser. |
| [Node.js](https://nodejs.org/) and npm | Install frontend dependencies, run the dev server, and host the private resume worker. |
| [Python](https://www.python.org/) and [Flask](https://flask.palletsprojects.com/) | Backend application and HTTP API development. |
| SQLite | Application database. |
| [Authlib](https://authlib.org/) | Google OIDC authentication. |
| [Google Gemini API](https://ai.google.dev/) | AI resume generation and scanned-resume transcription. |
| [Brave Search API](https://brave.com/search/api/) (optional) | Automatic public source discovery for company research. |
| [pytest](https://docs.pytest.org/) | Backend tests. |
| [Git](https://git-scm.com/) and [GitHub](https://github.com/) | Version control and team collaboration. |

### Suggested Tooling

- [Visual Studio Code](https://code.visualstudio.com/) for development.
- [React Developer Tools](https://react.dev/learn/react-developer-tools) and browser developer tools for debugging.
- [GitHub Desktop](https://desktop.github.com/) as an optional Git interface.

## Branches

Original branches are untouched: `main`, `application_view`, `resume-generation`, `user_stories`. The complete runnable version is `integration/sprint-2`.

The Sprint 2 feature branches are stacked in this order, because they depend on the integrated Sprint 1 code and authentication:

1. `feature/google-auth`: issue #26 (Google-only per the owner's instruction)
2. `feature/job-import`: issue #17
3. `feature/company-research`: issue #16 / revised story #5
4. `feature/interview-questions`: issue #15 / revised story #6
5. `feature/unified-ui`: issue #21, resume integration, and regression tests

Review each branch's diff against its preceding branch. The integration branch contains all changes; none are merged into `main`.

## Getting Started

### Run the Integrated Application (recommended)

```sh
git clone https://github.com/SammyajitDatta/ECE444-Project.git
cd ECE444-Project
git switch integration/sprint-2
python -m venv .venv
# Windows PowerShell: .venv\Scripts\Activate.ps1
# macOS/Linux: source .venv/bin/activate
python -m pip install -r backend/requirements.txt
npm ci
python scripts/setup_env.py
```

Then configure `.env` (see below) and start everything from the repository root:

```sh
npm run dev
```

Open http://localhost:5173. This single command starts Flask on port 5000, the private resume worker on `127.0.0.1:3001`, and Vite on port 5173. The legacy standalone client is retained for source compatibility; use the integrated root command, not the old standalone dev command.

Google manages passwords and account recovery. Signing out ends the ApplyPilot session, not the user's Google browser session. This does not implement UofT Microsoft SSO.

### Environment Configuration

`python scripts/setup_env.py` creates a local `.env`. Edit it as follows:

| Variable | Required | Description |
| --- | --- | --- |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Yes | Create a Google OAuth **Web application** client in Google Cloud. Configure the consent screen and add test users if in testing mode. Register `http://localhost:5173/api/auth/callback` as an authorized redirect URI. It must match exactly, including `localhost` versus `127.0.0.1`. |
| `PUBLIC_ORIGIN` | Yes | The frontend origin. Default: `http://localhost:5173`. |
| `GEMINI_API_KEY` | For AI features | Required for AI resume generation and scanned-resume transcription. Text-based PDF extraction works without Gemini. |
| `BRAVE_SEARCH_API_KEY` | Optional | Brave Search API subscription key for automatic public source discovery. Without it, users can enter a source URL directly. |
| `FLASK_SECRET_KEY`, `RESUME_WORKER_TOKEN` | Generated | Created by the setup script. Do not share them. |

Never commit `.env` or any credentials.

### Run Individual Sprint 1 Features (legacy)

These instructions cover the standalone Sprint 1 versions. They do not include authentication, job import, research, or interview features. Note that the branch is named `resume-generation` in the Sprint 2 documentation; if `resume_generation` is not found, use that name.

**Tailored resume generation** (on the `resume_generation` branch):

```bash
git clone https://github.com/SammyajitDatta/ECE444-Project.git
cd ECE444-Project
git switch resume_generation
npm install
npm run dev
```

Open the local URL displayed in the terminal (commonly `http://localhost:5173/`). If `package.json` is within a subdirectory rather than the branch root, navigate into that directory **before** running `npm install` and `npm run dev`. Users can provide master-resume content and a job description, choose a template, and generate and preview a tailored PDF.

**Application View** (on the `application_view` branch): React frontend plus Flask backend, with models for users, jobs, and applications and CRUD APIs for jobs and applications.

```bash
# Frontend
cd frontend/app
npm install
npm run dev
```

```bash
# Backend (separate terminal, in the directory containing app.py)
python app.py
```

Keep both processes running while using the Application View. The precise backend directory path has not been specified.

## Existing Database

`db.create_all()` adds the Google identity and session tables without deleting application records. Pre-existing seeded/local users are **not** automatically attached to Google. An email collision displays a sign-in error and requires a deliberate administrator-led migration after confirming ownership. Do not run `backend/seed.py` on valuable data. For a fresh demo, use a fresh SQLite database, not a shared seeded user.

## Testing

The team has performed unit testing, usability testing, and teammate code reviews while developing the features. On `integration/sprint-2`, run the following from the repository root:

```sh
npm test
python -m pytest backend/tests -q
npm run lint -w app
npm run build
```

See `docs/sprint-2-verification.md` for the actual checks and the remaining human and live-provider acceptance tasks. Synthetic fixtures verify parsing and API behavior; they are not proof of current live-source coverage.

Tests for the Sprint 1 standalone branches are not publicly available, so manual checks remain the only way to verify those branches and are not a substitute for automated tests.

## Deployment

The root dev command is for local development only. A production deployment needs:

- A WSGI server, an HTTPS reverse proxy, and static serving of `frontend/app/dist`.
- `/api` proxied to Flask, with **no** public route to the resume worker.
- Persistent DB and upload storage.
- The production OAuth redirect URI and `PUBLIC_ORIGIN` configured. Secure cookies are enabled for an HTTPS origin.
- A stable random Flask secret set before deploying.

No deployment or CI/CD pipeline is included in the Sprint 2 change.

## Project Management Tools

| Tool or Resource | Purpose | Link |
| --- | --- | --- |
| GitHub Repository | Source code and project documentation | [ECE444-Project](https://github.com/SammyajitDatta/ECE444-Project) |
| GitHub Issues | Tasks, bugs, and user stories | [Issues](https://github.com/SammyajitDatta/ECE444-Project/issues) |
| GitHub Pull Requests | Code reviews and merging changes | [Pull Requests](https://github.com/SammyajitDatta/ECE444-Project/pulls) |
| GitHub Projects | Backlog and task planning, if configured | [Repository Projects](https://github.com/SammyajitDatta/ECE444-Project/projects) |

If a separate GitHub Projects board or another project-management tool is being used, replace or supplement the links above with the specific public board URL.

## Team Standards and Collaboration

- Develop features on separate branches, and use pull requests for review before merging into `main`.
- Use descriptive commit messages and pull-request summaries.
- Perform teammate code reviews and discuss logic errors or integration issues.
- Follow readable, consistent code formatting and document major changes.
- Test features before merging, and do not commit credentials, API keys, or `.env` files.
- Keep this README updated when the project's tools or setup steps change.

For further collaboration rules, see [CONTRIBUTING.md](Contribution.md) when added. For conduct expectations, see [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) when added.

## Team Members

| Team Member | Primary Responsibilities |
| --- | --- |
| Sammyajit Datta | Tailored resume generation, master resume parsing, resume templates, project management, testing, and code review. |
| Subat Ahsan | Application View, database models, CRUD APIs, UI/UX, testing, and code review. |

## Project Documentation

Project requirements, design documents, and other technical documentation are maintained in the [GitHub repository](https://github.com/SammyajitDatta/ECE444-Project). Sprint 2 verification details are in `docs/sprint-2-verification.md`. Links to other specific documents can be added as they become available. For README formatting conventions, see the [Best README Template](https://github.com/othneildrew/Best-README-Template).

## CI/CD Status

No publicly verified automated build, test, or deployment workflow has been documented yet. Tests exist and can be run locally on `integration/sprint-2`, but no pipeline runs them automatically. When CI/CD is configured, this section will link to the workflow and its build/deployment status.

---

*This README is intended to help new contributors understand, run, test, and contribute to ApplyPilot. It should be updated as the project evolves.*
