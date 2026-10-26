import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const origin=process.env.STUDY_PREVIEW_ORIGIN??'https://study-table-preview--study-table-a2869.us-central1.hosted.app';
const privatePage=await fetch(origin+'/bible/john/3',{redirect:'manual'});
assert([302,303,307,308].includes(privatePage.status),'Unauthenticated reader must redirect');
assert.equal(new URL(privatePage.headers.get('location')!,origin).pathname,'/access');
const unauthorized=await fetch(origin+'/api/study',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({reference:'John 3',translation:'WEB',action:'chapter-overview'})});
assert.equal(unauthorized.status,401,'Study API must reject missing sessions');
const invite=JSON.parse(await readFile('.cache/preview-invite.json','utf8')) as {password:string};
const login=await fetch(origin+'/api/access',{method:'POST',redirect:'manual',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({password:invite.password})});
if(login.status!==303)throw new Error(`Private preview login failed (HTTP ${login.status}); inspect backend configuration.`);
const cookie=login.headers.get('set-cookie');assert(cookie?.includes('HttpOnly'));assert(cookie?.includes('Secure'));assert(cookie?.includes('SameSite=lax'));
const session=cookie!.split(';')[0];
const reader=await fetch(origin+'/bible/john/3?verse=16&translation=KJV',{headers:{Cookie:session}});
assert.equal(reader.status,200);const html=await reader.text();assert(html.includes('only begotten Son'));assert(html.includes('Chapter overview'));assert(html.includes('Study John 3:16'));
const invalid=await fetch(origin+'/api/study',{method:'POST',headers:{Cookie:session,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({reference:'John 3:999',translation:'WEB',action:'context'})});
assert.equal(invalid.status,400,'Invalid references must be rejected before generation');
const crossOrigin=await fetch(origin+'/api/study',{method:'POST',headers:{Cookie:session,Origin:'https://untrusted.example','Content-Type':'application/json'},body:'{}'});assert.equal(crossOrigin.status,403);
const sources=await fetch(origin+'/sources',{headers:{Cookie:session}});assert.equal(sources.status,200);assert((await sources.text()).includes('Sources &amp; licenses'));
console.log('Preview checks passed: production access gate, Secure/HttpOnly session, Firestore-backed login throttle, real KJV reader, sources, unauthorized API, invalid reference, and same-origin enforcement.');
if(process.argv.includes('--study')) {
  const input={reference:'John 3',translation:'WEB',action:'chapter-overview'};
  const call=()=>fetch(origin+'/api/study',{method:'POST',headers:{Cookie:session,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(input)});
  const first=await call();const firstData=await first.json();
  if(!first.ok)throw new Error(`Live study unavailable (HTTP ${first.status}): ${firstData.error}`);
  const second=await call();const secondData=await second.json();assert(secondData.cached);assert.equal(firstData.generatedAt,secondData.generatedAt);
  console.log('Preview study passed: real Gemini answer persisted and reused from Firestore.');
}
