"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./psle-companion.module.css";
import { questions, sprintPlan, topics, type Question } from "./question-bank";

type Panel = "guide" | "paper" | "sync" | null;
type Rating = "unreviewed" | "wrong" | "unsure" | "correct";
type Attempt = { questionId:string; topicId:string; correct:boolean; guessed:boolean; selectedIndex:number; at:string };
type JournalEntry = { id:string; questionId:string; topicId:string; concept:string; prompt:string; selected:string; correct:string; explanation:string; trap:string; at:string };
type SavedProgress = { startDate:string; attempts:Attempt[]; journal:JournalEntry[] };
type UploadRow = { id:string; name:string; kind:string; status:string; progress:number; pages?:number; error?:string };
type DetectedItem = { id:string; sourceName:string; text:string; topicIds:string[]; rating:Rating };
type ImportPreview = { progress:SavedProgress; importedAttempts:number; duplicateAttempts:number; mergedAttempts:number; importedJournal:number; mergedJournal:number; sourceDate?:string };

const PROGRESS_KEY = "futureplus-psle-science-mcq-coach-v1";
const PAPER_SIGNAL_KEY = "futureplus-psle-paper-signals-v1";
const MAX_FILES = 10;
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_PDF_PAGES = 16;

const TOPIC_HINTS: Record<string,string[]> = {
  living:["living","non-living","organism","bacteria","fungi","mushroom","mould","classification","characteristic","respond","reproduce"],
  materials:["material","waterproof","flexible","strength","strong","transparent","translucent","opaque","float","sink","property"],
  lifecycles:["life cycle","egg","larva","pupa","nymph","adult","young","metamorphosis"],
  magnets:["magnet","magnetic","north pole","south pole","attract","repel","repulsion"],
  plantparts:["root","stem","leaf","leaves","plant part","anchor"],
  digestion:["digest","digestion","mouth","gullet","stomach","small intestine","large intestine","undigested"],
  matter:["solid","liquid","gas","melting","freezing","condensation","evaporation","state of matter"],
  light:["light","shadow","reflection","reflect","ray","opaque","luminous","straight line"],
  heat:["heat","temperature","hotter","colder","conductor","insulator","expand","contract","thermal"],
  reproduction:["pollination","pollen","anther","stigma","fertilisation","fertilization","seed dispersal","germination","inherited"],
  water:["water cycle","evaporation","condensation","boiling","freezing point","water vapour","rain","cloud"],
  planttransport:["water-carrying","food-carrying","transport in plants","coloured water","stem tubes","roots to leaves"],
  humansystems:["respiratory","circulatory","lungs","windpipe","heart","blood vessel","oxygen","carbon dioxide","blood"],
  electricity:["circuit","battery","bulb","switch","wire","current","conductor","insulator","series","parallel","electric"],
  photosynthesis:["photosynthesis","chlorophyll","carbon dioxide","oxygen","make food","green leaf","light energy","respiration"],
  energy:["kinetic","potential","energy conversion","electrical energy","sound energy","light energy","heat energy","conservation of energy"],
  forces:["force","friction","gravity","gravitational","spring","elastic","push","pull","extension"],
  environment:["food chain","food web","population","community","habitat","adaptation","predator","prey","conservation","environment"]
};

const GUIDE_INTRO = [
  "Welcome to the eighteen day Science MCQ experiment. This is not about doing as many questions as possible. It is about finding exactly why marks are being lost, fixing that pattern, and checking that the fix stays.",
  "On day one, take the thirty question baseline without hints. Work calmly and mark I am not sure whenever an answer is a guess. That confidence signal is important because a lucky correct answer is not yet a secure answer.",
  "After every practice session, open Mistake Lab. For each mistake, explain which wrong option looked tempting and why it is wrong. If you can explain the trap, you are repairing the reasoning, not memorising an answer.",
  "From days two to ten, follow the topic plan. Day eleven trains distractor traps. Day twelve focuses on experiments and evidence. Days thirteen and fourteen rescue the weakest topics. Days fifteen to eighteen use timed mocks, journal review, and a calm final simulation.",
  "A good daily routine is about thirty minutes: two minutes to hear the plan, twenty to twenty five minutes of questions, then five minutes explaining two mistakes aloud. Accuracy comes before speed.",
  "When you upload a marked paper or a photo, Paper Lab can extract text on this device, suggest the Science topics, and let you confirm which questions were wrong or uncertain. It then creates a targeted rescue pack using original practice questions from this app.",
  "Your goal is not perfection on day one. Your goal is to make the same kind of mistake less often each time. When your secure accuracy rises, you are ready for the next level."
];

