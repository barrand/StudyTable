import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { ownerSdk, PROJECT } from './firebase-owner';
import { bucketId } from '../src/server/limits';

// Compare platform-controlled request logs with anonymized app throttle records.
// Raw addresses, signing secrets, passwords, cookies and log entries are never printed or saved.
const origin=process.env.STUDY_PREVIEW_ORIGIN??'https://study-table-preview--study-table-a2869.us-central1.hosted.app';
const sdk=await ownerSdk();
const secret=(await sdk.secretManager.accessSecretVersion(PROJECT,'STUDY_RATE_LIMIT_SECRET','latest') as string).trim();
const invite=JSON.parse(await readFile('.cache/preview-invite.json','utf8')) as {password:string};
for(const spoof of ['192.0.2.123','198.51.100.123, 203.0.113.123']) {
  const probe=randomUUID();const start=Date.now();
  const response=await fetch(`${origin}/api/access?proxyProbe=${probe}`,{method:'POST',redirect:'manual',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded','X-Forwarded-For':spoof},body:new URLSearchParams({password:invite.password})});
  assert.equal(response.status,303,'Proxy probe must pass the normal invite gate.');
  let remote:string|undefined;
  for(let attempt=0;attempt<8&&!remote;attempt++) {
    const logs=await sdk.logging.listEntries(PROJECT,`resource.type="cloud_run_revision" AND httpRequest.requestUrl:"proxyProbe=${probe}"`,5,'desc');
    remote=logs.entries.find((entry:{httpRequest?:{remoteIp?:string}})=>entry.httpRequest?.remoteIp)?.httpRequest?.remoteIp;
    if(!remote){console.log('Waiting for the specific proxy probe request log.');await new Promise(resolve=>setTimeout(resolve,10000));}
  }
  assert(remote,'The platform request log was not ingested within the probe window.');
  const windows=[...new Set([Math.floor(start/300000),Math.floor(Date.now()/300000)])];
  const platformPaths=windows.map(window=>`requestLimits/${bucketId(remote!,`access-${window}`,secret)}`);
  const expected=await sdk.firestore.getDocuments(PROJECT,platformPaths);
  assert(expected.documents.length>0,'The app bucket does not match the platform request address; inspect the forwarding chain before changing proxy trust.');
  const spoofPaths=spoof.split(',').map(value=>value.trim()).flatMap(ip=>windows.map(window=>`requestLimits/${bucketId(ip,`access-${window}`,secret)}`));
  const untrusted=await sdk.firestore.getDocuments(PROJECT,spoofPaths);
  assert.equal(untrusted.documents.length,0,'A supplied forwarding prefix must not select the throttle identity.');
  console.log('Proxy probe passed: app identity matches the platform request address; supplied forwarding prefixes cannot select a bucket.');
}
