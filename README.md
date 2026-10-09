# ApplyPilot

**ECE444 Software Engineering — Team Blue**

ApplyPilot is a web application project designed to simplify the job application process. Its goal is to help job seekers maintain a reusable master profile, create job-specific resumes, manage applications, and prepare for interviews from one platform.

> **Development status:** Sprint 1 completed. The team implemented initial versions of two main features: Tailored Resume Generation and Application View. Resume generation is functional, although the formatting, spacing, and alignment of generated templates require further refinement. The Application View includes database models for users, jobs, and applications, along with CRUD APIs. Further integration and improvements are planned.

## Project Overview

Applying for jobs can involve repeatedly updating resumes, tracking applications across multiple platforms, and preparing for different interviews. ApplyPilot aims to bring these activities into a single workflow.

### Features and Development Status

| Feature | Description | Status |
| --- | --- | --- |
| Master resume and parser | Upload or manually enter resume information and parse a master resume for generation. | Implemented in Sprint 1 |
| Tailored resume generation | Generate a resume based on master-resume information, a job description, and a selected template. | Functional in Sprint 1; formatting needs improvement |
| Resume templates | Choose from three resume templates. | Implemented in Sprint 1; visual refinement needed |
| Resume preview and export | Preview the generated PDF and download it. | Prototype implemented |
| Application View | View and manage job-application information. | Implemented in Sprint 1 |
| Application database models | Represent users, jobs, and applications. | Implemented in Sprint 1 |
| Jobs and applications CRUD APIs | Create, read, update, and delete job and application records. | Implemented in Sprint 1 |
| Expanded application tracking | Track applications and their current stages across the full integrated platform. | Further integration planned |
| Email-assisted status updates | Use relevant emails to help update application status. | Planned |
| Interview practice | Prepare for interviews using a question pool. | Planned |
| Recruiter outreach | Draft personalized outreach messages. | Planned |
| Resume explanation sidebar | Explain choices made when tailoring resume content. | Planned |
| Application analytics | Summarize application activity and progress. | Planned |

## Sprint 1 Implementation

### Sammyajit Datta — Tailored Resume Generation

Sprint 1 work included implementing tailored resume generation, developing the master resume parser, and selecting three resume templates. The main workflow is functional: users can generate resumes using information from their master resumes. The resulting templates still need improvements to spacing, alignment, and overall presentation. Usability testing, unit testing, and teammate code reviews were conducted. Further template refinement is planned.

### Subat Ahsan — Application View

Sprint 1 work included implementing the Application View, creating database models for users, jobs, and applications, and developing CRUD APIs to manage jobs and job applications. These components provide a foundation for application management and tracking. Usability testing, unit testing, and teammate code reviews were conducted. Further feature integration and improvements are planned.

### Resume-Generation Prototype Workflow

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

The **standalone resume-generation prototype** uses HTML, CSS, and JavaScript and can be run in a browser without an API key. However, the broader ApplyPilot project also includes Subat’s Application View, database models, and CRUD APIs. Backend dependencies and setup requirements must be documented once their exact framework, database, and commands are confirmed.

## Required and Suggested Tools

| Tool | Purpose | Required? |
| --- | --- | --- |
| HTML, CSS, JavaScript | Resume-generation frontend prototype | Yes, for that prototype |
| Database and backend API technologies | Application View models and CRUD APIs | Used in Sprint 1; specific technologies to be confirmed |
| React | Add here only if used in the integrated app or a teammate’s implementation | Not yet verified |
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

For the **resume-generation frontend**, locate the folder containing its HTML prototype and open the entry-point HTML file (typically `index.html`) in a browser. Alternatively, use VS Code’s Live Server extension to serve that folder locally.

For the **Application View backend and database**, follow the setup instructions in its feature directory, if available. The exact package installation, database configuration, and backend startup commands need to be confirmed and added here before a new contributor can run the complete integrated application.

**Note:** The exact entry-point path may vary by branch as the team integrates features. Check the current branch's directory structure before running the app.

No package installation or build command is needed for the **standalone static resume-generation prototype**. This statement does not apply to the Application View backend or database.

## Running and Testing Locally

### Resume-generation testing

Run the HTML entry point in a browser and verify the core workflow:

1. Enter master-resume information or upload a supported PDF.
2. Select a template.
3. Supply a job description using exactly one input method.
4. Generate the resume and check that an embedded PDF preview appears.
5. Download the file and review its formatting.
6. Confirm that generation is unavailable when required information is missing.

### Application View testing

Verify the Application View and its data operations, including creating, retrieving, updating, and deleting job/application records after the backend and database have been configured. Specific test commands and setup details still need to be documented.

### Testing status

Both team members carried out **unit testing, usability testing, and teammate code review sessions during Sprint 1**. Unit testing checked individual components, usability testing evaluated whether features were useful and intuitive, and code reviews helped identify logical errors and inconsistencies. The exact test framework and automated execution command have not yet been recorded in this README; add verified commands when available. Further integration testing is planned as features are combined.

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
| Sammyajit Datta | Tailored Resume Generation, master resume parser, three resume templates, testing, code review, and project management |
| Subat Ahsan | Application View, database models for users/jobs/applications, CRUD APIs, testing, code review, and UI/UX |

## Development Standards

- Keep work in feature branches rather than making unrelated changes directly on `main`.
- Use descriptive commit messages and meaningful pull-request descriptions.
- Review each other's code before merging, especially where features integrate.
- Keep code readable and consistently formatted.
- Add or update tests when introducing functionality, once the automated test structure is established.
- Update documentation when setup steps, dependencies, or behavior change.
- Do not commit API keys, passwords, or other secrets.

## Project Documentation

- [Repository](https://github.com/SammyajitDatta/ECE444-Project)
- Requirements, sprint reports, and design artifacts: refer to documentation committed in this repository as it becomes available.

## Related Projects

No separate related-project repository is required to run the current ApplyPilot prototype. Links to future dependencies or companion services can be added here.

## Deployment

**Local (resume-generation prototype):** Open its HTML entry point in a browser or serve it using a local static-file server. **Application View:** Database/backend setup and launch instructions are pending verification. Full-app deployment instructions will be added as integration proceeds.

**Production:** A hosted deployment and production deployment instructions have not yet been established.

## CI/CD Status

No verified automated build, test, or deployment pipeline is documented here yet. Once configured, add a link to the GitHub Actions workflow and its status badge.

---

*This README will be updated throughout development as features, tests, dependencies, and deployment practices are finalized.*
