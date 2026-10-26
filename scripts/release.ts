import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { ownerSdk, firebaseOwner, PROJECT } from './firebase-owner';

const environment=process.argv[2];assert(['preview','production'].includes(environment),'Choose preview or production.');
const git=(...args:string[])=>execFileSync('git',args,{encoding:'utf8',windowsHide:true}).trim();
assert.equal(git('branch','--show-current'),'main','Release only from main.');
assert.equal(git('status','--porcelain'),'','Commit changes before releasing.');
git('fetch','origin','main');const commit=git('rev-parse','HEAD');
assert.equal(commit,git('rev-parse','origin/main'),'Release the pushed main commit.');
const ci=await fetch('https://api.github.com/repos/barrand/StudyTable/actions/runs?branch=main&per_page=20');assert(ci.ok,'Could not check GitHub CI.');
const runs=await ci.json() as {workflow_runs:{head_sha:string;name:string;conclusion:string;status:string}[]};
const latestCheck=runs.workflow_runs.find(run=>run.head_sha===commit&&run.name==='Verify Study Table');
assert(latestCheck?.status==='completed'&&latestCheck.conclusion==='success','Wait for the exact main commit to pass CI before releasing.');
const sdk=await ownerSdk();
if(environment==='production') {
  const evidence=JSON.parse(await readFile('.cache/verified-preview-release.json','utf8')) as {commit:string;rollout:string};
  assert.equal(evidence.commit,commit,'Deploy and verify this same commit in preview first.');
  const {rollouts}=await sdk.apphosting.listRollouts(PROJECT,'us-central1','study-table-preview');
  assert(rollouts.some((rollout:{name:string;state:string})=>rollout.name===evidence.rollout&&rollout.state==='SUCCEEDED'),'The recorded preview rollout must have succeeded.');
}
const backend=environment==='preview'?'study-table-preview':'study-table';
const configured=await sdk.apphosting.getBackend(PROJECT,'us-central1',backend);
if(environment==='production')assert.equal(configured.environment,'production');
console.log(`Deploying verified main commit ${commit.slice(0,7)} to ${backend}.`);
await firebaseOwner(['deploy','--only',`apphosting:${backend}`]);
const {rollouts}=await sdk.apphosting.listRollouts(PROJECT,'us-central1',backend);
const latest=rollouts.sort((a:{createTime:string},b:{createTime:string})=>b.createTime.localeCompare(a.createTime))[0];
// The CLI may finish just before the control plane reflects its final state.
let state=latest?.state;
for(let attempt=0;attempt<6&&state!=='SUCCEEDED';attempt++) {
  await new Promise(resolve=>setTimeout(resolve,5000));
  const current=await sdk.apphosting.listRollouts(PROJECT,'us-central1',backend);
  state=current.rollouts.find((rollout:{name:string})=>rollout.name===latest.name)?.state;
}
assert.equal(state,'SUCCEEDED','Do not treat a queued or progressing rollout as a completed release.');
const validation=execFileSync(process.execPath,['--import','tsx','scripts/validate-preview.ts','--study'],{env:{...process.env,STUDY_PREVIEW_ORIGIN:`https://${configured.uri}`},encoding:'utf8',windowsHide:true});
console.log(validation.trim());
await mkdir('.cache',{recursive:true});await writeFile(`.cache/verified-${environment}-release.json`,JSON.stringify({commit,backend,rollout:latest.name,origin:`https://${configured.uri}`,verifiedAt:new Date().toISOString()},null,2)+'\n');
console.log(`${environment} release verified at https://${configured.uri}`);
