import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';

export const PROJECT='study-table-a2869';
export async function ownerSdk() {
  const cli=process.env.FIREBASE_CLI_PATH??join(process.env.APPDATA??'', 'npm','node_modules','firebase-tools','lib','bin','firebase.js');
  const require=createRequire(cli);
  // Use the installed CLI's existing account and API client, without logging credentials.
  require('../logger').logger.silent=true;
  const account=require('../auth').getGlobalDefaultAccount();
  if(!account)throw new Error('Sign in with firebase login before running owner tools.');
  await require('../requireAuth').requireAuth({project:PROJECT,...account,nonInteractive:true});
  return {secretManager:require('../gcp/secretManager'),resourceManager:require('../gcp/resourceManager')};
}
export function firebaseOwner(args:string[],input?:string):Promise<string> {
  const cli=process.env.FIREBASE_CLI_PATH??join(process.env.APPDATA??'', 'npm','node_modules','firebase-tools','lib','bin','firebase.js');
  if(!existsSync(cli))throw new Error('Set FIREBASE_CLI_PATH to the installed Firebase CLI JavaScript entry point.');
  return new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[cli,...args,'--project',PROJECT,'--non-interactive'],{stdio:['pipe','pipe','pipe'],windowsHide:true});
    let output='';let errors='';child.stdout.on('data',chunk=>{output+=chunk;});child.stderr.on('data',chunk=>{errors+=chunk;});
    child.on('error',()=>reject(new Error('Could not start Firebase CLI.')));
    // Never include captured stdout/stderr in errors: secret access may contain a credential.
    child.on('close',code=>code===0?resolve(output.trim()):reject(new Error(`Firebase command ${args[0]} failed (${code}). Check project permissions and configuration.`)));
    child.stdin.end(input);
  });
}
