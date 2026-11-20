import { PDFDocument, PDFName, PDFString, StandardFonts, rgb } from 'pdf-lib';
import { cleanContactLine, matchingProjectLink, linkInfo } from '../../../shared/resume-links.mjs';

// Single-column US Letter layouts with predictable baseline spacing.
// Every line is measured before it is drawn; no absolute positioning is used
// for body copy, so long descriptions cannot overlap the next section.
const W = 612, H = 792, M = 47, CONTENT = W - 2 * M;
const INK = rgb(.13, .17, .17);
const MUTED = rgb(.39, .43, .42);
const FOREST = rgb(.10, .24, .21);
const RUST = rgb(.77, .31, .17);
const SAND = rgb(.95, .94, .91);
const WHITE = rgb(1,1,1);
const HAIR = rgb(.79,.80,.77);
const STYLES = {
  modern: { kind:'modern', font:'sans', bold:'sansBold', accent:FOREST, ink:INK },
  classic: { kind:'classic', font:'serif', bold:'serifBold', accent:INK, ink:INK },
  editorial: { kind:'editorial', font:'sans', bold:'sansBold', accent:RUST, ink:INK }
};

export function printable(value = '') {
  return String(value).replace(/[\u2010-\u2015]/g, '-').replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"').replace(/[\u2022\u25CF\u25AA]/g, '-')
    .replace(/\u00a0/g, ' ').replace(/[^\x20-\x7E\xA0-\xFF]/g, '?').trim();
}

function wrap(value, font, size, maxWidth) {
  const result = [];
  const words = printable(value).replace(/\s+/g, ' ').split(' ').filter(Boolean);
  let line = '';
  for (let word of words) {
    while (font.widthOfTextAtSize(word,size) > maxWidth) {
      if (line) { result.push(line); line=''; }
      let n=1;
      while (n < word.length && font.widthOfTextAtSize(word.slice(0,n+1),size) <= maxWidth) n++;
      result.push(word.slice(0,n));
      word = word.slice(n);
    }
    if (!word) continue;
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next,size) <= maxWidth) line = next;
    else { if (line) result.push(line); line = word; }
  }
  if (line) result.push(line);
  return result;
}

