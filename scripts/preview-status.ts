import { ownerSdk, PROJECT } from './firebase-owner';
const {apphosting}=await ownerSdk();
const backend=process.argv[2]??'study-table-preview';
if(!['study-table-preview','study-table'].includes(backend))throw new Error('Choose a Study Table backend.');
const {rollouts}=await apphosting.listRollouts(PROJECT,'us-central1',backend);
for(const rollout of rollouts.sort((a:{createTime:string},b:{createTime:string})=>b.createTime.localeCompare(a.createTime)).slice(0,2)) {
  console.log(JSON.stringify({name:rollout.name,state:rollout.state,build:rollout.build,createTime:rollout.createTime,updateTime:rollout.updateTime,error:rollout.error}));
  if(rollout.state!=='SUCCEEDED') {
    const build=await apphosting.getBuild(PROJECT,'us-central1',backend,rollout.build.split('/').at(-1));
    console.log(JSON.stringify({buildState:build.state,error:build.error,buildLogsUri:build.buildLogsUri,createTime:build.createTime,updateTime:build.updateTime}));
  }
}
