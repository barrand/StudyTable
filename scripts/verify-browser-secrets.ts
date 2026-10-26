import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { ownerSdk, PROJECT } from './firebase-owner';
const origin=process.env.STUDY_PREVIEW_ORIGIN??'https://study-table--study-table-a2869.us-central1.hosted.app';
const sdk=await ownerSdk();
const names=['STUDY_GEMINI_API_KEY','STUDY_ACCESS_PASSWORD_HASH','STUDY_SESSION_SECRET','STUDY_RATE_LIMIT_SECRET'];
const secrets=await Promise.all(names.map(async name=>(await sdk.secretManager.accessSecretVersion(PROJECT,name,'latest') as string).trim()));
const invite=JSON.parse(await readFile('.cache/preview-invite.json','utf8')) as {password:string};secrets.push(invite.password);
if(process.argv.includes('--redact-local-debug-log')) {
  // Mechanical redaction of this task's ignored CLI log; never print a match.
  let original:string|undefined;try{original=await readFile('firebase-debug.log','utf8');}catch{}
  if(original!==undefined) {
    let sanitized=original;for(const secret of secrets)sanitized=sanitized.replaceAll(secret,'[REDACTED_RUNTIME_SECRET]');
    if(sanitized!==original){await writeFile('firebase-debug.log',sanitized);console.log('Runtime secret values redacted from the local ignored Firebase CLI debug log.');}
    else console.log('No runtime secret values were found in the local Firebase CLI debug log.');
  }
}
const login=await fetch(origin+'/api/access',{method:'POST',redirect:'manual',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({password:invite.password})});
assert.equal(login.status,303,'Production sign-in must succeed before checking private HTML.');
const cookie=login.headers.get('set-cookie')!.split(';')[0];
const page=await fetch(origin+'/bible/john/3?verse=16&translation=WEB',{headers:{Cookie:cookie}});assert.equal(page.status,200);
const html=await page.text();for(const secret of secrets)assert(!html.includes(secret),'A runtime secret appeared in reader HTML.');
const urls=[...new Set([...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(match=>new URL(match[1].replaceAll('&amp;','&'),origin)).filter(url=>url.origin===origin&&url.pathname.startsWith('/_next/static/')).map(url=>url.href))];assert(urls.length>0);
for(const url of urls){const asset=await fetch(url);assert.equal(asset.status,200);const body=await asset.text();for(const secret of secrets)assert(!body.includes(secret),'A runtime secret appeared in a browser script.');}
console.log(`Production HTML and ${urls.length} same-origin browser scripts contain none of the four runtime secrets or the invite password. No secret values were printed.`);
