import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { getApps, deleteApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { FirestoreStore } from '../src/server/store';
import { reserveQuota, bucketId } from '../src/server/limits';
import { study } from '../src/server/study-service';
import type { StudyRequest, StudyResult } from '../src/lib/study';

// Never run this against a real project, even if a developer has ADC configured.
assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8085','Use the local Firestore emulator on port 8085.');
assert.equal(process.env.GOOGLE_CLOUD_PROJECT,'demo-study-table','Integration tests require the demo project.');
const secret='firestore-integration-test-secret-not-deployed';
const store=new FirestoreStore();
const request:StudyRequest={reference:'John 3:16',translation:'WEB',action:'context'};
const result:StudyResult={observations:['The verse belongs to the conversation with Nicodemus.'],interpretations:[],relatedReferences:[{reference:'John 3:17',explanation:'Continues the discussion.'}],cautions:[]};
after(async()=>{for(const app of getApps())await deleteApp(app);});

test('Firestore transactions enforce the real adapter’s global and per-bucket ceiling and persist TTL timestamps',async()=>{
  const now=Date.parse('2026-10-25T12:00:00Z');
  const attempts=await Promise.allSettled(Array.from({length:8},(_,i)=>reserveQuota(store,`quota-${i}`,secret,2,3,now)));
  assert.equal(attempts.filter(r=>r.status==='fulfilled').length,3);
  const total=await getFirestore().doc('generationTotals/2026-10-25').get();assert.equal(total.data()!.count,3);assert(total.data()!.expireAt instanceof Timestamp);
  await assert.rejects(()=>reserveQuota(new FirestoreStore(),'new-visitor',secret,2,3,now),/allowance/);
  const tomorrow=now+86400000;
  await reserveQuota(store,'one-visitor',secret,1,50,tomorrow);
  await assert.rejects(()=>reserveQuota(store,'one-visitor',secret,1,50,tomorrow),/allowance/);
  const key=`generationQuotas/${bucketId('one-visitor','2026-10-26',secret)}`;
  assert.equal((await store.get(key))!.count,1);assert.equal(typeof (await store.get(key))!.expireAt,'number');
});

test('separate Firestore service instances share generation leases and cache hits survive exhausted budgets',async()=>{
  let calls=0;let started!:()=>void;const ready=new Promise<void>(resolve=>{started=resolve;});
  let finish!:(value:StudyResult)=>void;
  const config={store,secret,model:'emulator-test',version:'firestore-integration',now:()=>Date.parse('2026-10-27T12:00:00Z'),perKeyLimit:1,globalLimit:1,generate:async()=>{calls++;started();return new Promise<StudyResult>(resolve=>{finish=resolve;});}};
  const first=study(request,'visitor-a',config);await ready;
  await assert.rejects(()=>study(request,'visitor-b',{...config,store:new FirestoreStore()}),/already being generated/);
  finish(result);const generated=await first;assert.equal(generated.remaining,0);
  const cached=await study(request,'visitor-b',{...config,store:new FirestoreStore()});assert(cached.cached);assert.equal(cached.generatedAt,generated.generatedAt);assert.equal(calls,1);
  await assert.rejects(()=>study({...request,reference:'John 3:18'},'visitor-b',config),/allowance/);
  const db=getFirestore();assert.equal((await db.collection('generationLeases').get()).size,0);
  const records=await db.collection('studyResponses').get();assert.equal(records.size,1);assert.equal(records.docs[0].data().expireAt,undefined);
});
