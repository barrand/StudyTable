import { ownerSdk, PROJECT } from './firebase-owner';
const sdk=await ownerSdk();
for(const bucket of ['_Default','_Required']) {
  const {body}=await sdk.loggingClient.get(`projects/${PROJECT}/locations/global/buckets/${bucket}`);
  console.log(JSON.stringify({bucket,retentionDays:body.retentionDays,locked:body.locked??false,lifecycleState:body.lifecycleState}));
}
const recent=await sdk.logging.listEntries(PROJECT,'resource.type="cloud_run_revision" AND resource.labels.service_name="study-table-preview"',100,'desc');
const requests=recent.entries.filter((entry:{httpRequest?:unknown})=>entry.httpRequest);
console.log(JSON.stringify({recentEntries:recent.entries.length,requestEntries:requests.length,requestsIncludeRemoteAddress:requests.some((entry:{httpRequest?:{remoteIp?:unknown}})=>typeof entry.httpRequest?.remoteIp==='string')}));
console.log('Platform request logs may retain request addresses and URLs. No request bodies, addresses, secrets, or log content were printed by this tool.');
