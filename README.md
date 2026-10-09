# ApplyPilot

**ECE444 Software Engineering — Team Blue**

ApplyPilot is a web application project designed to simplify the job application process. Its goal is to help job seekers maintain a reusable master profile, create job-specific resumes, manage applications, and prepare for interviews from one platform.

> **Development status:** Early development (Sprint 1). The resume-generation prototype is functional, but resume template formatting and spacing still require improvement. Other planned features are not yet complete.

## Project Overview

Applying for jobs can involve repeatedly updating resumes, tracking applications across multiple platforms, and preparing for different interviews. ApplyPilot aims to bring these activities into a single workflow.

### Planned Features

| Feature | Description | Status |
| --- | --- | --- |
| Master resume | Upload or manually enter a reusable master resume. | Prototype implemented |
| Tailored resume generation | Generate a resume draft based on a job description and a selected template. | Functional prototype; formatting needs improvement |
| Resume preview and export | Preview the generated PDF and download it. | Prototype implemented |
| Application tracking | Track applications and their current stages. | Functional prototype |
| Email-assisted status updates | Use relevant emails to help update application status. | Planned |
| Interview practice | Prepare for interviews using a question pool. | Planned |
| Recruiter outreach | Draft personalized outreach messages. | Planned |
| Resume explanation sidebar | Explain choices made when tailoring resume content. | Planned |
| Application analytics | Summarize application activity and progress. | Planned |

## Current Prototype Workflow

1. Upload a master resume PDF **or** manually enter resume information.
2. Select one of three resume templates (Template 1 is the default).
3. Provide a job description by uploading an HTML file **or** pasting the description into a text field.
4. Generate a tailored resume draft.
5. Preview the PDF within the webpage and download it if desired.

The job-description inputs are mutually exclusive, and generation requires both master-resume content and a job description.

**Known limitation:** The current PDF generation flow needs additional polishing, particularly spacing, alignment, and template layout consistency. The current prototype should not be treated as a production-ready AI resume-tailoring service.

## Prerequisites

- A modern web browser (for example, Chrome, Firefox, or Edge).
- Git (recommended for obtaining the project and collaborating).
- A code editor (Visual Studio Code recommended).

The current client-side HTML/CSS/JavaScript prototype does **not** require Node.js, a database, or an API key to run. These requirements may change as the application evolves.

## Required and Suggested Tools

| Tool | Purpose | Required? |
| --- | --- | --- |
| HTML, CSS, JavaScript | Current prototype implementation | Yes |
| Web browser | Run and test the prototype | Yes |
| Git | Version control and collaboration | Recommended |
| [Visual Studio Code](https://code.visualstudio.com/) | Editing and debugging | Suggested |
| [GitHub](https://github.com/) | Source hosting, reviews, and issue tracking | For team collaboration |
| Browser developer tools | Diagnose console errors and layout problems | Suggested |

## Getting Started

Clone the repository:

```bash
git clone https://github.com/SammyajitDatta/ECE444-Project.git
cd ECE444-Project
```

Locate the folder containing the current HTML prototype and open its entry-point HTML file (typically `index.html`) in a browser. Alternatively, use VS Code's Live Server extension to serve the folder locally.

**Note:** The exact entry-point path may vary by branch as the team integrates features. Check the current branch's directory structure before running the app.

No package installation or build command is needed for the current static prototype.

## Running and Testing Locally

Run the HTML entry point in a browser and verify the core workflow:

1. Enter master-resume information or upload a supported PDF.
2. Select a template.
3. Supply a job description using exactly one input method.
4. Generate the resume and check that an embedded PDF preview appears.
5. Download the file and review its formatting.
6. Confirm that generation is unavailable when required information is missing.

### Automated Tests

An automated test suite and its execution command have not yet been documented for the current prototype. Until one is added, the steps above describe manual functional testing, **not** automated tests.

Planned testing includes unit tests, integration testing, and usability testing as relevant features are implemented.

## Project Management and Collaboration Tools

Milestone 3 requires the team to list its project-management tools and their public URLs. The project currently uses the following GitHub resources:

| Resource | Purpose | URL |
| --- | --- | --- |
| GitHub repository | Source code and project documentation | [ECE444-Project](https://github.com/SammyajitDatta/ECE444-Project) |
| GitHub Issues | Track tasks, bugs, and user stories | [Issues](https://github.com/SammyajitDatta/ECE444-Project/issues) |
| GitHub Pull Requests | Review and integrate changes | [Pull requests](https://github.com/SammyajitDatta/ECE444-Project/pulls) |
| GitHub Projects | Sprint/backlog organization, **if configured** | [Repository Projects](https://github.com/SammyajitDatta/ECE444-Project/projects) |

If the team uses a separate GitHub Project board or another planning tool, add its **actual board URL** here. Do not substitute the generic repository Projects page for a specific board unless that is what the team uses.

## Team Members

| Team member | Project responsibilities |
| --- | --- |
| Sammyajit Datta | Project management, AI-related functionality, full-stack development |
| Subat Ahsan | UI/UX, QA, full-stack development |

## Development Standards

- Keep work in feature branches rather than making unrelated changes directly on `main`.
- Use descriptive commit messages and meaningful pull-request descriptions.
- Review each other's code before merging, especially where features integrate.
- Keep code readable and consistently formatted.
- Add or update tests when introducing functionality, once the automated test structure is established.
- Update documentation when setup steps, dependencies, or behavior change.
- Do not commit API keys, passwords, or other secrets.

See [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) once those files have been added.

## Project Documentation

- [Repository](https://github.com/SammyajitDatta/ECE444-Project)
- Requirements, sprint reports, and design artifacts: refer to documentation committed in this repository as it becomes available.

## Related Projects

No separate related-project repository is required to run the current ApplyPilot prototype. Links to future dependencies or companion services can be added here.

## Deployment

**Local:** Open the client-side HTML entry point in a browser or serve it using a local static-file server.

**Production:** A hosted deployment and production deployment instructions have not yet been established.

## CI/CD Status

No verified automated build, test, or deployment pipeline is documented here yet. Once configured, add a link to the GitHub Actions workflow and its status badge.

---

*This README will be updated throughout development as features, tests, dependencies, and deployment practices are finalized.*
