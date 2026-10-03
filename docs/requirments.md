# ApplyPilot Requirements Documentation 

## Goal
The objective of ApplyPilot is to help job seekers efficiently create, organize, and prepare applications for specific roles. This will be achieved by allowing users to maintain a master professional profile, provide a resume template baseline, and submit a job description for each application. ApplyPilot will use the user's profile information, resume template, and job description to generate a revisable tailored resume with feedback in the user's chosen format. It will also track application statuses, draft recruiter outreach messages, and provide company- and role-specific interview question pools when an application reaches the interview stage. The primary benefits of ApplyPilot are reducing repetitive application work, helping users present their most relevant verified experience, and giving them organized support throughout the job-application process. Rather than requiring users to switch between separate tools for resume tailoring, application tracking, outreach, and interview preparation, ApplyPilot brings these workflows into one application to create a more intuitive and easier user experience.

## Stakeholders

- Job Seekers: The primary users of the app. They apply to jobs regularly and are directly affected by how well the app saves them time and improves their applications.
- Recruiters: The people who receive the resumes, cover letters, and outreach messages the app helps produce. They are not users, but the quality of what job seekers send them determines whether the app's output is effective. They also receive outreach emails.
- Hiring Managers: The companies posting jobs and hiring. They are indirectly affected by the volume and quality of applications the app helps generate, and their hiring processes and applicant tracking systems (ATS) interact with the documents it produces.
- PIPEDA: Organizations governing how organizations store personal data are affected since this app stores resumes which is personal data. Specifically in Canada, The Personal Information Protection and Electronic Documents Act, Canada's federal privacy law governing how private-sector organizations collect, use, and disclose personal information. It applies because the app stores resumes, contact details, and employment history.


## User Personas

During stakeholder analysis, the team identified job seekers as ApplyPilot’s primary users. Priya, Andre, and Sofia represent different moments in the job-search process: preparing an application, managing several active applications, and preparing for an interview. Riya, Daniel, and Patrick are external stakeholder personas whose work is affected by ApplyPilot’s outputs and data practices.

These personas are fictional tools for reasoning about the system. 

### User Role 1: Early-Career Applicant

Name: Priya Mehta

Description:
Priya is a final-year computer engineering student applying for her first full-time technical role. She has completed course projects, hackathons, and part-time work, but has limited formal industry experience. Priya finds it difficult to decide which projects and skills are most relevant to each job posting. She wants to present her experience honestly while avoiding the repetitive task of rebuilding her resume for every application.


### User Role 2: High-Volume Active Applicant

Name: Andre Lewis

Description:
Andre is an early-career professional actively applying to several roles through company websites and job boards. He may use different resume versions, record different contacts, and face different deadlines for each role. Andre currently keeps this information across browser bookmarks, spreadsheets, downloaded files, and email threads. As the number of applications increases, he finds it difficult to remember which resume he submitted, when to follow up, and the current status of each application.


### User Role 3: Interview-Stage Candidate

Name: Sofia Nguyen

Description:
Sofia has been invited to interview for a role after submitting an application. She understands the general responsibilities in the job description but does not know how to efficiently research the company, its products, its values, and the expectations of the specific role. Sofia wants to practice likely interview questions and connect her own experiences to the skills that the employer may assess.


### External Stakeholder Role 1: Talent Acquisition Coordinator / HR Screener

Name: Riya Shah

Description:
Riya is a talent acquisition coordinator who receives job applications and occasional candidate outreach messages. She performs initial screening, checks whether applicants have clearly addressed basic qualifications, and may route promising applications to a hiring manager. Riya does not use ApplyPilot directly, but the quality of its generated resumes and messages affects her workload and her impression of applicants.


### External Stakeholder Role 2: Hiring Manager

Name: Daniel Cho

Description:
Daniel is an engineering manager hiring for a role on his team. After initial screening, he reviews applicants to determine whether their experience demonstrates the technical and professional qualifications needed for the position. Daniel needs to quickly understand what an applicant did, what skills they used, and how their previous work relates to the role. He is concerned that AI-generated materials may make vague or misleading claims.


### External Stakeholder Role 3: Privacy Compliance Investigator (PIPEDA)

Name: Patrick Reid

Description:
Patrick is a compliance investigator at the Office of the Privacy Commissioner of Canada (OPC), the federal body that oversees PIPEDA. If a user complained about the job application app, he would check whether it meets PIPEDA's 10 fair information principles. His goal is to make sure apps are compliant and that it is easy to tell they are. He gets frustrated when an app is technically compliant but too complex to verify, or when unclear design forces him to take action he would rather avoid.


## User Stories

### User Story 1
**User story:** As Patrick, I want to make sure the app transmits uploaded resumes and other personal documents only over secure, encrypted channels (HTTPS), so that I can easily confirm they cannot be intercepted or accessed by unauthorized parties while being uploaded.

