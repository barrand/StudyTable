import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { firebaseOwner } from './firebase-owner';
import { hashPassword } from '../src/server/auth';

const file='.cache/preview-invite.json';await mkdir('.cache',{recursive:true});
let invite:{password:string;createdAt:string};
try{invite=JSON.parse(await readFile(file,'utf8'));}catch{invite={password:randomBytes(18).toString('base64url'),createdAt:new Date().toISOString()};await writeFile(file,JSON.stringify(invite,null,2)+'\n',{mode:0o600});}
const secrets={
  STUDY_ACCESS_PASSWORD_HASH:await hashPassword(invite.password),
  STUDY_SESSION_SECRET:randomBytes(48).toString('base64url'),
  STUDY_RATE_LIMIT_SECRET:randomBytes(48).toString('base64url')
};
for(const [name,value] of Object.entries(secrets)) {
  let exists=false;try{await firebaseOwner(['apphosting:secrets:describe',name,'--json']);exists=true;}catch{/* New app secret. */}
  if(!exists)await firebaseOwner(['apphosting:secrets:set',name,'--data-file','-','--force'],value);
  await firebaseOwner(['apphosting:secrets:grantaccess',name,'--backend','study-table-preview','--location','us-central1']);
  console.log(`${name}: configured for the preview backend.`);
}
console.log('Preview invite is saved in the Git-ignored .cache/preview-invite.json. No secret values were printed.');
