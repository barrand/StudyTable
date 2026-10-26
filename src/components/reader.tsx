'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { TRANSLATIONS, readerUrl, referenceLabel, type Book, type Translation } from '@/lib/books';
import type { Chapter, Verse } from '@/lib/usfm';
import { StudyResultSchema, type StudyAction, type StudyAnswer } from '@/lib/study';

type Selection = { kind: 'chapter' } | { kind: 'verse'; number: number };
const questionCache = new Map<string, StudyAnswer>();
function verseAt(chapter: Chapter, number: number): Verse | undefined { return chapter.verses.find(v=>v.number <= number && (v.endVerse ?? v.number) >= number); }
function VerseText({verse,number}:{verse?:Verse;number:number}) {
  if (!verse || verse.omitted) return <span className="muted omission">Not included in this edition’s verse text.</span>;
  return <>{verse.endVerse && <span className="combined">Combined verses {verse.number}–{verse.endVerse}{number!==verse.number?' (same passage)':''}. </span>}{verse.text}</>;
}

export default function Reader({book,chapters,initialTranslation,initialVerse}:{book:Book;chapters:Record<Translation,Chapter>;initialTranslation?:Translation;initialVerse?:number}) {
  const chapter = chapters.WEB.chapter;
  const [primary,setPrimary] = useState<Translation>(initialTranslation ?? 'WEB');
  const [ready,setReady] = useState(false);
  const [settings,setSettings] = useState(false);
  const [compare,setCompare] = useState(false);
  const [mobileVersion,setMobileVersion] = useState<Translation>(primary);
  const [selection,setSelection] = useState<Selection|null>(null);
  const [answer,setAnswer] = useState<StudyAnswer|null>(null);
  const [error,setError] = useState(''); const [loading,setLoading] = useState(false);
  const [question,setQuestion] = useState('');
  const [visibleViewport,setVisibleViewport]=useState<{height:number;inset:number}|null>(null);
  const [conversation,setConversation] = useState<{question:string;answer:StudyAnswer}[]>([]);
  const conversationToken = useRef<string|undefined>(undefined);
  const closeButton = useRef<HTMLButtonElement>(null);
  const lastTrigger = useRef<HTMLElement|null>(null);
  const pending = useRef<AbortController|null>(null);
  const epoch = useRef(0);
  const sheetBody = useRef<HTMLDivElement>(null);
  const versions: Translation[] = [primary,primary==='WEB'?'KJV':'WEB'];
  const numbers = [...new Set([...chapters.WEB.verses,...chapters.KJV.verses].flatMap(v=>Array.from({length:(v.endVerse ?? v.number)-v.number+1},(_,i)=>v.number+i)))].sort((a,b)=>a-b);
  const selectedRef = {book:book.id,chapter,...(selection?.kind==='verse'?{verse:selection.number}:{})};

  useEffect(()=>{
    const viewport=window.visualViewport;if(!viewport)return;
    const update=()=>{
      setVisibleViewport({height:viewport.height,inset:Math.max(0,window.innerHeight-viewport.height-viewport.offsetTop)});
      requestAnimationFrame(()=>{
        const active=document.activeElement;const body=sheetBody.current;
        if(body&&active instanceof HTMLElement&&body.contains(active)) {
          const field=active.getBoundingClientRect();const bounds=body.getBoundingClientRect();
          if(field.bottom>bounds.bottom)body.scrollTop+=field.bottom-bounds.bottom+8;
          else if(field.top<bounds.top)body.scrollTop-=bounds.top-field.top+8;
        }
      });
    };
    update();viewport.addEventListener('resize',update);viewport.addEventListener('scroll',update);
    return()=>{viewport.removeEventListener('resize',update);viewport.removeEventListener('scroll',update);};
  },[]);

  useEffect(()=>{
    try { const saved = localStorage.getItem('study-table:translation'); if (!initialTranslation && (saved==='WEB'||saved==='KJV')) {setPrimary(saved);setMobileVersion(saved);} } catch { /* Reading works without storage. */ }
    setReady(true);
    if (initialVerse) requestAnimationFrame(()=>document.getElementById(`verse-${initialVerse}`)?.scrollIntoView({block:'center'}));
    return ()=>{pending.current?.abort();};
  },[initialTranslation,initialVerse]);
  useEffect(()=>{if (!ready) return; try {
    localStorage.setItem('study-table:translation',primary);
    localStorage.setItem('study-table:last-read',JSON.stringify({url:readerUrl({book:book.id,chapter,...(initialVerse?{verse:initialVerse}:{})},primary),label:`${book.name} ${chapter}`}));
  } catch { /* Storage is optional. */ }},[ready,primary,book.id,book.name,chapter,initialVerse]);

  function close() { epoch.current++;pending.current?.abort();setSelection(null);setLoading(false);lastTrigger.current?.focus({preventScroll:true}); }
  function select(next: Selection, trigger: HTMLElement) {
    epoch.current++; pending.current?.abort();lastTrigger.current=trigger;
    setAnswer(null);setError('');setQuestion('');setLoading(false);setSelection(next);setSettings(false);setConversation([]);conversationToken.current=undefined;
  }
  useEffect(()=>{
    if (!selection) return;
    closeButton.current?.focus({preventScroll:true}); if (sheetBody.current) sheetBody.current.scrollTop=0;
    function escape(event: KeyboardEvent) {if(event.key==='Escape'){event.preventDefault();close();}}
    document.addEventListener('keydown',escape);
    return ()=>document.removeEventListener('keydown',escape);
  },[selection]); // Selection changes deliberately reset focus, disclosure, and scroll.
  useEffect(()=>{if(selection?.kind==='chapter') void requestStudy('chapter-overview');},[selection]);

  async function requestStudy(action:StudyAction, customQuestion?:string) {
    if (!selection) return;
    pending.current?.abort();const controller=new AbortController();pending.current=controller;
    const requestEpoch=epoch.current;
    const input={reference:referenceLabel(selectedRef),translation:primary,action,...(customQuestion?{question:customQuestion.trim(),...(conversationToken.current?{conversationToken:conversationToken.current}:{})}:{})};
    const key=JSON.stringify(input);
    setError('');setAnswer(null);
    function accept(value:StudyAnswer) {
      if(action==='ask') {setConversation(previous=>[...previous,{question:customQuestion!.trim(),answer:value}].slice(-3));conversationToken.current=value.conversationToken;setQuestion('');setAnswer(null);}
      else setAnswer(value);
    }
    if(action==='ask' && questionCache.has(key)){accept(questionCache.get(key)!);setLoading(false);return;}
    setLoading(true);
    try {
      const response=await fetch('/api/study',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input),signal:controller.signal});
      const data=await response.json();
      if(!response.ok) throw new Error(typeof data.error==='string'?data.error:'Study guidance is unavailable. Please try again.');
      const result=StudyResultSchema.parse(data.result);
      if(data.reference!==input.reference||data.translation!==primary||data.action!==action) throw new Error('The study response did not match your selection. Please try again.');
      const validated={...data,result} as StudyAnswer;
      if(controller.signal.aborted||requestEpoch!==epoch.current)return;
      if(action==='ask'){if(questionCache.size>=40)questionCache.delete(questionCache.keys().next().value!);questionCache.set(key,validated);}
      accept(validated);
    } catch(caught) {
      if(!controller.signal.aborted&&requestEpoch===epoch.current)setError(caught instanceof Error?caught.message:'Study guidance is unavailable.');
    } finally {if(!controller.signal.aborted&&requestEpoch===epoch.current)setLoading(false);}
  }
  function changePrimary(value:Translation) {pending.current?.abort();epoch.current++;setSelection(null);setAnswer(null);setConversation([]);conversationToken.current=undefined;setPrimary(value);setMobileVersion(value);}
  return <>
    <header className="topbar reader-header"><Link className="icon-button" href={`/bible/${book.slug}`} aria-label={`Choose a chapter in ${book.name}`}>‹</Link><span className="brand">{book.name} {chapter}</span><button className="icon-button" aria-label="Settings" aria-expanded={settings} aria-controls="reader-settings" onClick={()=>setSettings(!settings)}>⚙</button>
      {settings&&<section className="settings" id="reader-settings" aria-label="Reader settings"><label htmlFor="primary">Reading translation</label><select id="primary" value={primary} onChange={event=>changePrimary(event.target.value as Translation)}><option value="WEB">World English Bible</option><option value="KJV">King James Version</option></select><label className="checkbox"><input type="checkbox" checked={compare} onChange={event=>setCompare(event.target.checked)}/> Compare the chapter</label><Link href="/search">Find a passage</Link><Link href="/sources">Sources & licenses</Link><small>AI allowance applies to new generations. Saved standard answers are reused.</small><button className="text-button" onClick={()=>setSettings(false)}>Close settings</button></section>}
    </header>
    <main id="main" className={`reader ${compare?'comparison':''}`}>
      <div className="chapter-tools"><button className="overview-button" aria-expanded={selection?.kind==='chapter'} aria-controls="study-panel" onClick={event=>select({kind:'chapter'},event.currentTarget)}><span aria-hidden="true">✦</span> Chapter overview <small>AI</small></button></div>
      {compare&&<><div className="chapter-translation-head" aria-hidden="true">{versions.map(v=><span key={v}>{v} · {TRANSLATIONS[v].name}</span>)}</div><div className="mobile-switch" aria-label="Comparison translation">{versions.map(v=><button key={v} aria-pressed={mobileVersion===v} onClick={()=>setMobileVersion(v)}>{v}</button>)}</div></>}
      <div className="verses">{numbers.map(number=><div className={`verse-row ${selection?.kind==='verse'&&selection.number===number?'selected':''} ${initialVerse===number?'linked-verse':''}`} key={number} id={`verse-${number}`}>
        <button className="verse" aria-label={`Study ${book.name} ${chapter}:${number}`} aria-expanded={selection?.kind==='verse'&&selection.number===number} aria-controls="study-panel" onClick={event=>select({kind:'verse',number},event.currentTarget)}>{compare?<span className="verse-columns">{versions.map(v=><span className={`verse-column ${mobileVersion===v?'mobile-active':''}`} key={v}><sup>{number}</sup><VerseText verse={verseAt(chapters[v],number)} number={number}/></span>)}</span>:<><sup>{number}</sup><VerseText verse={verseAt(chapters[primary],number)} number={number}/></>}</button>
        <a className="verse-external" href={`https://biblehub.com/${book.bibleHub}/${chapter}-${number}.htm`} target="_blank" rel="noreferrer" aria-label={`Open ${book.name} ${chapter}:${number} in Bible Hub (external, new tab)`}>↗</a>
      </div>)}</div>
      <footer className="chapter-footer"><nav aria-label="Chapter navigation">{chapter>1?<Link href={readerUrl({book:book.id,chapter:chapter-1},primary)}>‹ Previous chapter</Link>:<span/>}{chapter<book.chapters&&<Link href={readerUrl({book:book.id,chapter:chapter+1},primary)}>Next chapter ›</Link>}</nav><p>{TRANSLATIONS[primary].name} · {TRANSLATIONS[primary].edition}</p><Link href="/sources">Sources & licenses</Link></footer>
    </main>
    {selection&&<aside className="study-sheet" id="study-panel" aria-labelledby="study-heading" style={visibleViewport?{'--sheet-viewport':`${visibleViewport.height}px`,'--keyboard-inset':`${visibleViewport.inset}px`} as CSSProperties:undefined}><div className="sheet-handle" aria-hidden="true"/><div className="sheet-title"><div><h2 id="study-heading">{selection.kind==='chapter'?'Chapter overview':'Study this verse'}</h2><p className="selected-reference">{referenceLabel(selectedRef)} · {primary}{selection.kind==='chapter'?' · Whole chapter':''}</p></div><button ref={closeButton} className="text-button" onClick={close} aria-label="Close study panel">Close</button></div>
      <div className="sheet-body" ref={sheetBody}>
        {selection.kind==='verse'&&<><details className="translations" key={`${selection.number}-${primary}`}><summary>Translations <small>KJV · WEB</small></summary><div className="translation-cards">{versions.map(v=><section className="translation-card" key={v}><h3>{v}</h3><small>{v===primary?'Reading translation · ':''}{TRANSLATIONS[v].name}</small><p><VerseText verse={verseAt(chapters[v],selection.number)} number={selection.number}/></p></section>)}</div><Link className="translation-license" href="/sources">Translation sources & attribution</Link></details>
        <div className="study-actions">{([['context','Deeper context'],['related','Related verses'],['word-study','Word study']] as const).map(([action,label])=><button key={action} onClick={()=>void requestStudy(action)} disabled={loading}>{label}</button>)}<a href={`https://biblehub.com/${book.bibleHub}/${chapter}-${selection.number}.htm`} target="_blank" rel="noreferrer">Open in Bible Hub ↗</a></div>
        <form onSubmit={event=>{event.preventDefault();if(question.trim())void requestStudy('ask',question);}}><label htmlFor="study-question">{conversation.length?'Ask a follow-up about this passage':'Ask about this passage'}</label><div className="form-row"><input id="study-question" value={question} onChange={event=>setQuestion(event.target.value)} maxLength={500} placeholder="What does this mean?" required/><button disabled={loading||!question.trim()}>Ask</button></div>{conversation.length>0&&<button type="button" className="text-button" onClick={()=>{pending.current?.abort();epoch.current++;setLoading(false);setConversation([]);conversationToken.current=undefined;setAnswer(null);setError('');}}>Start a new conversation</button>}</form></>}
        <div className="study-response" aria-live="polite" aria-busy={loading}>
          {conversation.map((turn,index)=><section className="conversation-turn" key={index}><h3>Your question</h3><p>{turn.question}</p><AnswerView answer={turn.answer} translation={primary}/></section>)}
          {loading&&<p className="muted">Finding study guidance…</p>}
          {error&&<div role="alert"><p>{error}</p>{selection.kind==='chapter'&&<button onClick={()=>void requestStudy('chapter-overview')}>Try again</button>}</div>}
          {answer&&<AnswerView answer={answer} translation={primary}/>}
          {!answer&&!loading&&!error&&!conversation.length&&<p className="muted">Expand Translations, choose a study action, or ask a question about this verse.</p>}
        </div>
        <p className="disclaimer">AI-generated study guidance · Google Gemini. AI may be incomplete or mistaken. Check references and reliable sources. External scholarly citations are not included.</p>
      </div>
    </aside>}
  </>;
}