function layout(resume, fonts, template, bodySize, density = 1) {
  const style = STYLES[template], blocks = [];
  const bodyLeading = bodySize * 1.36 * density;
  let y = H - 47;
  const step = n => { y -= n * density; };
  const text = (value, x, baseline, font, size, color, url = null) => {
    if (!value) return;
    blocks.push({ type:'text', text:printable(value), x, y:baseline, font, sz:size, color, url });
  };
  const fill = (x, top, width, height, color) => blocks.push({type:'rect',x,top,width,height,color});
  const rule = (yy,color=HAIR,thickness=.6,begin=M,end=W-M) => blocks.push({type:'rule',y:yy,color,thickness,begin,end});
  const paragraph = (value, {x=M,width=CONTENT,font=style.font,size=bodySize,color=style.ink,
    leading=bodyLeading,align='left',after=0,url=null}={}) => {
    for (const part of wrap(value,fonts[font],size,width)) {
      const xx=align==='center' ? (W-fonts[font].widthOfTextAtSize(part,size))/2 : x;
      text(part,xx,y,font,size,color,url);
      y -= leading;
    }
    step(after);
  };
  const linkList = (items,{center=false,color=MUTED,font=style.font,size=8.5}={}) => {
    const unique=items.slice(0,4);
    const SEP='   |   ';
    const total=unique.reduce((sum,v)=>sum+fonts[font].widthOfTextAtSize(v.label,size),0)+Math.max(0,unique.length-1)*fonts[font].widthOfTextAtSize(SEP,size);
    if(!unique.length)return;
    if(total>CONTENT-5) {
      unique.forEach(v=>paragraph(v.label,{font,size,color,align:center?'center':'left',url:v.url,leading:size*1.23}));
    } else {
      let xx=center?(W-total)/2:M;
      unique.forEach((v,i)=>{
        if(i){text(SEP,xx,y,font,size,color);xx+=fonts[font].widthOfTextAtSize(SEP,size);}
        text(v.label,xx,y,font,size,color,v.url);xx+=fonts[font].widthOfTextAtSize(v.label,size);
      });
      y-=size*1.29;
    }
  };
  const contact = cleanContactLine(resume.contact);
  const headerLinks = (resume.linkItems||[]).map(l=>({ ...linkInfo(l.url), ...l })).filter(l => l.kind==='profile'||l.kind==='website');

  if(template==='modern'){
    const header = {type:'rect',x:0,top:H,width:W,height:0,color:FOREST};
    blocks.push(header);
    blocks.push({type:'rect',x:0,top:H,width:6,height:0,color:RUST});
    paragraph(resume.name,{font:'sansBold',size:20.5,color:WHITE,leading:25,after:8});
    if(contact)paragraph(contact,{size:8.8,color:WHITE,leading:11.7,after:4});
    linkList(headerLinks,{color:WHITE,size:8.5});
    const height=Math.max(94,H-y+17);
    header.height=height; blocks[1].height=height;
    y=H-height-17;
  }else if(template==='classic'){
    paragraph(resume.name,{font:'serifBold',size:21.8,align:'center',leading:25,after:8});
    if(contact)paragraph(contact,{size:8.9,color:MUTED,align:'center',leading:11.2,after:4});
    linkList(headerLinks,{center:true,color:INK,size:8.4});
    step(6); rule(y,INK,.9); step(10);
  }else{
    fill(M,H-19,58,3,RUST);
    paragraph(resume.name.toUpperCase(),{font:'sansBold',size:20.4,color:INK,leading:25,after:8});
    if(contact)paragraph(contact,{size:8.8,color:MUTED,leading:11.5,after:4});
    linkList(headerLinks,{color:RUST,size:8.5});
    step(6);rule(y,INK,1);step(9);
  }

  // Every heading reserves explicit room for the label, decoration, and
  // subsequent text. The old baseline/underline arithmetic caused collisions.
  const section = (name) => {
    const label=name.toUpperCase();
    if(template==='classic'){
      step(10);
      rule(y+4,HAIR,.65);
      step(13);
      paragraph(label,{font:'serifBold',size:bodySize+1.1,color:INK,
        align:'center',leading:bodySize+5.4});
      step(8);
    } else if(template==='editorial'){
      step(13);
      const barHeight=24;
      fill(M,y+10,CONTENT,barHeight,SAND);
      fill(M,y+10,3,barHeight,RUST);
      text(label,M+12,y-6,'sansBold',bodySize+.45,FOREST);
      y-=barHeight+8;
    } else {
      step(13);
      fill(M,y+4,3,15,RUST);
      text(label,M+12,y,'sansBold',bodySize+.8,FOREST);
      rule(y-7,HAIR,.55,M+12,W-M);
      step(23);
    }
  };

  const entry = (item, kind='experience') => {
    const rawTitle=printable(item.title||'');
    // Keep the job/school name prominent; move employer, location and dates
    // from pipe-separated source lines to a clean secondary line.
    const pieces=rawTitle.split(/\s*\|\s*/).filter(Boolean);
    const title=pieces[0]||rawTitle;
    const fromTitle=pieces.slice(1).join(' | ');
    const separateMeta=printable(item.meta||'');
    const meta=[fromTitle,separateMeta].filter((v,i,a)=>v && (i===0 || !a[0].includes(v))).join(' | ');

    const projectLink=kind==='projects' ? matchingProjectLink(title.split('|')[0],resume.linkItems||[]) : null;
    const titleSize=bodySize+.30;
    const metaSize=Math.max(9.1,bodySize-1.0);
    const urlText=projectLink ? (projectLink.platform==='github'?'GitHub': 'Project link') : '';
    const linkWidth=urlText?fonts[style.font].widthOfTextAtSize(urlText,8.4):0;
    const available=CONTENT-(linkWidth?linkWidth+18:0);
    const titleRows=wrap(title,fonts[style.bold],titleSize,available);
    for(const [i,t] of titleRows.entries()) {
      text(t,M,y,style.bold,titleSize,INK);
      if(i===0&&projectLink)text(urlText,W-M-linkWidth,y,style.font,8.4,RUST,projectLink.url);
      y-=titleSize*1.36*density;
    }
    if(meta)paragraph(meta,{font:style.font,size:metaSize,color:MUTED,leading:metaSize*1.32*density,after:5});
    (item.bullets||[]).forEach(b=>{
      const bullets=wrap(b.text,fonts[style.font],bodySize,CONTENT-18);
      for(const [i,fragment] of bullets.entries()){
        if(i===0)text('-',M+2,y,style.font,bodySize,MUTED);
        text(fragment,M+17,y,style.font,bodySize,INK);
        y-=bodyLeading;
      }
      step(3);
    });
    step(7);
  };
  if(resume.summary?.text){section('Profile');paragraph(resume.summary.text,{after:4});}
  section('Education');(resume.education||[]).forEach(e=>entry(e,'education'));
  section('Experience');(resume.experience||[]).forEach(e=>entry(e,'experience'));
  section('Projects');(resume.projects||[]).forEach(e=>entry(e,'projects'));
  if(resume.skills?.length){
    section('Technical Skills');
    for(const item of resume.skills)paragraph(item.text,{after:4});
  }
  return {blocks,bottom:y,contentHeight:H-y};
}

