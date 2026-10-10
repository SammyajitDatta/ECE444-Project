# Contributing to ApplyPilot

Thank you for your interest in contributing to ApplyPilot! This document outlines the guidelines and procedures for contributing to the project. Whether you are fixing a bug, proposing a feature, improving documentation, or reviewing existing code, your contributions help improve the quality and maintainability of the project.

As a collaborative university project, we aim to maintain a clear, consistent, and transparent development process that supports effective teamwork.

## Development Workflow

We use GitHub to host the project's source code, manage issues, track feature requests, and review proposed changes.

All contributions should follow a structured workflow to ensure that changes are reviewed and integrated consistently.

### Branching and Pull Requests

We follow [GitHub Flow](https://guides.github.com/introduction/flow/index.html), with changes proposed and reviewed through pull requests.

To contribute:

1. Create a new branch from the `master` branch for your changes.
2. Implement your changes, keeping them focused on a specific issue or task.
3. Add or update tests where appropriate to verify the correctness of your changes.
4. Update the documentation if your changes affect existing functionality, APIs, or setup procedures.
5. Run the relevant tests and ensure they pass.
6. Check that your code follows the project's coding conventions and passes any applicable linting checks.
7. Submit a pull request describing your changes and their purpose.
8. Address feedback from reviewers and obtain approval before merging.

Pull requests should be sufficiently focused and clearly described to make reviewing and understanding changes straightforward.

## Reporting Bugs and Requesting Features

We use [GitHub Issues](https://github.com/SammyajitDatta/ECE444-Project/issues) to document bugs, track development tasks, and discuss potential improvements.

Before opening a new issue, check whether a similar issue already exists. When submitting an issue, provide enough information for other contributors to understand and address it.

### Bug Reports

A useful bug report should include:

- **Summary:** A concise description of the problem.
- **Steps to reproduce:** Clear instructions for reproducing the issue, including sample code or input where applicable.
- **Expected behaviour:** A description of what should have happened.
- **Actual behaviour:** A description of what happened instead.
- **Environment:** Relevant information about the software, dependencies, or configuration.
- **Additional context:** Any relevant observations, troubleshooting steps, or potential explanations.

Detailed and reproducible bug reports help the team identify problems efficiently and reduce the time required to investigate them.

### Feature Requests

Feature requests should describe the proposed functionality, the problem it addresses, and its potential benefits to the project. Where appropriate, include examples or implementation considerations to help the team evaluate the proposal.

## Coding Standards

Contributors should follow a consistent coding style to improve readability and maintainability across the codebase.

Unless otherwise specified by the project, please observe the following conventions:

- Use **two spaces for indentation** rather than tabs.
- Follow the existing naming conventions and code organization.
- Write clear, descriptive names for variables, functions, and other program elements.
- Keep changes focused and avoid unrelated modifications.
- Include comments or documentation where they clarify non-obvious implementation details.
- Run the project's available linting tools before submitting changes.

If supported by the project, run the following command to check code style:

```bash
npm run lint
```

Follow the existing project conventions when a particular language, framework, or tool requires a different style.

## Testing and Documentation

Contributors are expected to verify their changes before submitting a pull request.

- Run relevant tests and confirm that existing functionality continues to work.
- Add or update tests when introducing new functionality or fixing bugs.
- Update documentation when changes affect how the project is installed, configured, or used.
- Clearly identify any known limitations or issues that remain unresolved.

These practices help ensure that contributions do not introduce regressions and that the project remains accessible to other team members.

## Licensing

By contributing to ApplyPilot, you acknowledge that your contributions are subject to the project's applicable license.

Contributions will be distributed under the same license as the project, provided that this is consistent with the project's licensing terms and any applicable university course requirements. Please contact the project maintainers if you have questions or concerns regarding licensing.

## Acknowledgements and References

The structure and initial format of this contribution guide were adapted from the open-source contribution guidelines template by Brian D. K. at [GitHub Gist](https://gist.github.com/briandk/3d2e8b3ec8daf5a27a62).