export function AnswerView({answer,translation}:{answer:StudyAnswer;translation:Translation}) {
  const result=answer.result;
  const sections=[['At a glance',result.summary],['Where it fits in the book',result.bookContext],['Author & audience',result.authorshipAndAudience],['Historical setting & people',result.historicalSettingAndPeople]];
  return <><p className="answer-meta">{answer.cached?'Saved response':'Generated response'} · {new Date(answer.generatedAt).toLocaleDateString('en-US')} {answer.remaining!==undefined?`· ${answer.remaining} new generations remaining today`:''}</p>{sections.map(([title,text])=>text?<section key={title}><h3>{title}</h3><p>{text}</p></section>:null)}{([['Observations',result.observations],['Interpretive possibilities',result.interpretations],['Cautions',result.cautions]] as const).map(([title,items])=>items.length?<section key={title}><h3>{title}</h3>{items.map((item,i)=><p key={i}>{item}</p>)}</section>:null)}{answer.terms?.map(term=><section className="word-term" key={term.id}><h3><span lang={term.language==='Greek'?'grc':term.language==='Aramaic'?'arc':'he'} dir={term.language==='Greek'?'ltr':'rtl'}>{term.form}</span> · {term.transliteration}</h3><p>{term.language} · {term.gloss} · Lemma: {term.lemma}</p><p className="muted">{term.edition} · {term.grammar}</p>{result.terms?.filter(t=>t.id===term.id).map(t=><div key={t.id}><p><strong>In this passage: </strong>{t.contextualMeaning}</p><p><strong>Lexical range: </strong>{t.lexicalRange}</p></div>)}<p>Other occurrences: {term.occurrences.map((reference,i)=><span key={reference}>{i>0?' · ':''}<PassageLink reference={reference} translation={translation}/></span>)}</p><small>STEP Bible / Tyndale House, Cambridge · CC BY 4.0. Lexical range is not a hidden single meaning.</small></section>)}{result.relatedReferences.length>0&&<section><h3>Related passages</h3>{result.relatedReferences.map(({reference,explanation})=><p key={reference}><PassageLink reference={reference} translation={translation}/> — {explanation}</p>)}</section>}</>;
}
function PassageLink({reference,translation}:{reference:string;translation:Translation}) {
  // Only references validated by the server are supplied in study answers.
  const match=reference.match(/^(.+) (\d+)(?::(\d+))?$/);
  if(!match)return <span>{reference}</span>;
  try {return <Link href={readerUrl({book:match[1],chapter:+match[2],...(match[3]?{verse:+match[3]}:{})},translation)} target="_blank" rel="noreferrer" aria-label={`${reference} (new tab)`}>{reference} ↗</Link>;} catch {return <span>{reference}</span>;}
}
