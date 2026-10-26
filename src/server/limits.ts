import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import type { Store } from './store';
import { ServiceError } from './errors';
export function bucketId(ip:string,date:string,secret:string) {return createHmac('sha256',secret).update(`${ip}|${date}`).digest('hex');}
export function clientIp(headers:Headers,hops=1) {
  const forwarded=headers.get('x-forwarded-for')?.split(',').map(value=>value.trim()) ?? [];
  const candidate=forwarded[Math.max(0,forwarded.length-hops)];
  return candidate&&isIP(candidate)?candidate:'unresolved';
}
export async function throttle(store:Store,identity:string,secret:string,namespace='study',limit=30,windowMs=60000,now=Date.now()) {
  const window=Math.floor(now/windowMs);const key=`requestLimits/${bucketId(identity,`${namespace}-${window}`,secret)}`;
  await store.transaction(async tx=>{
    const data=await tx.get(key);const count=Number(data?.count??0);
    if(count>=limit)throw new ServiceError(429,'Too many requests. Please wait before trying again.',Math.ceil(windowMs/1000));
    tx.set(key,{count:count+1,expireAt:(window+2)*windowMs});
  });
}
export async function reserveQuota(store:Store,ip:string,secret:string,perKey=10,global=50,now=Date.now()) {
  const date=new Date(now).toISOString().slice(0,10);const key=`generationQuotas/${bucketId(ip,date,secret)}`;
  const globalKey=`generationTotals/${date}`;const expireAt=Date.parse(`${date}T00:00:00Z`)+2*86400000;
  return store.transaction(async tx=>{
    const [local,all]=await Promise.all([tx.get(key),tx.get(globalKey)]);
    const localCount=Number(local?.count??0);const allCount=Number(all?.count??0);
    if(localCount>=perKey||allCount>=global)throw new ServiceError(429,'Today’s new AI generation allowance is exhausted. Saved study responses remain available.',3600);
    tx.set(key,{count:localCount+1,expireAt});tx.set(globalKey,{count:allCount+1,expireAt});
    return Math.min(perKey-localCount-1,global-allCount-1);
  });
}
