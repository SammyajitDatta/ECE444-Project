import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown, ArrowRight, ArrowUpRight, BadgeCheck, BriefcaseBusiness, Check, CheckCircle2,
  ChevronDown, CircleAlert, Download, ExternalLink, FileCheck2, FileText,
  FileUp, Github, Link2, LoaderCircle, LockKeyhole, Mail, Menu, PencilLine, RotateCcw,
  ShieldCheck, Sparkles, WandSparkles, X
} from 'lucide-react';
import { buildResumePdf } from './lib/pdf.js';
import { extractResumeLinks, organizeMasterText } from '../../shared/resume-links.mjs';

const TEMPLATES = [
  { id: 'modern', number: '01', title: 'Masthead', tag: 'Confident & structured', description: 'Forest-green header, crisp lettering, and warm copper details.', swatch: 'indigo' },
  { id: 'classic', number: '02', title: 'Heritage', tag: 'Traditional & elegant', description: 'Centered serif headings, fine rules, and a quiet monochrome look.', swatch: 'stone' },
  { id: 'editorial', number: '03', title: 'Typeset', tag: 'Editorial & striking', description: 'Large nameplate, structured sand-colored sections, copper accents.', swatch: 'teal' }
];
const MIN_WORDS = 130;

function validate(text) {
  const lines = text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  const has = (rx) => lines.some(x=>rx.test(x));
  const firstHeading = lines.findIndex(x=>/^(education|experience|work experience|professional experience|projects|skills|summary|profile|contact)\s*:?$/i.test(x));
  const names = lines.slice(0, firstHeading >= 0 ? firstHeading : 3).slice(0,3);
  const name = names.some(x=>/^[\p{L}][\p{L}.'’\-]*(?:\s+[\p{L}][\p{L}.'’\-]*){1,4}$/u.test(x) && x.length<=80);
  const checks = [
    {name:'Applicant name',ok:name},
    {name:'Education',ok:has(/^(education|academic background|academic history|academic qualifications)\s*:?$/i)},
    {name:'Experience',ok:has(/^(professional |work |relevant |employment |internship |volunteer )?experience\s*:?$/i)||has(/^(employment history|work history)\s*:?$/i)},
    {name:'Projects',ok:has(/^(projects|selected projects|academic projects|personal projects|technical projects|relevant projects|project experience)\s*:?$/i)}
  ];
  const words=(text.trim().match(/\b[\p{L}\p{N}][\p{L}\p{N}'’-]*\b/gu)||[]).length;
  return {checks,valid:checks.every(c=>c.ok),words,tooLong:text.length>42000};
}
function Status({type='info',children}){
  const Icon=type==='good'?CheckCircle2:type==='error'?CircleAlert:ShieldCheck;
  return <div className={`status-note status-${type}`} role={type==='error'?'alert':'status'}><Icon size={17}/><span>{children}</span></div>;
}
function SectionTitle({number,kicker,title,subtitle,id}){
  return <div className="section-title" id={id}>
    <span className="section-index">{number}</span><div className="section-title-text"><div className="section-kicker">{kicker}</div><h2>{title}</h2><p>{subtitle}</p></div>
  </div>;
}
function ResumeCard({style}){
  return <div className={`paper-preview paper-${style}`} aria-hidden="true">
    <div className="paper-name">LAST FIRST</div>
    <div className="paper-contact">Toronto · first.last@example.com · linkedin.com/in/profile</div>
    <div className="paper-section">EDUCATION</div>
    <div className="paper-bold">University of Toronto</div><div className="paper-line wide"/>
    <div className="paper-section">EXPERIENCE</div>
    <div className="paper-bold">Software Engineering Intern</div>
    <div className="paper-line wide"/><div className="paper-line medium"/><div className="paper-line wide"/><div className="paper-line short"/>
    <div className="paper-section">PROJECTS</div>
    <div className="paper-bold">Campus Route Planner</div>
    <div className="paper-line wide"/><div className="paper-line medium"/>
    <div className="paper-section">TECHNICAL SKILLS</div>
    <div className="paper-line wide"/><div className="paper-line medium"/>
  </div>;
}

export default function App(){
  const [master,setMaster]=useState('');
  const [filename,setFilename]=useState('');
  const [template,setTemplate]=useState('modern');
  const [job,setJob]=useState('');
  const [parseNote,setParseNote]=useState('');
  const [error,setError]=useState('');
  const [uploading,setUploading]=useState(false);
  const [generating,setGenerating]=useState(false);
  const [resume,setResume]=useState(null);
  const [pdfBlob,setPdfBlob]=useState(null);
  const [preview,setPreview]=useState('');
  const [trimmed,setTrimmed]=useState(0);
  const [menu,setMenu]=useState(false);
  const fileInput=useRef(null), currentUrl=useRef(''), active=useRef(false);
  const resultsRef=useRef(null);
  const validation=useMemo(()=>validate(master),[master]);
  const linkItems=useMemo(()=>extractResumeLinks(master),[master]);
  const ready=validation.valid&&!validation.tooLong;
  const canGenerate=ready&&validation.words>=MIN_WORDS&&job.trim().length>0&&job.length<=20000&&!uploading&&!generating;
  // Do not restore any demo or stale data from previous versions.
  // Reload always opens a clean, blank workspace; nothing is saved automatically.
  useEffect(() => {
    try {
      for (const key of ['master', 'filename', 'job', 'template']) {
        localStorage.removeItem(`applypilot:${key}`);
      }
    } catch { /* private mode may block localStorage */ }
  }, []);
  useEffect(()=>()=>{if(currentUrl.current)URL.revokeObjectURL(currentUrl.current);},[]);

  function resetOutput(){setResume(null);setPdfBlob(null);setTrimmed(0);setPreview('');if(currentUrl.current){URL.revokeObjectURL(currentUrl.current);currentUrl.current='';}}
  function updateMaster(value){setMaster(value);setError('');resetOutput();}
  function updateJob(value){setJob(value);setError('');resetOutput();}
  async function request(endpoint,options){
    let res;try{res=await fetch(endpoint,options);}catch{throw new Error('Cannot reach the ApplyPilot server. Run npm run dev from the project root.');}
    const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.error||'An unexpected error occurred.');return data;
  }
  async function uploadPdf(event){
    const file=event.target.files?.[0];event.target.value='';if(!file)return;
    if(!/\.pdf$/i.test(file.name)||file.size>10*1024*1024){setError('Choose a PDF file no larger than 10 MB.');return;}
    const form=new FormData();form.append('file',file);
    setUploading(true);setError('');setParseNote('');
    try {
      const data=await request('/api/parse-resume',{method:'POST',body:form});
      updateMaster(organizeMasterText(data.text).text);setFilename(file.name);setParseNote(data.note||'Resume imported. Review the information before continuing.');
    }catch(e){setError(e.message);}finally{setUploading(false);}
  }
  async function renderPdf(data,variant){
    const generated=await buildResumePdf({...data,linkItems},variant);
    if(generated.pages!==1)throw new Error('The PDF did not fit on one page.');
    const url=URL.createObjectURL(generated.blob);
    if(currentUrl.current)URL.revokeObjectURL(currentUrl.current);
    currentUrl.current=url;setPreview(url);setPdfBlob(generated.blob);setTrimmed(generated.removedBullets);
  }
  async function chooseTemplate(value){
    setError('');
    if (!resume) { setTemplate(value); return; }
    try {
      // Keep the previous generated preview if this alternate layout fails.
      await renderPdf(resume,value);
      setTemplate(value);
    } catch(e) { setError(e.message); }
  }
  async function generate(){
    if(!canGenerate||active.current)return;
    active.current=true;setGenerating(true);setError('');resetOutput();
    try {
      const data=await request('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({master,posting:job})});
      await renderPdf(data.resume,template);setResume(data.resume);
      setTimeout(()=>resultsRef.current?.scrollIntoView({behavior:'smooth',block:'start'}),120);
    }catch(e){setError(e.message);}finally{active.current=false;setGenerating(false);}
  }
  function download(){
    if(!pdfBlob)return;
    const url=URL.createObjectURL(pdfBlob),a=document.createElement('a');
    a.href=url;a.download=`${(resume?.name||'Applicant').replace(/[^a-z0-9]/gi,'')}Resume.pdf`;a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
  function clearWorkspace(){updateMaster('');updateJob('');setFilename('');setParseNote('');setTemplate('modern');setError('');}
  const nav=[{id:'profile',label:'Profile',complete:ready},{id:'templates',label:'Templates',complete:true},{id:'job-posting',label:'Job posting',complete:!!job.trim()},{id:'output',label:'Your resume',complete:!!resume}];
  return <div className="app">
    <header className="site-header"><div className="header-inner">
      <a href="#top" className="logo" aria-label="ApplyPilot home"><span className="logo-mark"><WandSparkles size={19} strokeWidth={2.3}/></span>apply<span>pilot</span><span className="beta-tag">BETA</span></a>
      <nav className={menu?'nav show':'nav'} aria-label="Page sections">{nav.map((n,i)=><a key={n.id} href={`#${n.id}`} onClick={()=>setMenu(false)}><span className={n.complete?'nav-dot done':'nav-dot'}>{n.complete?<Check size={10}/>:i+1}</span>{n.label}</a>)}</nav>
      <div className="header-end"><span className="header-badge"><ShieldCheck size={16}/> Based on your experience</span><button className="mobile-menu" type="button" onClick={()=>setMenu(!menu)} aria-label={menu?'Close menu':'Open menu'}>{menu?<X/>:<Menu/>}</button></div>
    </div></header>

    <div id="top" className="page-content">
      <section className="hero"><div className="hero-copy">
        <div className="eyebrow"><span className="eyebrow-spark">✳</span> A BETTER WAY TO PUT YOUR WORK ON PAPER</div>
        <h1>Good work deserves<br/><span>a better introduction.</span></h1>
        <p>One master resume. A job you want. A clean, tailored PDF that actually sounds like you. No made-up experience, no unnecessary fluff.</p>
        <div className="hero-actions"><a href="#profile" className="hero-cta">Get started <ArrowRight size={18}/></a><span><BadgeCheck size={18}/> Text-first. Single-page. Built to be read.</span></div>
      </div><div className="hero-art" aria-hidden="true"><div className="art-orbit one"/><div className="art-orbit two"/><div className="art-back-paper"/><div className="art-paper"><div className="art-page-top"><div className="art-head"/><div className="art-head-small"/></div><div className="art-heading"/><div className="art-line"/><div className="art-line narrow"/><div className="art-heading"/><div className="art-line"/><div className="art-line"/><div className="art-line narrow"/><div className="art-heading"/><div className="art-line"/><div className="art-line narrow"/></div><div className="art-spark top">✳</div><div className="art-spark bottom">✦</div><div className="art-floating"><Check size={15}/> Your next draft</div></div></section>

      <div className="section-overline"><span>YOUR WORKSPACE / FOUR STEPS</span><div/></div>
      <section className="stage" id="profile"><SectionTitle number="01" kicker="01 / YOUR STORY" title="Start with the full story" subtitle="Your experience is the source material. Type it from scratch or import a PDF, then check every detail."/>
        <div className="master-layout"><div className="panel editor-panel">
          <div className="panel-header"><div className="panel-icon"><FileText size={22}/></div><div><h3>Your original resume</h3><p>Untouched until you enter or upload something.</p></div><span className="saved-indicator"><span/> Private working session</span></div>
          <div className="upload-strip"><div className="upload-symbol"><FileUp size={22}/></div><div className="upload-text"><strong>{filename||'Already have a resume?'}</strong><span>{filename?'Upload again to replace your master information.':'Import your PDF. Clickable URLs are preserved where available.'}</span></div><button type="button" className="secondary-btn" disabled={uploading} onClick={()=>fileInput.current?.click()}>{uploading?<><LoaderCircle size={16} className="spin"/> Reading…</>:<>Upload PDF <ArrowUpRight size={15}/></>}</button><input ref={fileInput} type="file" hidden accept=".pdf,application/pdf" onChange={uploadPdf}/></div>
          {parseNote&&<Status>{parseNote}</Status>}
          <div className="editor-label-row"><label htmlFor="master-entry">Master resume editor</label><span>{validation.words.toLocaleString()} words</span></div>
          <textarea id="master-entry" className="master-editor" spellCheck="false" value={master} onChange={e=>updateMaster(e.target.value)} onBlur={()=>{const organized=organizeMasterText(master);if(organized.text!==master)updateMaster(organized.text);}} placeholder="Your master resume is empty. Type your information here, or upload a PDF above. Include your name and EDUCATION, EXPERIENCE and PROJECTS sections."/>
          <div className="editor-bottom"><span><LockKeyhole size={14}/> Not saved between visits</span><div className="editor-actions"><button type="button" className="text-btn clear-btn" onClick={clearWorkspace} disabled={!master&&!job&&!filename}><RotateCcw size={15}/> Clear all fields</button></div></div>
        </div>
        <aside className="master-side">
          <div className="panel readiness-panel"><div className="readiness-heading"><div className="panel-icon check-icon"><FileCheck2 size={20}/></div><div><h3>Profile checklist</h3><p>Complete all four to continue</p></div></div>
            <div className="completion-track"><div style={{width:`${validation.checks.filter(x=>x.ok).length*25}%`}}/></div><div className="completion-label">{validation.checks.filter(x=>x.ok).length} of 4 requirements met</div>
            <div className="checklist">{validation.checks.map(item=><div className="check-row" key={item.name}><span className={item.ok?'check-circle completed':'check-circle'}>{item.ok?<Check size={13}/>:<span/>}</span><span>{item.name}</span><span className="check-status">{item.ok?'Added':'Missing'}</span></div>)}</div>
            {ready&&validation.words>=MIN_WORDS?<Status type="good">Profile ready to tailor.</Status>:<div className="check-hint"><CircleAlert size={16}/>{!ready?'Add the missing information to unlock the next step.':`Add more detail: ${MIN_WORDS} master-resume words are required to attempt a full-page result.`}</div>}
            {validation.tooLong&&<Status type="error">Maximum 42,000 characters.</Status>}
          </div>
          <div className="panel links-panel"><div className="links-heading"><Link2 size={19}/><div><h3>Links we found</h3><p>Click to verify they're correct</p></div></div>
            {linkItems.length?<div className="link-list">{linkItems.map(l=><a href={l.url} target="_blank" rel="noopener noreferrer" key={l.url}><span className="link-icon"><ExternalLink size={14}/></span><span><strong>{l.kind==='project'?`Project · ${l.label}`:l.label}</strong><small>{l.url.replace(/^https?:\/\//,'')}</small></span><ArrowUpRight size={15}/></a>)}</div>:<div className="empty-links">Profile and project links from your PDF or manual resume will appear here.</div>}
            <p className="links-help">URLs are collected in LINKS FROM MASTER RESUME, below the editor text. General links go in the PDF header; repository links sit beside matching projects.</p>
          </div>
        </aside></div>
      </section>

      <section className="stage" id="templates"><SectionTitle number="02" kicker="02 / THE DESIGN" title="Choose the layout" subtitle="Three distinct directions, one rule: easy-to-read, searchable PDF text. Pick a layout that fits your style."/>
        <div className="template-cards" role="radiogroup" aria-label="Resume design template">{TEMPLATES.map(t=><button key={t.id} type="button" className={`template-card ${template===t.id?'selected':''}`} role="radio" aria-checked={template===t.id} onClick={()=>chooseTemplate(t.id)}>
          <div className={`template-canvas canvas-${t.swatch}`}><div className="paper-holder"><ResumeCard style={t.id}/></div><div className="template-number">{t.number} / 03</div></div>
          <div className="template-details"><div><div className="template-name-row"><h3>{t.title}</h3>{template===t.id&&<span className="selected-label"><Check size={13}/> Selected</span>}</div><span className="template-tagline">{t.tag}</span><p>{t.description}</p></div><span className={template===t.id?'radio-visual chosen':'radio-visual'}>{template===t.id&&<Check size={14}/>}</span></div>
        </button>)}</div>
        <div className="template-footnote"><ShieldCheck size={17}/> All formats use selectable text, simple reading order, and standard PDF pages. ATS compatibility varies by employer and parsing system.</div>
      </section>

      <section className="stage" id="job-posting"><SectionTitle number="03" kicker="03 / THE ROLE" title="Now, the job posting" subtitle="Paste the real requirements. We'll select supporting experience from what you've actually done."/>
        <div className="job-layout"><div className="panel job-card"><div className="job-card-top"><div className="job-top-icon"><BriefcaseBusiness size={21}/></div><div><h3>Job description</h3><p>Manual entry only · Paste the full posting below</p></div><span className="manual-pill"><PencilLine size={13}/> Text input</span></div>
          {!ready&&<Status>Finish the master resume checklist to unlock this field.</Status>}
          <label htmlFor="job-editor" className="field-label">Position details</label>
          <textarea id="job-editor" disabled={!ready||uploading} className="job-editor" value={job} onChange={e=>updateJob(e.target.value)} placeholder="No job posting has been added. Paste the job title, responsibilities, qualifications, and required skills here."/>
          <div className="job-footer"><span>{job.length.toLocaleString()} / 20,000 characters</span><span>{job.trim()?'Job posting added':'Awaiting job posting'}</span></div>
        </div><aside className="job-side"><div className="tip-card"><div className="tip-icon"><Sparkles size={20}/></div><h3>Your experience. On record.</h3><p>No fabricated titles, accomplishments or metrics. Your master resume stays the source, while the role decides what gets the most attention.</p><div className="tip-separator"/><div className="tip-points"><span><Check size={16}/> Prioritizes matching work</span><span><Check size={16}/> Keeps supported qualifications</span><span><Check size={16}/> Leaves unsupported claims out</span></div></div></aside></div>
        <div className="generate-bar"><div><div className="generate-eyebrow">LET'S PUT IT TOGETHER</div><h3>Ready to put it on paper?</h3><p>{!ready?'Complete your master resume to continue.':validation.words<MIN_WORDS?'Add more master resume details before generating.':!job.trim()?'Paste the job description to unlock generation.':'Your experience + the role, refined into one sharp page.'}</p></div><button type="button" className="generate-button" disabled={!canGenerate} onClick={generate}>{generating?<><LoaderCircle size={19} className="spin"/> Tailoring your resume…</>:<><WandSparkles size={19}/> Generate one-page PDF <ArrowRight size={19}/></>}</button></div>
        {error&&<Status type="error">{error}</Status>}
      </section>

      <section className="stage result-stage" id="output" ref={resultsRef}><SectionTitle number="04" kicker="04 / THE DOCUMENT" title="The final draft" subtitle="Read every line before applying. You can change the design without generating new content."/>
        {resume&&preview?<div className="result-layout"><div className="result-sidebar"><div className="result-success"><CheckCircle2 size={22}/><div><h3>Your resume is ready!</h3><p>One page. Tailored to the role.</p></div></div><div className="result-selected"><span>SELECTED DESIGN</span><strong>{TEMPLATES.find(t=>t.id===template)?.title}</strong><p>Try another design above — your resume will update without another Gemini request.</p><a href="#templates" className="text-btn">Change template <ArrowUpRight size={15}/></a></div>{trimmed>0&&<Status>Additional master-resume material was left out to keep the strongest supported information on one readable page.</Status>}<button type="button" className="download-btn" onClick={download}><Download size={19}/> Download PDF</button><p className="result-disclaimer"><ShieldCheck size={15}/> Check every claim and link before submitting. AI edits can make mistakes.</p></div><div className="pdf-container"><div className="pdf-toolbar"><span><span className="pdf-indicator"/> PDF PREVIEW</span><span>1 of 1 pages</span></div><iframe className="pdf-iframe" title="Generated one-page resume preview" src={`${preview}#toolbar=0&navpanes=0&scrollbar=0`}/></div></div>
        :<div className="no-output"><div className="no-output-glow"/><div className="no-output-icon"><FileText size={38}/><span><Sparkles size={17}/></span></div><h3>A blank page, for now.</h3><p>Once you've added your master resume and a job description, the finished PDF will appear here for review.</p><div className="empty-steps"><span><CheckCircle2 size={16}/> Share your experience</span><ArrowRight size={14}/><span><CheckCircle2 size={16}/> Choose your look</span><ArrowRight size={14}/><span><FileCheck2 size={16}/> Get your PDF</span></div></div>}
      </section>
    </div>
    <footer className="footer"><div className="footer-inner"><div className="footer-brand"><span className="logo-mark"><WandSparkles size={16}/></span><strong>apply<span>pilot</span></strong><span>Good work, clearly stated.</span></div><p>Your record of work is the source of truth. <span>© 2026 ApplyPilot</span></p></div></footer>
  </div>;
}
