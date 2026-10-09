import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMaster, isSourcePresent, cleanTailored } from '../lib/validation.mjs';

const master = `Avery Smith
avery@example.com
EDUCATION
University of Toronto
Computer Engineering
EXPERIENCE
Software Developer
Created scripts to automate reports and save time.
PROJECTS
Personal Website
Built a website with React and JavaScript.
SKILLS
JavaScript, React`;

test('requires name, education, experience and projects', () => {
  assert.equal(validateMaster(master).valid, true);
  assert.ok(validateMaster(master.replace('PROJECTS', 'OTHER')).missing.includes('PROJECTS section'));
  assert.ok(validateMaster(master.replace('Avery Smith', '...')).missing.some(x => x.startsWith('applicant name')));
});
test('source anchor can handle different line spacing and punctuation', () => {
  assert.equal(isSourcePresent(master, 'Built a website with React and JavaScript.'), true);
  assert.equal(isSourcePresent(master, 'Made 100 million dollars.'), false);
});
test('rejects unverified AI-invented resume claims', () => {
  assert.throws(() => cleanTailored({
    name: 'Invented Person',
    education: [{ title: 'University of Toronto', meta: '', bullets: [] }],
    experience: [{ title: 'Software Developer', meta: '', bullets: [] }],
    projects: [{ title: 'Personal Website', meta: '', bullets: [] }],
    skills: []
  }, master), /unverified/);
});

test('paraphrased school and job titles are grounded to original master lines', () => {
  const source = `Avery Smith
avery@example.com
EDUCATION
University of Toronto
Bachelor of Applied Science in Computer Engineering | 2027
EXPERIENCE
Embedded Software Design Engineer Intern
Northstar Systems | Burlington | 2025-2026
- Developed C++ software integrating Linux firmware and FPGA subsystems.
- Improved internal testing scripts to reduce manual reporting time from 40 minutes to 10 minutes.
PROJECTS
Resume Builder Platform
React, Node.js, Gemini
- Built a web app for generating and downloading resumes.
SKILLS
C++, Python, React`;
  const tailored = cleanTailored({
    name:'Avery Smith',
    education:[{title:'Computer Engineering at University of Toronto',meta:'BASc in CE, graduating 2027',bullets:[]}],
    experience:[{title:'Embedded Systems Engineering Intern',meta:'Northstar Systems in Burlington',bullets:[{source:'Developed C++ software integrating Linux firmware and FPGA subsystems.', text:'Developed C++ software integrating Linux firmware and FPGA subsystems.'}]}],
    projects:[{title:'Resume Builder App',meta:'React, Node.js and Gemini',bullets:[{source:'Built a web app for generating and downloading resumes.',text:'Built a resume generation website with React.'}]}],
    skills:[{source:'C++, Python, React',text:'C++, Python, React'}]
  },source);
  assert.equal(tailored.education[0].title,'University of Toronto');
  assert.equal(tailored.experience[0].title,'Embedded Software Design Engineer Intern');
  assert.equal(tailored.projects[0].title,'Resume Builder Platform');
  assert.equal(tailored.education[0].meta,'Bachelor of Applied Science in Computer Engineering | 2027');
  assert.equal(tailored.experience[0].bullets[0].text,'Developed C++ software integrating Linux firmware and FPGA subsystems.');
});

test('no new metric can appear in a Gemini-reworded bullet', () => {
  const masterText = `Avery Smith\nEDUCATION\nUniversity of Toronto\nComputer Engineering\nEXPERIENCE\nData Analyst Intern\n- Reduced reporting from 40 minutes to 10 minutes using Python.\nPROJECTS\nWebsite\n- Built a website using React.\nSKILLS\nPython, React`;
  const result = cleanTailored({
    name:'Avery Smith', education:[{title:'University of Toronto',meta:'Computer Engineering',bullets:[]}],
    experience:[{title:'Data Analyst Intern',meta:'',bullets:[{source:'Reduced reporting from 40 minutes to 10 minutes using Python.',text:'Reduced reporting from 40 minutes to 5 minutes using Python.'}]}],
    projects:[{title:'Website',meta:'',bullets:[{source:'Built a website using React.',text:'Built a website using React.'}]}],skills:[]
  },masterText);
  assert.equal(result.experience[0].bullets[0].text,'Reduced reporting from 40 minutes to 10 minutes using Python.');
});