const clone=value=>JSON.parse(JSON.stringify(value));
function trimLeastRelevant(resume) {
  // Extras are appended in relevance order by the server. Trim the lowest
  // priority *excess* first. Preserve the leading role, project and education.
  if(resume.skills?.length>3){resume.skills.pop();return true;}
  for(const part of ['projects','experience','education']) {
    for(let i=resume[part].length-1;i>=0;i--){
      if(resume[part][i].bullets?.length> (i===0?2:1)){
        resume[part][i].bullets.pop();return true;
      }
    }
  }
  for(const part of ['projects','experience','education']){
    if(resume[part].length> (part==='education'?1:2)){
      resume[part].pop();return true;
    }
  }
  if(resume.skills?.length>1){resume.skills.pop();return true;}
  if(resume.summary?.text){resume.summary=null;return true;}
  for(const part of ['projects','experience']){
    if(resume[part].length>1){resume[part].pop();return true;}
  }
  return false;
}
function addLink(doc,page,b,font) {
  const width=font.widthOfTextAtSize(b.text,b.sz);
  const node=doc.context.obj({Type:'Annot',Subtype:'Link',Rect:[b.x,b.y-2,b.x+width,b.y+b.sz+2],Border:[0,0,0],A:{Type:'Action',S:'URI',URI:PDFString.of(b.url)}});
  const ref=doc.context.register(node);
  const annots=page.node.Annots();
  if(annots)doc.context.lookup(annots).push(ref);
  else page.node.set(PDFName.of('Annots'),doc.context.obj([ref]));
}

