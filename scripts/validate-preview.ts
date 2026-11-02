import assert from 'node:assert/strict';
const origin=process.env.STUDY_PREVIEW_ORIGIN??'https://study-table-preview--study-table-a2869.us-central1.hosted.app';
const reader=await fetch(origin+'/bible/john/3?verse=16&translation=KJV');
assert.equal(reader.status,200);const html=await reader.text();assert(html.includes('only begotten Son'));assert(html.includes('Chapter overview'));assert(html.includes('Study John 3:16'));
const invalid=await fetch(origin+'/api/study',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({reference:'John 3:999',translation:'WEB',action:'context'})});
assert.equal(invalid.status,400,'Invalid references must be rejected before generation');
const crossOrigin=await fetch(origin+'/api/study',{method:'POST',headers:{Origin:'https://untrusted.example','Content-Type':'application/json'},body:'{}'});assert.equal(crossOrigin.status,403);
const sources=await fetch(origin+'/sources');assert.equal(sources.status,200);assert((await sources.text()).includes('Sources &amp; licenses'));
console.log('Preview checks passed: public reader, real KJV reader, sources, invalid reference, and same-origin enforcement.');
if(process.argv.includes('--study')) {
  const input={reference:'John 3',translation:'WEB',action:'chapter-overview'};
  const call=()=>fetch(origin+'/api/study',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(input)});
  const first=await call();const firstData=await first.json();
  if(!first.ok)throw new Error(`Live study unavailable (HTTP ${first.status}): ${firstData.error}`);
  const second=await call();const secondData=await second.json();assert(secondData.cached);assert.equal(firstData.generatedAt,secondData.generatedAt);
  console.log('Preview study passed: real Gemini answer persisted and reused from Firestore.');
}
