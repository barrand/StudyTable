import assert from 'node:assert/strict';
import { ownerSdk, firebaseOwner, PROJECT } from './firebase-owner';
const sdk=await ownerSdk();const backend='study-table';const location='us-central1';
let existing;
try{existing=await sdk.apphosting.getBackend(PROJECT,location,backend);}catch(error){if((error as {status?:number}).status!==404)throw new Error('Could not inspect the production backend.');}
if(!existing) {
  await firebaseOwner(['apphosting:backends:create','--backend',backend,'--primary-region',location,'--root-dir','.','--app','1:380827811468:web:7b7311ff0eb8c154a045a9']);
  existing=await sdk.apphosting.getBackend(PROJECT,location,backend);
}
assert.equal(existing.uri,'study-table--study-table-a2869.us-central1.hosted.app');
assert.equal(existing.serviceAccount,`firebase-app-hosting-compute@${PROJECT}.iam.gserviceaccount.com`);
if(existing.environment!=='production')await sdk.apphosting.client.patch(existing.name,{environment:'production'},{queryParams:{updateMask:'environment'}});
for(const secret of ['STUDY_GEMINI_API_KEY','STUDY_ACCESS_PASSWORD_HASH','STUDY_SESSION_SECRET','STUDY_RATE_LIMIT_SECRET']) {
  await firebaseOwner(['apphosting:secrets:grantaccess',secret,'--backend',backend,'--location',location]);
}
const verified=await sdk.apphosting.getBackend(PROJECT,location,backend);assert.equal(verified.environment,'production');
console.log('Production backend configured in study-table-a2869 with the production origin override and existing runtime secrets. No application rollout started.');
