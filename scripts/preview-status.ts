import { ownerSdk, PROJECT } from './firebase-owner';
const {apphosting}=await ownerSdk();
const {rollouts}=await apphosting.listRollouts(PROJECT,'us-central1','study-table-preview');
for(const rollout of rollouts.sort((a:{createTime:string},b:{createTime:string})=>b.createTime.localeCompare(a.createTime)).slice(0,2)) {
  console.log(JSON.stringify({name:rollout.name,state:rollout.state,build:rollout.build,createTime:rollout.createTime,updateTime:rollout.updateTime,error:rollout.error}));
  if(rollout.state!=='SUCCEEDED') {
    const build=await apphosting.getBuild(PROJECT,'us-central1','study-table-preview',rollout.build.split('/').at(-1));
    console.log(JSON.stringify({buildState:build.state,error:build.error,buildLogsUri:build.buildLogsUri,createTime:build.createTime,updateTime:build.updateTime}));
  }
}
