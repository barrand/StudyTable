import { ownerSdk, PROJECT } from './firebase-owner';
import { generateWithGemini } from '../src/server/gemini';
import { study } from '../src/server/study-service';
import { MemoryStore } from '../src/server/store';
import { mkdir, writeFile } from 'node:fs/promises';

// Owner-triggered smoke validation: secret stays inside this process and is never printed.
const sdk=await ownerSdk();
const key=(await sdk.secretManager.accessSecretVersion(PROJECT,'STUDY_GEMINI_API_KEY','latest') as string).trim();
if(!key||key.length>512)throw new Error('Unexpected Gemini credential format.');
const store=new MemoryStore();let calls=0;
const model=process.env.GEMINI_MODEL??'gemini-3.1-flash-lite';
const checks:unknown[]=[];await mkdir('.cache',{recursive:true});
for(const input of [
  {reference:'John 3',action:'chapter-overview'},
  {reference:'John 3:16',action:'context'},
  {reference:'John 3:16',action:'word-study'},
  {reference:'Genesis 1:1',action:'word-study'}
] as const) {
  const request={...input,translation:'WEB'};
  const config={store,secret:'owner-smoke-test-only-never-deployed',model,perKeyLimit:4,globalLimit:4,generate:async(parameters:Parameters<typeof generateWithGemini>[0],context:unknown)=>{calls++;return generateWithGemini(parameters,context,{key,model});}};
  const result=await study(request,'owner-validation',config);
  const cached=await study(request,'owner-validation',config);
  if(!cached.cached)throw new Error('Live response was not reused.');
  checks.push({request,answer:result});await writeFile('.cache/live-gemini-report.json',JSON.stringify({model,checks},null,2)+'\n');
  console.log(`${request.reference} ${request.action}: validated; ${result.result.relatedReferences.length} verified links; ${result.terms?.length??0} source-backed terms; cache reused.`);
}
console.log(`Live Gemini validation passed: ${calls} bounded generations; cache hits made no additional calls.`);
