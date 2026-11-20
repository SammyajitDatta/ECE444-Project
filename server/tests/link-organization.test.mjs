import test from 'node:test';
import assert from 'node:assert/strict';
import { organizeMasterText, extractResumeLinks, cleanContactLine, matchingProjectLink } from '../../shared/resume-links.mjs';

const sample=`Sammyajit Anindya Datta
Toronto, ON | sammy@example.com | Linked In | GitHub: https://github.com/SammyajitDatta/Schedule-and-Course-Tracker: https://github.com/SammyajitDatta
EDUCATION
University of Toronto
EXPERIENCE
Embedded Systems Engineer
PROJECTS
Schedules and Course Tracker
- Built a scheduling app.`;

test('import moves project and profile URLs out of the middle of master text',()=>{
  const result=organizeMasterText(sample,['https://linkedin.com/in/sammydatta/']);
  assert.equal(result.links.length,3);
  const beforeAppendix=result.text.split('LINKS FROM MASTER RESUME')[0];
  assert.ok(!beforeAppendix.includes('github.com'), 'No raw URL in body');
  assert.ok(!beforeAppendix.includes('linkedin.com'));
  assert.ok(beforeAppendix.includes('Schedules and Course Tracker'));
  assert.ok(result.text.includes('LINKS FROM MASTER RESUME'));
  assert.equal(result.links.filter(l=>l.kind==='profile').length,2);
  assert.equal(result.links.filter(l=>l.kind==='project').length,1);
  assert.equal(organizeMasterText(result.text).text,result.text, 'Idempotent');
});

test('profile/contact strips embedded repo links and dangling labels',()=>{
  const contact=cleanContactLine('Toronto, ON | sammy@example.com | Linked In | GitHub: https://github.com/SammyajitDatta/Schedule-and-Course-Tracker');
  assert.equal(contact,'Toronto, ON  |  sammy@example.com');
});

test('repository links attach only to matching project titles',()=>{
  const links=extractResumeLinks('https://github.com/SammyajitDatta/Schedule-and-Course-Tracker https://github.com/SammyajitDatta');
  assert.equal(matchingProjectLink('Schedules and Course Tracker',links)?.kind,'project');
  assert.equal(matchingProjectLink('OS/161 Kernel',links),null);
});

test('a visible LinkedIn anchor and GitHub repository can coexist',()=>{
  const result=organizeMasterText('Person Name\nLinkedIn\nEDUCATION\nSchool', ['https://linkedin.com/in/user','https://github.com/user/project']);
  assert.equal(result.links.length,2);
  assert.ok(result.text.includes('Project: project: https://github.com/user/project'));
});
