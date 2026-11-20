/** Deterministic recovery of unused, user-written source material.
 * Gemini ranks the content. This function can only add exact phrases from the
 * user's master; it never invents achievements to make a resume look longer.
 */
import { normalized } from './validation.mjs';
const HEADING = {
  education:/^(education|academic background|academic history|academic qualifications)\s*:?$/i,
  experience:/^(professional |work |relevant |employment |internship |volunteer )?experience\s*:?$|^(employment history|work history)\s*:?$/i,
  projects:/^(projects|selected projects|academic projects|personal projects|technical projects|relevant projects|project experience)\s*:?$/i,
  skills:/^(skills|technical skills)\s*:?$/i
};
const OTHER=/^(?:summary of qualifications|summary|profile|technical competences|technical competencies|tools\/frameworks|contact|certifications|awards|activities|links from master resume|links from original pdf)\s*:?$/i;
const BULLET=/^\s*(?:[-*•▪●]|\d+[.)])\s+/;
const stripBullet=x=>x.replace(BULLET,'').trim();
const truncate=(s,n=280)=>String(s||'').slice(0,n).trim();
function tidy(value){
  return String(value||'')
    .replace(/\bCompleted\s+\d+\s*(?:st|nd|rd|th)?\s*(?:year)?\b/gi,'')
    .replace(/^\s*(?:st|nd|rd|th)\s*year\s*$/gi,'')
    .replace(/\b(?:Expected |Exp\.? )?(?:Graduation|Graduating)\s*:?\s*(?=\||$)/gi,'')
    .replace(/\s*\|\s*\|\s*/g,' | ').replace(/\s*\|\s*$/,'')
    .replace(/\s{2,}/g,' ').trim();
}
export { tidy };

export function catalogMaster(master) {
  const sections={education:[],experience:[],projects:[],skills:[]};
  const raw={education:[],experience:[],projects:[],skills:[]};
  let part=null;
  for (const original of String(master||'').split(/\r?\n/)) {
    const line=original.trim();
    const next=Object.keys(HEADING).find(k=>HEADING[k].test(line));
    if (next) {part=next;continue;}
    if (OTHER.test(line)) {part=null;continue;}
    if(part)raw[part].push(line);
  }
  sections.skills=raw.skills.filter(Boolean).slice(0,15).map(x=>({source:x,text:x}));
  for (const field of ['education','experience','projects']) {
    let current=null;
    const push=()=>{
      if(!current)return;
      const head=current.head.map(tidy).filter(Boolean);
      const bullets=current.bullets.map(tidy).filter(Boolean);
      if(head.length)sections[field].push({title:truncate(head[0],180),meta:truncate(head.slice(1).join(' | '),320),bullets:bullets.map(t=>({source:t,text:t}))});
      current=null;
    };
    for (const line of raw[field]) {
      if(!line) {if(current?.bullets.length)push();continue;}
      if(BULLET.test(line)) {
        if(!current)current={head:[],bullets:[]};
        current.bullets.push(stripBullet(line));
      } else if(current?.bullets.length && /^[a-z(]/.test(line)) {
        // Soft wrap from a PDF text layer, not a new job or project.
        current.bullets[current.bullets.length-1]+=' '+line;
      } else if(current?.bullets.length) {
        push();current={head:[line],bullets:[]};
      } else {
        if(!current)current={head:[],bullets:[]};
        current.head.push(line);
      }
    }
    push();
  }
  return sections;
}

const tokens=s=>new Set(normalized(s).split(' ').filter(w=>w.length>2&&!['with','from','using','into','that','this','team','and'].includes(w)));
const matches=(a,b)=>{
  const left=tokens(a),right=tokens(b);
  if(!left.size||!right.size)return 0;
  let same=0;for(const t of left)if(right.has(t))same++;
  return same/Math.min(left.size,right.size);
};
const relevant=(item, posting)=>{
  const wanted=tokens(posting);
  const text=[item.title,item.meta,...(item.bullets||[]).map(b=>b.text)].join(' ');
  let score=0;for(const t of tokens(text))if(wanted.has(t))score++;
  return score;
};

/** Add overlooked role/project entries and bullets, most job-relevant first.
 * PDF rendering later trims lower-priority lines if necessary.
 */
export function backfillFromMaster(tailored,master,posting=''){
  const catalog=catalogMaster(master);
  const result=structuredClone(tailored);
  for(const field of ['education','experience','projects']) {
    for(const item of result[field]||[]) {
      item.title=tidy(item.title);item.meta=tidy(item.meta);
    }
  }
  for(const field of ['experience','projects','education']){
    result[field]??=[];
    const existing=new Set(result[field].flatMap(item=>(item.bullets||[]).map(b=>normalized(b.source||b.text))));
    const leftovers=[];
    for(const original of catalog[field]){
      if(!original.title)continue;
      const match=result[field].find(item=>matches(item.title,original.title)>.68 || matches(item.meta,original.title)>.82);
      // Avoid duplicating an achievement already present under another entry.
      const spare=original.bullets.filter(b=>!existing.has(normalized(b.text)) && b.text.length>18);
      if(match){
        match.bullets??=[];
        for(const b of spare){
          if(match.bullets.some(x=>matches(x.source||x.text,b.text)>.92))continue;
          match.bullets.push(b);existing.add(normalized(b.text));
        }
      } else {
        leftovers.push({...original,bullets:spare});
        spare.forEach(b=>existing.add(normalized(b.text)));
      }
    }
    leftovers.sort((a,b)=>relevant(b,posting)-relevant(a,posting));
    result[field].push(...leftovers);
  }
  if(!result.skills?.length)result.skills=catalog.skills.slice(0,5);
  else {
    const existing=new Set(result.skills.map(s=>normalized(s.text)));
    for(const skill of catalog.skills){
      if(!existing.has(normalized(skill.text))){result.skills.push(skill);existing.add(normalized(skill.text));}
    }
  }
  return result;
}