function isoDate(date = new Date()) { return date.toISOString().slice(0,10); }
function safeProgress(): SavedProgress {
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    if (!raw) return { startDate: isoDate(), attempts: [], journal: [] };
    const parsed = JSON.parse(raw);
    return {
      startDate: typeof parsed?.startDate === "string" ? parsed.startDate : isoDate(),
      attempts: Array.isArray(parsed?.attempts) ? parsed.attempts : [],
      journal: Array.isArray(parsed?.journal) ? parsed.journal : []
    };
  } catch { return { startDate: isoDate(), attempts: [], journal: [] }; }
}
function earliestDate(a:string,b:string){return a && b ? (a < b ? a : b) : (a || b || isoDate());}
function shuffle<T>(items:T[]):T[]{const copy=[...items];for(let i=copy.length-1;i>0;i-=1){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}return copy;}
function cleanText(text:string){return text.replace(/\u0000/g," ").replace(/[ \t]+/g," ").replace(/\n{3,}/g,"\n\n").trim();}
function shortText(text:string,max=520){const value=cleanText(text);return value.length>max?`${value.slice(0,max)}…`:value;}
function classifyTopics(text:string){
  const lower=` ${text.toLowerCase()} `;
  const scores=Object.entries(TOPIC_HINTS).map(([topicId,hints])=>({topicId,score:hints.reduce((sum,hint)=>sum+(lower.includes(hint.toLowerCase())?1:0),0)}));
  return scores.filter(item=>item.score>0).sort((a,b)=>b.score-a.score).slice(0,3).map(item=>item.topicId);
}
function splitDetectedText(text:string,sourceName:string){
  const value=cleanText(text);
  if(!value)return [] as DetectedItem[];
  const chunks=value.split(/(?=(?:^|\n)\s*(?:question\s*)?\d{1,2}[\.)]\s+)/i).map(item=>cleanText(item)).filter(item=>item.length>45);
  const usable=chunks.length>=2?chunks:value.split(/\n\s*\n/).map(item=>cleanText(item)).filter(item=>item.length>80);
  const finalChunks=(usable.length?usable:[value]).slice(0,50);
  return finalChunks.map((chunk,index)=>({id:`${Date.now()}-${Math.random().toString(36).slice(2)}-${index}`,sourceName,text:shortText(chunk),topicIds:classifyTopics(chunk),rating:"unreviewed" as Rating}));
}
function mergeProgress(current:SavedProgress,incoming:SavedProgress):ImportPreview{
  const attemptMap=new Map<string,Attempt>();
  current.attempts.forEach(item=>attemptMap.set(`${item.questionId}|${item.selectedIndex}|${item.at}`,item));
  let duplicates=0;
  incoming.attempts.forEach(item=>{const key=`${item.questionId}|${item.selectedIndex}|${item.at}`;if(attemptMap.has(key))duplicates+=1;else attemptMap.set(key,item);});
  const mergedAttempts=[...attemptMap.values()].sort((a,b)=>a.at.localeCompare(b.at)).slice(-2000);
  const journalMap=new Map<string,JournalEntry>();
  [...current.journal,...incoming.journal].forEach(entry=>{const existing=journalMap.get(entry.questionId);if(!existing||entry.at>existing.at)journalMap.set(entry.questionId,entry);});
  const mergedJournal=[...journalMap.values()].sort((a,b)=>b.at.localeCompare(a.at)).slice(0,150);
  return {
    progress:{startDate:earliestDate(current.startDate,incoming.startDate),attempts:mergedAttempts,journal:mergedJournal},
    importedAttempts:incoming.attempts.length,
    duplicateAttempts:duplicates,
    mergedAttempts:mergedAttempts.length,
    importedJournal:incoming.journal.length,
    mergedJournal:mergedJournal.length,
    sourceDate:incoming.startDate
  };
}

