import { ownerSdk, PROJECT } from './firebase-owner';
const {resourceManager}=await ownerSdk();
const account=`firebase-app-hosting-compute@${PROJECT}.iam.gserviceaccount.com`;
const roles=['roles/datastore.user'];
if(!await resourceManager.serviceAccountHasRoles(PROJECT,account,roles,true))await resourceManager.addServiceAccountToRoles(PROJECT,account,roles,true);
if(!await resourceManager.serviceAccountHasRoles(PROJECT,account,roles,true))throw new Error('Runtime Firestore permission could not be verified.');
console.log('Verified preview runtime has Firestore data access in the Study Table project.');
