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

- [Node.js and npm](https://nodejs.org/) (a version compatible with the project's `package.json`).
- [Git](https://git-scm.com/) to clone the repository and switch branches.
- A modern web browser.
- A code editor, such as Visual Studio Code.

## Required Tooling and Technology Stack

| Technology or Tool | Purpose |
| --- | --- |
| [React](https://react.dev/) | Frontend user interface, including the resume-generation feature. |
| JavaScript and JSX | React components and application behavior. |
| HTML and CSS | Browser page structure and application styling. React typically renders HTML through JSX; CSS handles layout and presentation. |
| [Node.js](https://nodejs.org/) and npm | Run the frontend development tooling and install project dependencies. Node.js is not being identified here as the application's backend framework. |
| Git and GitHub | Source control, collaboration, and project management. |
| Database models and CRUD APIs | Backend functionality used by the Application View; these are application components, **not React tooling**. The backend framework and database technology have not yet been confirmed. |

React does **not** replace HTML, CSS, or JavaScript. You generally write React components in JavaScript/JSX, style them with CSS, and the browser ultimately displays HTML. The separate Application View backend uses database models and CRUD APIs, which should be documented further once its technology stack and setup commands are confirmed.

### Suggested Tooling

- [Visual Studio Code](https://code.visualstudio.com/) for development.
- [React Developer Tools](https://react.dev/learn/react-developer-tools) and browser developer tools for debugging.
- [GitHub Desktop](https://desktop.github.com/) as an optional Git interface.

## Getting Started

### Run Tailored Resume Generation

The tailored resume-generation frontend is available on the `resume-generation` branch.

```bash
git clone https://github.com/SammyajitDatta/ECE444-Project.git
cd ECE444-Project
git switch resume-generation
npm install
npm run dev
```

Open the local URL displayed in the terminal after `npm run dev` starts (commonly `http://localhost:5173/`, but use the URL shown by your development server).

If `package.json` is within a subdirectory rather than the branch root, navigate into that directory **before** running `npm install` and `npm run dev`.

From the running interface, users can provide master-resume content and a job description, choose a resume template, and generate and preview a tailored PDF.

### Application View

The Application View includes models for users, jobs, and applications, as well as CRUD APIs for jobs and applications. Its backend framework, database, and launch commands have not been confirmed for this README; setup instructions will be added once those details are available.

## Build and Run Instructions

To **run the resume-generation frontend locally for development**, use `npm install` followed by `npm run dev`, as shown above. Do not open `index.html` directly or use VS Code Live Server as the recommended setup for the React project.

A separate production build command and deployment procedure have not yet been verified. `npm run dev` starts the development server; it is not a production build.

## Testing

The team has performed unit testing, usability testing, and teammate code reviews while developing the features. **The automated test suite and instructions to run it are not publicly available yet.** Therefore, no public test command or test-report link is provided at this time.

Once tests are made available in the repository, this section will document their prerequisites and exact commands. Contributors can currently review the user-facing functionality manually after starting the development server, but manual checks are not a substitute for the unpublished tests.

## Local Deployment

The resume-generation feature runs locally using `npm run dev` in the `resume-generation` branch after dependencies have been installed. This is a **development environment**, not a production deployment. Instructions for running the integrated application and deploying to production have not yet been published.

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

For further collaboration rules, see [CONTRIBUTING.md](CONTRIBUTING.md) when added. For conduct expectations, see [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) when added.

## Team Members

| Team Member | Primary Responsibilities |
| --- | --- |
| Sammyajit Datta | Tailored resume generation, master resume parsing, resume templates, project management, testing, and code review. |
| Subat Ahsan | Application View, database models, CRUD APIs, UI/UX, testing, and code review. |

## Project Documentation

Project requirements, design documents, and other technical documentation are maintained in the [GitHub repository](https://github.com/SammyajitDatta/ECE444-Project). Links to specific documents can be added as they become available.

## Related Projects and References

- [Best README Template](https://github.com/othneildrew/Best-README-Template) — reference template for project documentation.
- Additional related project links can be added as needed.

## CI/CD Status

No publicly verified automated build, test, or deployment workflow has been documented yet. When CI/CD is configured, this section will link to the workflow and its build/deployment status.

---

*This README is intended to help new contributors understand, run, test, and contribute to ApplyPilot. It should be updated as the project evolves.*
