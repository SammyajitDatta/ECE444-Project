import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { catalogMaster, backfillFromMaster, tidy } from '../lib/backfill.mjs';
const example=readFileSync(new URL('../../samples/Sammyajit_Datta_SYNTHETIC_Master_Resume.txt',import.meta.url),'utf8');
const source=catalogMaster(example);
test('synthetic sample has rich source data in all required sections',()=>{
  assert.ok(source.education.length>=1);
  assert.ok(source.experience.length>=4);
  assert.ok(source.projects.length>=8);
  assert.ok(source.experience[0].bullets.length>=6);
});
test('backfill includes unused source-backed bullets and more roles and projects',()=>{
  const draft={name:'Sammyajit Anindya Datta',contact:'sammyajit.demo@example.com',summary:null,
    education:[{...source.education[0],bullets:[]}],
    experience:[{...source.experience[0],bullets:source.experience[0].bullets.slice(0,1)}],
    projects:[{...source.projects[0],bullets:source.projects[0].bullets.slice(0,1)}],skills:[]};
  const expanded=backfillFromMaster(draft,example,'Embedded Linux C++ systems validation tooling');
  assert.ok(expanded.experience.length>=4);
  assert.ok(expanded.projects.length>=8);
  assert.ok(expanded.experience[0].bullets.length>=6);
  assert.ok(expanded.experience.flatMap(e=>e.bullets).every(b=>example.includes(b.source)));
  assert.ok(expanded.projects.flatMap(e=>e.bullets).every(b=>example.includes(b.source)));
});
test('never turns a broken Completed 3 into a resume claim',()=>{
  assert.equal(tidy('Sep 2022 - Expected May 2027 | Completed 3'),'Sep 2022 - Expected May 2027');
  assert.equal(tidy('Completed 3rd year'),'');
});