**Source and rationale:** [The OPC's PIPEDA Fair Information Principle 7 (Safeguards)](https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/p_principle/principles/p_safeguards/) requires organizations to protect personal information against loss, theft, and unauthorized access, disclosure, copying, use, or modification, and lists up-to-date technological tools such as encryption as an example of appropriate protection. Resumes contain names, contact details, and employment history, so they are personal information that is exposed whenever it travels between the user's browser and the app.

**Measure:** Number of upload requests accepted over HTTP.

**Target:** 0 upload requests are accepted over HTTP, while 100% of HTTPS ones are accepted. [The OWASP Transport Layer Protection Cheat Sheet](https://wiki.owasp.org/index.php?oldid=234920&title=Transport_Layer_Protection_Cheat_Sheet) says a page available over HTTPS must not also be available over plain HTTP, since a single HTTP request is enough for an attacker to intercept it.

**Conditions:**
- Every supported file type (for example PDF and DOCX), up to the maximum upload size
- The production deployment, not just local development
- All major browsers
- Users on untrusted networks, such as public Wi-Fi

**Verification method:**
- Test every upload endpoint several times over HTTPS and confirm uploads work
- Test every upload endpoint several times over HTTP and confirm uploads are rejected
- Repeat in several major browsers with different file types

### User Story 2
**User story:** As an active applicant, I want to easily record my job applications in one place, so that I can quickly see the companies, roles, dates, and current statuses of my applications.

**Source and rationale:** According to [a reddit thread](https://www.reddit.com/r/jobsearchhacks/comments/1px8h91/how_does_everyone_track_their_job_applications/), most job seekers don't have a good way to track their applications, commonly resorting to messy spreadsheets or other less effective methods. It also shows that others are interested in a better method for storing their application data.

**Measure:** Whether the app has one view that lists all of a user's job applications, showing the company, role, date, and status of each at a glance.

**Target:** The app has a single page that shows every saved application with its company, role, date applied, and current status visible without opening each one, because [the Interaction Design Foundation](https://ixdf.org/literature/topics/recognition-vs-recall) says that making information visible, instead of making users remember it, reduces their cognitive load and mental effort.

**Conditions:**
- A user with 50 or more stored applications
- Desktop and mobile browsers
- Several status values in use (for example Applied, Interviewing, Offer, Rejected)
- A user returning to the app after a few days

**Verification method:**
- Add several applications with different companies, roles, dates, and statuses, open the applications page on desktop and mobile, and confirm all of them appear in one list with those four details visible without clicking into each one.

### User Story 3
**User story:** As Priya Mehta, I want to provide my master professional profile, baseline resume template, and a job description so that ApplyPilot can produce an editable resume draft that emphasizes my relevant verified experience.

**Source and rationale:** [Jobscan](https://www.jobscan.co/state-of-the-job-search) reports that 26% of surveyed job seekers say tailoring a resume takes a lot of time. This supports reducing repeated tailoring work; it does not guarantee an interview outcome.

**Measure:** Percentage of test job descriptions for which the generated resume includes the expected relevant experiences from the user's master professional profile, without including unverified experience.

**Target:** 100% of 50 test cases pass.

**Conditions:**
- User has no relevant experience
- User has an abundance of relevant experience
- Everything in between

**Verification method:**
- Create 50 representative job descriptions spanning different amounts of relevant experience
- For each job description, create an answer key identifying the profile experiences expected to be emphasized or included
- Generate a tailored resume for each case and compare it against the answer key
- A case passes if the generated resume selects the expected experience and does not introduce experience unsupported by the master profile

### User Story 4
**User story:** As Priya Mehta, I want my tailored resume draft to appear promptly after I submit valid inputs so that generating application materials does not interrupt my application workflow.

**Source and rationale:** UofT students on Reddit describe Computer Engineering as a difficult and time-consuming program ([source](https://www.reddit.com/r/UofT/comments/wuaqze/is_uoft_engineering_as_depressing_and_hard_as_its/)). This supports reducing time spent on other demanding tasks, such as tailoring resumes, so students can allocate that time elsewhere.

**Measure:** End-to-end time from receipt of a valid generation request to display of an editable draft.

**Target:** All resumes are generated within a maximum of [3 minutes](https://www.lumaresume.com/faq).

**Conditions:**
- 50 concurrent resume generation requests
- Template up to two pages

**Verification method:**
- Generate resumes for 50 predefined test cases
- Measure the elapsed time from when the user submits the required inputs to when the editable resume is displayed

### User Story 5
**User story:** As Sofia Nguyen, I want a company- and role-specific preparation page with cited public information so that I can verify key facts before relying on them in interview preparation.

**Source and rationale:** [Jobscan](https://www.jobscan.co/state-of-the-job-search) advises candidates to research the company and role. This justifies Sofia's want for proper company information to improve her chances of landing a job at a company she is interviewing with.

**Measure:** The proportion of displayed factual company claims that include a source URL and retrieval date.

**Target:** 100% of factual company claims are cited. When reliable information is unavailable, ApplyPilot states that limitation.

**Conditions:**
- The application has a company name and role title
- Information comes from publicly accessible, permitted sources

**Verification method:**
- Review a fixed set of preparation pages
- Open each citation
- Compare the displayed factual claim with the linked source

### User Story 6
**User story:** As Sofia Nguyen, I want ApplyPilot to find previously reported interview questions for the company and role I am interviewing for so that I can use past interview experiences to prepare for my interview.

**Source and rationale:** Interview candidates share past interview questions and experiences on public platforms. For example, [Glassdoor's Evertz Microsystems interview page](https://www.glassdoor.ca/Interview/Evertz-Microsystems-Interview-Questions-E228185.htm?) contains interview reports for different Evertz roles, including reported questions and technical topics. A [Reddit discussion about an Evertz interview](https://www.reddit.com/r/waterloo/comments/16cxwng?) similarly includes candidates discussing questions and topics encountered during Evertz interviews. This supports aggregating previously reported interview questions from multiple sources while clearly identifying them as past reports rather than questions guaranteed to appear in Sofia's interview.

**Measure:** The percentage of displayed interview questions that include a link to the public source from which the question was retrieved.

**Target:** 100% of displayed interview questions include a valid source link. If no reported questions can be found for the specified company and role, ApplyPilot explicitly states that no relevant questions were found rather than generating or presenting unsupported questions as previously asked.

**Conditions:**
- The application is marked as Interview
- The application contains a company name and role title
- Questions are retrieved only from publicly accessible, permitted sources

**Verification method:**
- Use a predefined set of company-role pairs with a manually created answer key of publicly available interview questions
- Run ApplyPilot for each pair and compare the retrieved questions against the answer key and linked sources
- A test passes if every displayed question can be verified in its cited source and no unsupported question is presented as a previously reported interview question

### User Story 7
**User story:** As Sofia Nguyen, I want ApplyPilot to suggest structured interview answers using my verified experiences so that I can prepare relevant answers without misrepresenting my experience.

**Source and rationale:** The [University of Toronto Mississauga Career Centre](https://www.utm.utoronto.ca/careers/tips-effective-interviews?) recommends using specific examples from a candidate's actual work, academic, volunteer, or extracurricular experiences and structuring responses using the STAR method (Situation, Task, Action, Result). It also recommends considering related or transferable experiences when direct experience is unavailable. This supports helping Sofia structure answers using experiences she has actually provided rather than generating fictional experiences.

**Measure:** Percentage of generated interview-answer claims about the user's experience that can be traced to information in their professional profile.

**Target:** 100% of experience-based claims are supported by the user's profile. If no relevant experience exists, ApplyPilot states that no matching experience was found rather than inventing one.

**Conditions:**
- User has provided a professional profile containing verified work, academic, project, volunteer, or extracurricular experiences
- User provides an interview question

**Verification method:**
- Test a predefined set of interview questions against user profiles containing matching, partially matching, and no matching experiences
- Compare every experience-based claim in the generated answer against the corresponding profile
- The test passes if 100% of experience claims are supported by the profile and no unsupported experiences are introduced

### User Story 8
**User story:** As Andre, I want to be able to add new applications to the system easily and quickly because I am applying to a lot of jobs and need to reduce as much time as possible on each job.

**Source and rationale:** [According to Huntr](https://huntr.co/research/job-search-trends-q3-2025), in 2025, the top 10% of applicants applied to 83 jobs a week. Having to do a long process just to add a job to the system would make applicants who apply a lot less likely to use the system.

**Measure:** Average time it takes to add a new job using the system.

**Target:** 1-1.5 minutes to upload a job. [A NNGroup article](https://www.nngroup.com/articles/powers-of-10-time-scales-in-ux/) states that websites should allow basic tasks to be done in under a minute. An extra 0.5 minutes is given since it isn't a completely trivial task.

**Conditions:**
- Different jobs from different websites
- Fast for all people

**Verification method:**
- Get many people to upload multiple different jobs to the system
- Track average time it takes, and number of people above and below target

### User Story 9
**User story:** As Riya Shah, I want outreach messages produced by ApplyPilot to be concise, respectful, and tailored to the company or role so that candidate communication is easier to assess and less likely to appear generic.

**Source and rationale:** [Jobscan's recruiter survey](https://www.jobscan.co/state-of-the-job-search) found that 54.03% of surveyed recruiters value personalized cover letters, and 24.42% appreciate professional follow-up after an application. This supports creating relevant, editable drafts; it does not imply that applicants are entitled to a reply.

**Measure:** Whether a draft meets the outreach checklist: correct company or role reference, one relevant saved experience item when available, no invented relationship or recipient fact, and user-editable content.

**Target:** Every generated test draft meets the checklist. If no contact or relevant evidence is available, ApplyPilot uses an honest generic fallback.

**Conditions:**
- Known contacts
- Missing contacts
- Relevant profiles
- Profiles with limited matching experience

**Verification method:**
- Generate outreach drafts from the test cases
- Evaluate each draft against the checklist before any message can be copied or sent externally


## Initial Scope

## Questions to Clarify