export default function PSLECompanion(){
  const [panel,setPanel]=useState<Panel>(null);
  const [guideDay,setGuideDay]=useState(1);
  const [speaking,setSpeaking]=useState(false);
  const [uploads,setUploads]=useState<UploadRow[]>([]);
  const [detected,setDetected]=useState<DetectedItem[]>([]);
  const [processing,setProcessing]=useState(false);
  const [paperMessage,setPaperMessage]=useState("");
  const [importPreview,setImportPreview]=useState<ImportPreview|null>(null);
  const [syncMessage,setSyncMessage]=useState("");
  const [rescue,setRescue]=useState<Question[]>([]);
  const [rescueIndex,setRescueIndex]=useState(0);
  const [rescueSelected,setRescueSelected]=useState<number|null>(null);
  const [rescueChecked,setRescueChecked]=useState(false);
  const [rescueCorrect,setRescueCorrect]=useState(0);
  const [rescueDone,setRescueDone]=useState(false);
  const uploadInput=useRef<HTMLInputElement>(null);
  const syncInput=useRef<HTMLInputElement>(null);

  useEffect(()=>()=>{if(typeof window!=="undefined"&&"speechSynthesis" in window)window.speechSynthesis.cancel();},[]);

  const weakness=useMemo(()=>topics.map(topic=>{
    const rows=detected.filter(item=>item.topicIds.includes(topic.id));
    const wrong=rows.filter(item=>item.rating==="wrong").length;
    const unsure=rows.filter(item=>item.rating==="unsure").length;
    const correct=rows.filter(item=>item.rating==="correct").length;
    return {...topic,wrong,unsure,correct,score:wrong*3+unsure*1.5};
  }).sort((a,b)=>b.score-a.score||b.wrong-a.wrong),[detected]);
  const topWeak=weakness.filter(item=>item.score>0).slice(0,4);
  const reviewedCount=detected.filter(item=>item.rating!=="unreviewed").length;
  const currentRescue=rescue[rescueIndex];

  useEffect(()=>{
    if(!topWeak.length)return;
    try{window.localStorage.setItem(PAPER_SIGNAL_KEY,JSON.stringify({updatedAt:new Date().toISOString(),topics:topWeak.map(item=>({topicId:item.id,score:item.score,wrong:item.wrong,unsure:item.unsure}))}));}catch{}
  },[topWeak]);

  function speak(text:string){
    if(typeof window==="undefined"||!("speechSynthesis" in window)){setSyncMessage("Speech is not supported by this browser.");return;}
    window.speechSynthesis.cancel();
    const utterance=new SpeechSynthesisUtterance(text);
    const voices=window.speechSynthesis.getVoices();
    const preferred=["Sonia","Serena","Google UK English Female","Samantha","Aria","Ava","Zira","English United Kingdom"];
    const voice=preferred.map(name=>voices.find(item=>item.name.toLowerCase().includes(name.toLowerCase()))).find(Boolean) || voices.find(item=>item.lang?.toLowerCase().startsWith("en-gb")) || voices.find(item=>item.lang?.toLowerCase().startsWith("en"));
    if(voice)utterance.voice=voice;
    utterance.rate=.82;utterance.pitch=1;utterance.volume=.95;
    utterance.onend=()=>setSpeaking(false);utterance.onerror=()=>setSpeaking(false);
    setSpeaking(true);window.speechSynthesis.speak(utterance);
  }
  function stopSpeaking(){if("speechSynthesis" in window)window.speechSynthesis.cancel();setSpeaking(false);}
  function speakFullGuide(){speak(GUIDE_INTRO.join(" "));}
  function speakDay(day:number){const item=sprintPlan[day-1];speak(`Day ${day}. ${item.title}. ${item.task}. Focus on ${item.focus}`);}

  function exportProgress(){
    const progress=safeProgress();
    const envelope={schema:"futureplus-psle-progress",version:1,exportedAt:new Date().toISOString(),progress,paperSignals:(()=>{try{return JSON.parse(window.localStorage.getItem(PAPER_SIGNAL_KEY)||"null");}catch{return null;}})()};
    const blob=new Blob([JSON.stringify(envelope,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`PSLE-Science-progress-${isoDate()}.json`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);setSyncMessage("Progress file exported. Move it to the other device, then use Import & Merge.");
  }
  async function previewImport(file:File){
    setSyncMessage("");setImportPreview(null);
    try{
      const raw=await file.text();const parsed=JSON.parse(raw);const candidate=parsed?.schema==="futureplus-psle-progress"?parsed.progress:parsed;
      if(!candidate||!Array.isArray(candidate.attempts)||!Array.isArray(candidate.journal))throw new Error("This does not look like a PSLE Science progress file.");
      const incoming:SavedProgress={startDate:typeof candidate.startDate==="string"?candidate.startDate:isoDate(),attempts:candidate.attempts,journal:candidate.journal};
      setImportPreview(mergeProgress(safeProgress(),incoming));
    }catch(error){setSyncMessage(error instanceof Error?error.message:"Could not read this JSON file.");}
  }
  function applyImport(){if(!importPreview)return;try{window.localStorage.setItem(PROGRESS_KEY,JSON.stringify(importPreview.progress));setSyncMessage("Merge complete. Reloading the coach with the combined progress…");window.setTimeout(()=>window.location.reload(),650);}catch{setSyncMessage("The browser blocked local storage. The merge was not applied.");}}

  function updateUpload(id:string,patch:Partial<UploadRow>){setUploads(rows=>rows.map(row=>row.id===id?{...row,...patch}:row));}
  async function handleFiles(fileList:FileList|null){
    if(!fileList?.length)return;
    const files=Array.from(fileList).slice(0,MAX_FILES);
    setPaperMessage("");setProcessing(true);
    const rows=files.map((file,index)=>({id:`u-${Date.now()}-${index}`,name:file.name,kind:file.type||"file",status:"Queued",progress:0}));
    setUploads(rows);
    let worker:any=null;
    try{
      const needsOcr=files.some(file=>file.type.startsWith("image/")||file.type==="application/pdf");
      if(needsOcr){const tesseract=await import("tesseract.js");worker=await tesseract.createWorker("eng");}
      for(let index=0;index<files.length;index+=1){
        const file=files[index];const row=rows[index];
        if(file.size>MAX_FILE_BYTES){updateUpload(row.id,{status:"Skipped",error:"File is larger than 20 MB."});continue;}
        updateUpload(row.id,{status:"Reading",progress:8});
        let extracted="";let pages=1;
        try{
          if(file.type.startsWith("image/")){
            updateUpload(row.id,{status:"Reading photo with local OCR",progress:20});
            const result=await worker.recognize(file,{}, {text:true});
            extracted=result?.data?.text||"";
            updateUpload(row.id,{progress:90});
          }else if(file.type==="application/pdf"||file.name.toLowerCase().endsWith(".pdf")){
            const pdfjs=await import("pdfjs-dist/legacy/build/pdf.mjs");
            pdfjs.GlobalWorkerOptions.workerSrc=`https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
            const data=new Uint8Array(await file.arrayBuffer());
            const pdf=await pdfjs.getDocument({data}).promise;pages=Math.min(pdf.numPages,MAX_PDF_PAGES);
            const pageTexts:string[]=[];
            for(let pageNo=1;pageNo<=pages;pageNo+=1){
              updateUpload(row.id,{status:`Analysing PDF page ${pageNo}/${pages}`,pages,progress:10+Math.round((pageNo-1)/pages*78)});
              const page=await pdf.getPage(pageNo);const content=await page.getTextContent();
              const selectable=content.items.map((item:any)=>("str" in item?item.str:"")).join(" ").trim();
              if(selectable.length>80){pageTexts.push(`Question page ${pageNo}\n${selectable}`);continue;}
              const viewport=page.getViewport({scale:1.35});const canvas=document.createElement("canvas");const ctx=canvas.getContext("2d");
              if(!ctx)continue;canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
              await page.render({canvasContext:ctx,viewport}).promise;
              const result=await worker.recognize(canvas,{}, {text:true});pageTexts.push(`Question page ${pageNo}\n${result?.data?.text||""}`);
            }
            extracted=pageTexts.join("\n\n");
          }else{throw new Error("Use a PDF, JPG, PNG or WEBP file.");}
          const items=splitDetectedText(extracted,file.name);
          setDetected(existing=>[...existing,...items]);
          updateUpload(row.id,{status:items.length?`Ready · ${items.length} detected section${items.length===1?"":"s"}`:"Ready · needs manual topic tagging",progress:100,pages});
        }catch(error){updateUpload(row.id,{status:"Could not analyse",error:error instanceof Error?error.message:"Unknown file error",progress:100});}
      }
      setPaperMessage("Review the detected sections below. Tap Wrong or Unsure only where the student actually lost certainty or marks; then generate the rescue pack.");
    }catch(error){setPaperMessage(error instanceof Error?`OCR could not start: ${error.message}`:"OCR could not start on this browser.");}
    finally{if(worker)try{await worker.terminate();}catch{}setProcessing(false);if(uploadInput.current)uploadInput.current.value="";}
  }
  function setRating(id:string,rating:Rating){setDetected(items=>items.map(item=>item.id===id?{...item,rating}:item));}
  function toggleTopic(id:string,topicId:string){setDetected(items=>items.map(item=>item.id===id?{...item,topicIds:item.topicIds.includes(topicId)?item.topicIds.filter(value=>value!==topicId):[...item.topicIds,topicId].slice(-3)}:item));}
  function clearPaperLab(){setUploads([]);setDetected([]);setRescue([]);setPaperMessage("");setRescueDone(false);try{window.localStorage.removeItem(PAPER_SIGNAL_KEY);}catch{}}
  function generateRescue(){
    if(!topWeak.length){setPaperMessage("Mark at least one detected section as Wrong or Unsure first. That signal is what turns the paper into a targeted pack.");return;}
    const chosen:Question[]=[];
    topWeak.forEach(topic=>{const count=topic.wrong>0?4:2;chosen.push(...shuffle(questions.filter(q=>q.topicId===topic.id)).slice(0,count));});
    if(chosen.length<12){const weakIds=topWeak.map(item=>item.id);chosen.push(...shuffle(questions.filter(q=>weakIds.includes(q.topicId)&&!chosen.some(c=>c.id===q.id))).slice(0,12-chosen.length));}
    setRescue(shuffle(chosen).slice(0,12));setRescueIndex(0);setRescueSelected(null);setRescueChecked(false);setRescueCorrect(0);setRescueDone(false);
  }
  function recordRescueAnswer(){
    if(rescueSelected===null||!currentRescue||rescueChecked)return;
    const correct=rescueSelected===currentRescue.correctIndex;const now=new Date().toISOString();
    const saved=safeProgress();const attempt:Attempt={questionId:currentRescue.id,topicId:currentRescue.topicId,correct,guessed:false,selectedIndex:rescueSelected,at:now};
    const nextJournal=!correct?[{id:`paper-${currentRescue.id}-${now}`,questionId:currentRescue.id,topicId:currentRescue.topicId,concept:currentRescue.concept,prompt:currentRescue.stem,selected:currentRescue.options[rescueSelected],correct:currentRescue.options[currentRescue.correctIndex],explanation:currentRescue.explanation,trap:currentRescue.trap,at:now},...saved.journal.filter(entry=>entry.questionId!==currentRescue.id)].slice(0,150):saved.journal;
    try{window.localStorage.setItem(PROGRESS_KEY,JSON.stringify({...saved,attempts:[...saved.attempts,attempt].slice(-2000),journal:nextJournal}));}catch{}
    if(correct)setRescueCorrect(value=>value+1);setRescueChecked(true);
  }
  function nextRescue(){if(rescueIndex>=rescue.length-1){setRescueDone(true);return;}setRescueIndex(value=>value+1);setRescueSelected(null);setRescueChecked(false);}

  return <>
    <div className={styles.launcher} aria-label="PSLE experiment tools">
      <button onClick={()=>setPanel("guide")}><span>🔊</span><b>18-Day Guide</b><small>Hear the next step</small></button>
      <button onClick={()=>setPanel("paper")}><span>📄</span><b>Paper Lab</b><small>PDFs & photos</small></button>
      <button onClick={()=>setPanel("sync")}><span>🔄</span><b>Device Sync</b><small>JSON merge</small></button>
    </div>

    {panel&&<div className={styles.backdrop} role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget){stopSpeaking();setPanel(null);}}}>
      <section className={styles.modal} role="dialog" aria-modal="true" aria-label={panel==="guide"?"18 day guide":panel==="paper"?"Paper Lab":"Device sync"}>
        <div className={styles.modalTop}><div><span className={styles.kicker}>{panel==="guide"?"START HERE":panel==="paper"?"LOCAL PAPER ANALYSIS":"NO-LOGIN DEVICE TRANSFER"}</span><h2>{panel==="guide"?"How to run the 18-day MCQ experiment":panel==="paper"?"Paper Lab":"Export, import and merge progress"}</h2></div><button className={styles.close} onClick={()=>{stopSpeaking();setPanel(null);}} aria-label="Close">×</button></div>

        {panel==="guide"&&<div className={styles.guideBody}>
          <div className={styles.speakerCard}><div><span className={styles.speakerIcon}>🎧</span><div><strong>A calm spoken walkthrough</strong><p>Uses an English voice already available on this device. Playback is deliberately slower than normal conversation.</p></div></div><div className={styles.speakerActions}>{speaking?<button onClick={stopSpeaking}>■ Stop</button>:<button onClick={speakFullGuide}>▶ Play full introduction</button>}</div></div>
          <div className={styles.protocolGrid}><article><span>1</span><strong>Keep the experiment consistent</strong><p>Use the same browser when possible. Do not clear browsing data. For another device, use JSON Export / Import & Merge.</p></article><article><span>2</span><strong>Day 1 is a baseline, not a judgement</strong><p>Take the 30-question mock without hints. Mark “I’m not sure” whenever an answer is a guess.</p></article><article><span>3</span><strong>Review reasoning immediately</strong><p>Spend 5–10 minutes in Mistake Lab. Explain why the tempting distractor was wrong.</p></article><article><span>4</span><strong>Daily routine: about 30 minutes</strong><p>2 min plan → 20–25 min practice → 5 min explaining two mistakes aloud. Accuracy before speed.</p></article></div>
          <div className={styles.dayPicker}><div><strong>Pick today’s day</strong><p>Tap a day, then let the guide read the task aloud.</p></div><div className={styles.dayButtons}>{sprintPlan.map(item=><button key={item.day} className={guideDay===item.day?styles.dayActive:""} onClick={()=>setGuideDay(item.day)}>{item.day}</button>)}</div></div>
          <article className={styles.dayCard}><div><span>DAY {guideDay}</span><button onClick={()=>speakDay(guideDay)}>🔊 Hear this step</button></div><h3>{sprintPlan[guideDay-1].title}</h3><strong>{sprintPlan[guideDay-1].task}</strong><p>{sprintPlan[guideDay-1].focus}</p>{guideDay===1&&<aside><b>How to start today</b><ol><li>Choose a quiet 45-minute window.</li><li>Start the 30-question Booklet A simulation from Mission Control.</li><li>Do not look up answers during the baseline.</li><li>Use “I’m not sure” for every uncertain answer—even if it turns out correct.</li><li>When finished, review Mistake Lab and explain two traps aloud.</li></ol></aside>}</article>
          <div className={styles.experimentRules}><h3>What counts as improvement?</h3><div><p><b>Raw accuracy</b> tells you how many were correct.</p><p><b>Secure accuracy</b> is more important: correct without guessing.</p><p><b>Recurring mistake type</b> should fall: concept gap, misread condition, distractor trap, or rushed/careless choice.</p><p><b>Final target</b> is stable reasoning under timed conditions—not one lucky high score.</p></div></div>
        </div>}

        {panel==="sync"&&<div className={styles.syncBody}>
          <div className={styles.syncGrid}><article><span>1</span><h3>Export from Device A</h3><p>Creates a small JSON file containing attempts, confidence signals and Mistake Lab entries. It does not contain uploaded paper images.</p><button onClick={exportProgress}>Export progress JSON</button></article><article><span>2</span><h3>Move the file</h3><p>Send it to the other device using AirDrop, Drive, email to yourself or any method you already use.</p></article><article><span>3</span><h3>Import on Device B</h3><p>The app previews the merge first. Existing progress is not overwritten blindly.</p><button onClick={()=>syncInput.current?.click()}>Import & preview merge</button><input ref={syncInput} type="file" accept="application/json,.json" hidden onChange={event=>{const file=event.target.files?.[0];if(file)previewImport(file);event.currentTarget.value="";}}/></article></div>
          {importPreview&&<div className={styles.mergePreview}><span>MERGE PREVIEW</span><h3>Safe to combine</h3><div><p><b>{importPreview.importedAttempts}</b><small>attempts in imported file</small></p><p><b>{importPreview.duplicateAttempts}</b><small>duplicates ignored</small></p><p><b>{importPreview.mergedAttempts}</b><small>unique attempts after merge</small></p><p><b>{importPreview.mergedJournal}</b><small>Mistake Lab items after merge</small></p></div><button onClick={applyImport}>Apply merge & reload coach</button></div>}
          {syncMessage&&<p className={styles.message}>{syncMessage}</p>}
          <div className={styles.privacyBox}><strong>Privacy model</strong><p>No account is required. The JSON is a portable copy of the browser progress. The app does not upload that file anywhere when importing it.</p></div>
        </div>}

        {panel==="paper"&&<div className={styles.paperBody}>
          {!rescue.length&&<>
            <div className={styles.uploadZone} onClick={()=>!processing&&uploadInput.current?.click()}><span>📚</span><h3>{processing?"Analysing on this device…":"Add a marked paper, CamScanner PDF or photos"}</h3><p>Choose up to {MAX_FILES} PDF/JPG/PNG/WEBP files in one go. Text extraction and OCR run in your browser; paper files are not stored by the app.</p><button disabled={processing}>{processing?"Please wait…":"Choose papers / photos"}</button><input ref={uploadInput} type="file" multiple hidden accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp" onChange={event=>handleFiles(event.target.files)}/><small>Tip: clear, straight photos give the best OCR. First-time OCR may take longer because the browser downloads the recognition engine.</small></div>
            {uploads.length>0&&<div className={styles.uploadList}>{uploads.map(row=><article key={row.id}><div><strong>{row.name}</strong><span>{row.status}</span>{row.error&&<em>{row.error}</em>}</div><div className={styles.fileProgress}><i style={{width:`${row.progress}%`}}/></div></article>)}</div>}
            {paperMessage&&<p className={styles.message}>{paperMessage}</p>}
            {detected.length>0&&<>
              <div className={styles.reviewHeader}><div><span className={styles.kicker}>HUMAN CHECKPOINT</span><h3>Confirm what actually went wrong</h3><p>OCR can identify likely topics, but it cannot reliably interpret every handwritten tick, circle or teacher mark. Confirm Wrong / Unsure / Correct below before using the weakness analysis.</p></div><div><b>{reviewedCount}/{detected.length}</b><small>sections reviewed</small></div></div>
              <div className={styles.detectedList}>{detected.map((item,index)=><article key={item.id} className={styles.detectedCard}><div className={styles.detectedTop}><span>#{index+1} · {item.sourceName}</span><div className={styles.ratingButtons}><button className={item.rating==="wrong"?styles.ratingWrong:""} onClick={()=>setRating(item.id,"wrong")}>✕ Wrong</button><button className={item.rating==="unsure"?styles.ratingUnsure:""} onClick={()=>setRating(item.id,"unsure")}>? Unsure</button><button className={item.rating==="correct"?styles.ratingCorrect:""} onClick={()=>setRating(item.id,"correct")}>✓ Correct</button></div></div><p>{item.text}</p><div className={styles.topicTags}><small>Likely topic — tap to correct:</small><div>{topics.map(topic=><button key={topic.id} className={item.topicIds.includes(topic.id)?styles.topicOn:""} onClick={()=>toggleTopic(item.id,topic.id)} title={topic.title}>{topic.icon} {topic.shortTitle}</button>)}</div></div></article>)}</div>
            </>}
            {topWeak.length>0&&<div className={styles.analysisBox}><div><span className={styles.kicker}>WEAKNESS GRID</span><h3>Paper-derived rescue priorities</h3></div><div className={styles.weakRows}>{topWeak.map((topic,index)=><article key={topic.id}><b>{index+1}</b><span>{topic.icon}</span><div><strong>{topic.shortTitle}</strong><small>{topic.wrong} wrong · {topic.unsure} unsure</small></div><em>{topic.score.toFixed(1)}</em></article>)}</div><div className={styles.improvementPack}><h4>3-step improvement pack</h4><p><b>Concept reset:</b> Re-read the concept fix for the top two weak areas and explain each in your own words.</p><p><b>Rescue test:</b> Take the 12-question targeted pack below. Questions are original app questions selected from the weak topics—not copied from the uploaded paper.</p><p><b>Spaced check:</b> Re-test the same topics tomorrow. A correct-but-guessed answer still needs another pass.</p></div><button className={styles.generateButton} onClick={generateRescue}>Generate 12-question Paper Rescue Pack →</button></div>}
            {(uploads.length>0||detected.length>0)&&<button className={styles.clearButton} onClick={clearPaperLab}>Clear Paper Lab session</button>}
          </>}

          {rescue.length>0&&!rescueDone&&currentRescue&&<div className={styles.rescueQuiz}><div className={styles.rescueBar}><button onClick={()=>setRescue([])}>← Back to analysis</button><span>Paper Rescue Pack</span><strong>{rescueIndex+1}/{rescue.length}</strong></div><div className={styles.rescueProgress}><i style={{width:`${((rescueIndex+(rescueChecked?1:0))/rescue.length)*100}%`}}/></div><span className={styles.rescueTopic}>{topics.find(t=>t.id===currentRescue.topicId)?.icon} {topics.find(t=>t.id===currentRescue.topicId)?.shortTitle} · {currentRescue.concept}</span><h3>{currentRescue.stem}</h3><div className={styles.rescueOptions}>{currentRescue.options.map((option,index)=>{const isCorrect=rescueChecked&&index===currentRescue.correctIndex;const isWrong=rescueChecked&&rescueSelected===index&&index!==currentRescue.correctIndex;return <button key={option} className={`${rescueSelected===index?styles.rescueSelected:""} ${isCorrect?styles.rescueRight:""} ${isWrong?styles.rescueWrong:""}`} disabled={rescueChecked} onClick={()=>setRescueSelected(index)}><b>{String.fromCharCode(65+index)}</b><span>{option}</span></button>;})}</div>{!rescueChecked?<button className={styles.generateButton} disabled={rescueSelected===null} onClick={recordRescueAnswer}>Check answer</button>:<div className={styles.rescueFeedback}><strong>{rescueSelected===currentRescue.correctIndex?"✅ Secure this reasoning":"🧩 Useful correction"}</strong><p>{currentRescue.explanation}</p><aside><b>Trap:</b> {currentRescue.trap}</aside><button className={styles.generateButton} onClick={nextRescue}>{rescueIndex===rescue.length-1?"Finish pack":"Next question →"}</button></div>}</div>}
          {rescueDone&&<div className={styles.rescueResult}><span>🎯</span><h3>{rescueCorrect}/{rescue.length}</h3><p>The rescue attempts have been added to the same local progress used by Mission Control and Mistake Lab.</p><button onClick={()=>window.location.reload()}>Return to Mission Control with updated progress</button><button className={styles.clearButton} onClick={()=>{setRescue([]);setRescueDone(false);}}>Back to Paper Lab analysis</button></div>}
          <div className={styles.copyrightNote}><strong>Past-paper boundary</strong><p>The app may analyse papers that you upload for personal study, but it does not publish or add those questions to the shared question bank. Targeted follow-up questions come from the app’s original practice bank.</p></div>
        </div>}
      </section>
    </div>}
  </>;
}
