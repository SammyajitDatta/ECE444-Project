# Sprint 2 verification and review handoff

## Completed in the working copy

- Production frontend build: passed (TypeScript and Vite).
- Frontend ESLint: passed.
- Existing resume tests: 18 passed.
- New backend tests: 29 passed.
- Browser smoke check: login/setup screen, application creation, resume studio, desktop
  and 390px mobile layout. Session/list responses mocked for authenticated UI coverage;
  no Google credentials used. No browser runtime errors or mobile horizontal overflow.
- Visual inspection of login, creation and resume screenshots; fixed a shared CSS class
  collision that had affected the resume upload control.
- Git diff whitespace checks: passed.

Backend coverage includes anonymous rejection, per-user listing/download/research
isolation, CSRF enforcement, replay rejection after logout, verified Google subject
mapping, rejected callback/provider errors, no automatic email-based account takeover,
application status/create validation, HTML JSON-LD/text/real-PDF import, invalid/oversized
uploads, private IP and redirect rejection, DNS-pinned HTTPS, citation fields, unsupported
question rejection, explicit no-results behavior, and Interviewing status enforcement.

## Still requires live configuration or people

1. Configure Google OAuth locally, then test actual consent, cancelled consent, two
   different Google accounts, logout, browser back/reload, and a second login. Authlib
   exchange was mocked in automated callback tests; live provider acceptance is pending.
2. Configure Brave Search or use permitted public URLs. Build a manually reviewed set of
   company/role sources and candidate reports. Confirm each excerpt against the original
   source and record retrieval dates. Current automated fixtures are synthetic; they do
   not establish live-source recall or reliability. Conservative extraction may return
   no questions from Glassdoor/Reddit or phrasing it does not recognize.
3. Configure Gemini and run one real resume-generation request. The existing resume unit
   tests passed; a paid/live generation request was not made.
4. Human usability test: ask a participant to sign in, import/edit/save a job, change its
   status, find citations, create/download a resume, and sign out. Record completion,
   confusion, and corrections. Do not count browser automation as user testing.
5. Teammate review: inspect identity scoping, migrations, public retrieval, extraction
   conservatism, branch diffs, and UI. Review before merging to main.
6. Hold and record your weekly team meeting; no meeting or teammate review was performed
   by the assistant, and no screenshots' estimated/actual hours were certified.

## Publication state

Original remote branches were read successfully. Issues and comments were readable.
A dry-run push failed because this session lacks GitHub write credentials. The work is
committed on local feature branches and integration/sprint-2, not published to GitHub.
No issues were closed and no changes were merged into main.
