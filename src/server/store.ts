import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
export type RecordData = Record<string, unknown>;
export interface StoreTransaction { get(key:string):Promise<RecordData|undefined>; set(key:string,value:RecordData):void; delete(key:string):void }
export interface Store { get(key:string):Promise<RecordData|undefined>; transaction<T>(operation:(tx:StoreTransaction)=>Promise<T>):Promise<T> }

export class MemoryStore implements Store {
  readonly records=new Map<string,RecordData>(); private tail:Promise<unknown>=Promise.resolve();
  async get(key:string) {const value=this.records.get(key);return value?structuredClone(value):undefined;}
  transaction<T>(operation:(tx:StoreTransaction)=>Promise<T>):Promise<T> {
    const next=this.tail.then(async()=>{
      const changes=new Map<string,RecordData|undefined>();
      const result=await operation({get:key=>this.get(key),set:(key,data)=>{changes.set(key,structuredClone(data));},delete:key=>{changes.set(key,undefined);}});
      for(const [key,value] of changes)value?this.records.set(key,value):this.records.delete(key);
      return result;
    });this.tail=next.catch(()=>{});return next;
  }
}
function normalize(data:RecordData|undefined) {if(data?.expireAt instanceof Timestamp)return {...data,expireAt:data.expireAt.toMillis()};return data;}
export class FirestoreStore implements Store {
  private database() {
    const app=getApps()[0]??initializeApp({credential:applicationDefault(),projectId:process.env.GOOGLE_CLOUD_PROJECT ?? process.env.GCLOUD_PROJECT});
    return getFirestore(app);
  }
  async get(key:string) {return normalize((await this.database().doc(key).get()).data());}
  transaction<T>(operation:(tx:StoreTransaction)=>Promise<T>):Promise<T> {
    const db=this.database();
    return db.runTransaction(async transaction=>operation({
      get:async key=>normalize((await transaction.get(db.doc(key))).data()),
      set:(key,value)=>transaction.set(db.doc(key),{...value,...(typeof value.expireAt==='number'?{expireAt:Timestamp.fromMillis(value.expireAt)}:{})}),
      delete:key=>{transaction.delete(db.doc(key));}
    }));
  }
}
let store:Store|undefined;
export function getStore() {
  if(!store)store=process.env.NODE_ENV!=='production'&&process.env.STUDY_STORE==='memory'?new MemoryStore():new FirestoreStore();
  return store;
}