export async function buildResumePdf(source,template) {
  if(!source||!STYLES[template])throw new Error('Choose a valid resume template.');
  const doc=await PDFDocument.create();
  const fonts={
    sans:await doc.embedFont(StandardFonts.Helvetica), sansBold:await doc.embedFont(StandardFonts.HelveticaBold),
    serif:await doc.embedFont(StandardFonts.TimesRoman),serifBold:await doc.embedFont(StandardFonts.TimesRomanBold)
  };
  // Assemble the one-page document from supported material, rather than
  // generating an oversized document and deleting its entire tail. This is
  // what allows unused, less-relevant master-resume content to fill gaps.
  const full=clone(source);
  const starters={...full,education:[],experience:[],projects:[],skills:[]};
  for(const key of ['education','experience','projects']){
    if(full[key]?.length){
      const item=clone(full[key][0]);
      item.bullets=(item.bullets||[]).slice(0,1);
      starters[key]=[item];
    }
  }
  if(full.skills?.length)starters.skills=full.skills.slice(0,1);
  const additions=[];
  const addBullet=(key,index,b)=>additions.push({type:'bullet',key,index,bullet:b});
  const addEntry=(key,index)=>additions.push({type:'entry',key,index});
  const addSkill=(index)=>additions.push({type:'skill',index});
  // Keep the best-fitting evidence prominent. Additional roles/projects come
  // before distant lower-value bullet points; every item is source-grounded.
  // First aim for a balanced resume: two experience entries and two projects,
  // each with useful evidence, before spending the page on a single position.
  for(const key of ['experience','projects'])if(full[key]?.length>1)addEntry(key,1);
  for(const key of ['experience','projects']){
    (full[key]?.[0]?.bullets||[]).slice(1,2).forEach(b=>addBullet(key,0,b));
  }
  for(const key of ['experience','projects']){
    (full[key]?.[0]?.bullets||[]).slice(2,4).forEach(b=>addBullet(key,0,b));
  }
  for(const key of ['experience','projects']){
    (full[key]?.[1]?.bullets||[]).slice(1,4).forEach(b=>addBullet(key,1,b));
  }
  (full.education?.[0]?.bullets||[]).slice(1,3).forEach(b=>addBullet('education',0,b));
  (full.skills||[]).slice(1,4).forEach((_,i)=>addSkill(i+1));
  for(const key of ['experience','projects']){
    for(let i=2;i<(full[key]?.length||0);i++){
      addEntry(key,i);
      (full[key][i].bullets||[]).slice(1,3).forEach(b=>addBullet(key,i,b));
    }
  }
  for(const key of ['experience','projects']){
    for(let i=0;i<(full[key]?.length||0);i++){
      (full[key][i].bullets||[]).slice(i===0?4:i===1?4:3).forEach(b=>addBullet(key,i,b));
    }
  }
  (full.education?.[0]?.bullets||[]).slice(3).forEach(b=>addBullet('education',0,b));
  (full.skills||[]).slice(4).forEach((_,i)=>addSkill(i+4));
  for(let i=1;i<(full.education?.length||0);i++){
    addEntry('education',i);
    (full.education[i].bullets||[]).slice(1).forEach(b=>addBullet('education',i,b));
  }

  function tryVariant(size,rhythm){
    const chosen=clone(starters);
    let measured=layout(chosen,fonts,template,size,rhythm);
    if(measured.bottom<48)return null;
    for(const addition of additions){
      const draft=clone(chosen);
      const {type,key,index,bullet}=addition;
      if(type==='entry'){
        if(draft[key].length!==index)continue;
        const entry=clone(full[key][index]);
        entry.bullets=(entry.bullets||[]).slice(0,1);
        draft[key].push(entry);
      } else if(type==='bullet'){
        if(!draft[key]?.[index])continue;
        draft[key][index].bullets??=[];
        if(draft[key][index].bullets.some(b=>b.source===bullet.source))continue;
        draft[key][index].bullets.push(bullet);
      } else if(type==='skill'){
        if(full.skills[index])draft.skills.push(full.skills[index]);
      }
      const next=layout(draft,fonts,template,size,rhythm);
      if(next.bottom>=48){
        Object.assign(chosen,draft);
        measured=next;
      }
    }
    const totalBullets=Object.values(full).filter(Array.isArray)
      .flatMap(a=>a).reduce((sum,e)=>sum+(Array.isArray(e.bullets)?e.bullets.length:0),0);
    const usedBullets=['education','experience','projects'].flatMap(k=>chosen[k])
      .reduce((sum,e)=>sum+(e.bullets?.length||0),0);
    return {measured,unused:Math.max(0,totalBullets-usedBullets),size};
  }
  const variants=[[11.0,1.07],[10.8,1.04],[10.6,1.02],[10.35,1],[10.1,.99],[9.85,.98],[9.75,.97]];
  let best=null;
  for(const [size,rhythm] of variants){
    const option=tryVariant(size,rhythm);
    if(!option)continue;
    if(!best || option.measured.contentHeight>best.measured.contentHeight+22)best=option;
    if(option.measured.bottom<=110){best=option;break;}
  }
  if(!best || best.measured.contentHeight<560){
    throw new Error('There is not enough information in the master resume to fill out a full templated resume.');
  }
  const result=best.measured, removedBullets=best.unused;
  const page=doc.addPage([W,H]);
  for(const b of result.blocks) {
    if(b.type==='rect')page.drawRectangle({x:b.x,y:b.top-b.height,width:b.width,height:b.height,color:b.color});
    else if(b.type==='rule')page.drawLine({start:{x:b.begin,y:b.y},end:{x:b.end,y:b.y},thickness:b.thickness,color:b.color});
    else if(b.type==='link')addLink(doc,page,b,fonts[b.font]);
    else {
      page.drawText(b.text,{x:b.x,y:b.y,size:b.sz,font:fonts[b.font],color:b.color});
      if(b.url)addLink(doc,page,b,fonts[b.font]);
    }
  }
  doc.setTitle(`${source.name} | ApplyPilot tailored resume`);
  doc.setCreator('ApplyPilot');
  return {blob:new Blob([await doc.save()],{type:'application/pdf'}),removedBullets,pages:doc.getPageCount()};
}
