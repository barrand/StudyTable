import { createHash, randomUUID } from 'node:crypto';
import manifest from '../../data/source-lock.json';
import wordManifest from '../../data/word-source-lock.json';
import { referenceLabel, findBook, type Reference } from '../lib/books';
import { loadChapter, resolveReference } from '../lib/corpus';
import { StudyRequestSchema, StudyResultSchema, type StudyAnswer, type StudyRequest, type StudyResult, type WordTerm } from '../lib/study';
import { ServiceError } from './errors';
import { reserveQuota, throttle } from './limits';
import type { Store } from './store';
import { wordTerms } from './words';
import { nextConversation, readConversation } from './conversation';

const CORPUS_VERSION=manifest.sources.map(s=>`${s.translation}:${s.sha256}`).join('|');
export const PROMPT_VERSION='study-2';
export const SCHEMA_VERSION='study-1';
export function studyCacheKey(request:StudyRequest,model:string,version='1',sourceVersion=wordManifest.version) {
  return createHash('sha256').update(JSON.stringify({work:'bible',reference:request.reference,scope:request.action==='chapter-overview'?'chapter':'verse',translation:request.translation,action:request.action,language:'en',model,version,prompt:PROMPT_VERSION,schema:SCHEMA_VERSION,corpus:CORPUS_VERSION,sourceVersion})).digest('hex');
}
export interface StudyOptions {
  store:Store;secret:string;model:string;version?:string;sourceVersion?:string;perKeyLimit?:number;globalLimit?:number;now?:()=>number;
  generate:(request:StudyRequest,context:unknown)=>Promise<unknown>;
  getTerms?:(reference:Reference,translation:'KJV'|'WEB')=>Promise<WordTerm[]>;
}
export async function validateResult(raw:unknown,request:StudyRequest,terms:WordTerm[]=[]):Promise<StudyResult> {
  const parsed=StudyResultSchema.safeParse(raw);
  if(!parsed.success)throw new ServiceError(502,'The AI response did not pass validation. Please try again.');
  const result=parsed.data;
  if(request.action==='chapter-overview'&&(!result.summary||!result.bookContext||!result.authorshipAndAudience||!result.historicalSettingAndPeople))throw new ServiceError(502,'The chapter overview was incomplete. Please try again.');
  if(request.action==='word-study') {
    if(!result.terms?.length||result.terms.some(t=>!terms.some(source=>source.id===t.id))||new Set(result.terms.map(t=>t.id)).size!==result.terms.length)throw new ServiceError(502,'The word study did not match the source-language data.');
  } else if(result.terms)throw new ServiceError(502,'The AI response contained unexpected source-language terms.');
  if(!result.summary&&!result.observations.length&&!result.interpretations.length&&!result.relatedReferences.length&&!result.cautions.length&&!result.terms?.length)throw new ServiceError(502,'The AI response was empty.');
  // Never render model-authored quotations or pretend external-source citations.
  const prose=[...result.observations,...result.interpretations,...result.cautions,result.summary,result.bookContext,result.authorshipAndAudience,result.historicalSettingAndPeople,...result.relatedReferences.map(r=>r.explanation),...(result.terms??[]).flatMap(t=>[t.contextualMeaning,t.lexicalRange])].filter(Boolean).join(' ');
  if(/["“”«»<>]|https?:\/\/|www\./i.test(prose))throw new ServiceError(502,'The study included unsupported quotations or source markup. Please try again.');
  const references=[];const seen=new Set<string>();
  for(const item of result.relatedReferences) {
    const ref=await resolveReference(item.reference,request.translation);
    if(!ref)throw new ServiceError(502,'The study suggested a reference not found in the local Bible corpus.');
    const reference=referenceLabel(ref);if(!seen.has(reference)){references.push({...item,reference});seen.add(reference);}
  }
  return {...result,relatedReferences:references};
}
export async function study(raw:unknown,ip:string,options:StudyOptions):Promise<StudyAnswer> {
  const parsed=StudyRequestSchema.safeParse(raw);
  if(!parsed.success)throw new ServiceError(400,'Choose a valid passage, translation, study action, and a question of at most 500 characters.');
  const request=parsed.data;const reference=await resolveReference(request.reference,request.translation);
  if(!reference||(request.action==='chapter-overview')!==(reference.verse===undefined))throw new ServiceError(400,'The reference must be a chapter for overview, or a single valid verse for verse study.');
  request.reference=referenceLabel(reference);
  const now=options.now??Date.now;const version=options.version??'1';
  const conversation=request.action==='ask'?readConversation(request.conversationToken,request.reference,request.translation,options.secret,now()):[];
  await throttle(options.store,ip,options.secret,'study',30,60000,now());
  const terms=request.action==='word-study'?await (options.getTerms??wordTerms)(reference,request.translation):[];
  const cacheKey=`studyResponses/${studyCacheKey(request,options.model,version,options.sourceVersion)}`;
  async function readCached() {
    const data=await options.store.get(cacheKey);if(!data)return null;
    try {
      if(typeof data.generatedAt!=='string'||!Number.isFinite(Date.parse(data.generatedAt)))return null;
      const result=await validateResult(data.result,request,terms);
      return {result,reference:request.reference,translation:request.translation,action:request.action,cached:true,generatedAt:data.generatedAt,model:options.model,cacheVersion:version,...(terms.length?{terms:terms.filter(t=>result.terms?.some(term=>term.id===t.id))}:{})} satisfies StudyAnswer;
    } catch {return null;}
  }
  if(request.action!=='ask'){const cached=await readCached();if(cached)return cached;}
  const leaseKey=cacheKey.replace('studyResponses/','generationLeases/');const owner=randomUUID();
  if(request.action!=='ask')await options.store.transaction(async tx=>{
    const lease=await tx.get(leaseKey);
    if(lease&&Number(lease.expireAt)>now())throw new ServiceError(425,'This study is already being generated. Please try again in a moment.',2);
    tx.set(leaseKey,{owner,expireAt:now()+90000});
  });
  try {
    if(request.action!=='ask'){const cached=await readCached();if(cached)return cached;}
    const chapter=await loadChapter(reference,request.translation);
    const book=findBook(reference.book)!;
    const neighboring = request.action==='chapter-overview'
      ? await Promise.all([reference.chapter>1?loadChapter({...reference,chapter:reference.chapter-1},request.translation):null,reference.chapter<book.chapters?loadChapter({...reference,chapter:reference.chapter+1},request.translation):null]) : [];
    const bookEnds=request.action==='chapter-overview'?await Promise.all([loadChapter({...reference,chapter:1},request.translation),loadChapter({...reference,chapter:book.chapters},request.translation)]):[];
    const context={book:{name:book.name,testament:book.testament,chapters:book.chapters},chapter,neighboringChapters:neighboring.filter(Boolean),bookOpeningAndClosing:bookEnds.map(c=>({...c,verses:c.verses.slice(0,12)})),...(terms.length?{sourceTerms:terms}:{}),...(conversation.length?{priorConversation:conversation}:{})};
    const remaining=await reserveQuota(options.store,ip,options.secret,options.perKeyLimit??10,options.globalLimit??50,now());
    const result=await validateResult(await options.generate(request,context),request,terms);
    const generatedAt=new Date(now()).toISOString();
    if(request.action!=='ask')await options.store.transaction(async tx=>{
      const lease=await tx.get(leaseKey);if(lease?.owner!==owner)throw new ServiceError(425,'The study generation expired. Please try again.',2);
      tx.set(cacheKey,{result,generatedAt,model:options.model,cacheVersion:version,sourceVersion:options.sourceVersion??wordManifest.version});
    });
    return {result,reference:request.reference,translation:request.translation,action:request.action,cached:false,generatedAt,model:options.model,cacheVersion:version,remaining,...(terms.length?{terms:terms.filter(t=>result.terms?.some(term=>term.id===t.id))}:{}),...(request.action==='ask'?{conversationToken:nextConversation(request.reference,request.translation,conversation,request.question!,result,options.secret,now())}:{})};
  } finally {
    if(request.action!=='ask')await options.store.transaction(async tx=>{const lease=await tx.get(leaseKey);if(lease?.owner===owner)tx.delete(leaseKey);});
  }
}
