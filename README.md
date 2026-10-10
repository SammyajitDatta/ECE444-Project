# ApplyPilot

**ECE444 Software Engineering | Team Blue**

ApplyPilot is a web application designed to simplify the job search process. It brings resume customization, job-application management, and interview preparation into one platform so job seekers can spend less time on repetitive administrative work.

## Project Description and Purpose

Job seekers often maintain multiple versions of their resumes, manually record application progress, and prepare separately for interviews. ApplyPilot aims to streamline these activities through a reusable master resume, tailored resume generation, and a central application view.

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
| Full application integration | Connect the application's frontend, APIs, and data persistence into one workflow. | Planned |
| Email-assisted status updates | Help update application statuses from relevant emails. | Planned |
| Interview practice | Provide interview preparation questions and exercises. | Planned |
| Recruiter outreach drafts | Help create personalized recruiter outreach messages. | Planned |
| Resume explanation sidebar | Explain decisions made while tailoring a resume. | Planned |
| Application analytics | Summarize application activity and outcomes. | Planned |

**Known limitation:** Resume generation works, but the generated templates need improved spacing, alignment, and overall formatting. These refinements are why tailored generation and templates are marked **In Progress** rather than complete.

## Prerequisites

- [Node.js and npm](https://nodejs.org/) (a version compatible with the project's `package.json`) for React frontend development.
- [Python](https://www.python.org/) for running the Flask backend.
- [Git](https://git-scm.com/) to clone the repository and switch branches.
- A modern web browser.
- A code editor, such as Visual Studio Code.

## Required Tooling and Technology Stack

| Technology or Tool | Purpose |
| --- | --- |
| [React](https://react.dev/) | Frontend user interface and resume-generation workflow. |
| JavaScript / JSX | React components and frontend application logic. |
| HTML and CSS | Webpage structure and styling; React uses JSX to describe the elements rendered in the browser. |
| [Node.js](https://nodejs.org/) and npm | Install frontend dependencies and run the React development server. |
| [Python](https://www.python.org/) and [Flask](https://flask.palletsprojects.com/) | Backend application and HTTP API development. |
| [Git](https://git-scm.com/) and [GitHub](https://github.com/) | Version control and team collaboration. |

### Suggested Tooling

- [Visual Studio Code](https://code.visualstudio.com/) for development.
- [React Developer Tools](https://react.dev/learn/react-developer-tools) and browser developer tools for debugging.
- [GitHub Desktop](https://desktop.github.com/) as an optional Git interface.

## Getting Started

### Run Tailored Resume Generation

The tailored resume-generation frontend is available on the `resume_generation` branch.

```bash
git clone https://github.com/SammyajitDatta/ECE444-Project.git
cd ECE444-Project
git switch resume_generation
npm install
npm run dev
```

Open the local URL displayed in the terminal after `npm run dev` starts (commonly `http://localhost:5173/`, but use the URL shown by your development server).

If `package.json` is within a subdirectory rather than the branch root, navigate into that directory **before** running `npm install` and `npm run dev`.

From the running interface, users can provide master-resume content and a job description, choose a resume template, and generate and preview a tailored PDF.

### Run Application View

The Application View uses a React frontend and a Flask backend, including models for users, jobs, and applications and CRUD APIs for jobs and applications.

**Frontend:** From the project directory, navigate to `frontend/app`, install dependencies, and start the development server:

```bash
cd frontend/app
npm install
npm run dev
```

**Backend:** In a separate terminal, navigate to the directory containing `app.py`, then run:

```bash
python app.py
```

Keep both development processes running while using the Application View. The precise backend directory path has not been specified.

## Testing

The team has performed unit testing, usability testing, and teammate code reviews while developing the features. **The automated test suite and instructions to run it are not publicly available yet.** Therefore, no public test command or test-report link is provided at this time.

Once tests are made available in the repository, this section will document their prerequisites and exact commands. Contributors can currently review the user-facing functionality manually after starting the development server, but manual checks are not a substitute for the unpublished tests.

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
- Test features before merging, and do not commit credentials or API keys.
- Keep this README updated when the project's tools or setup steps change.

For further collaboration rules, see [CONTRIBUTING.md](Contribution.md) when added. For conduct expectations, see [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) when added.

## Team Members

| Team Member | Primary Responsibilities |
| --- | --- |
| Sammyajit Datta | Tailored resume generation, master resume parsing, resume templates, project management, testing, and code review. |
| Subat Ahsan | Application View, database models, CRUD APIs, UI/UX, testing, and code review. |

## Project Documentation

Project requirements, design documents, and other technical documentation are maintained in the [GitHub repository](https://github.com/SammyajitDatta/ECE444-Project). Links to specific documents can be added as they become available. For README formatting conventions, see the [Best README Template](https://github.com/othneildrew/Best-README-Template).

## CI/CD Status

No publicly verified automated build, test, or deployment workflow has been documented yet. When CI/CD is configured, this section will link to the workflow and its build/deployment status.

---

*This README is intended to help new contributors understand, run, test, and contribute to ApplyPilot. It should be updated as the project evolves.*
