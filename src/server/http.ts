import { ServiceError } from './errors';
export async function boundedText(request:Request,maxBytes=4096) {
  if(Number(request.headers.get('content-length'))>maxBytes)throw new ServiceError(413,'Request is too large.');
  const reader=request.body?.getReader();if(!reader)return '';
  const chunks:Uint8Array[]=[];let size=0;
  try {while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes){await reader.cancel();throw new ServiceError(413,'Request is too large.');}chunks.push(value);}}finally{reader.releaseLock();}
  return Buffer.concat(chunks).toString('utf8');
}
export function publicOrigin(request:Request) {return new URL(process.env.APP_ORIGIN??request.url).origin;}
export function checkOrigin(request:Request) {
  if(request.headers.get('origin')!==publicOrigin(request))throw new ServiceError(403,'This request must come from Study Table.');
}
export function errorResponse(error:unknown) {
  const known=error instanceof ServiceError;
  return Response.json({error:known?error.message:'Study tools are temporarily unavailable. Please try again later.'},{status:known?error.status:503,headers:{'Cache-Control':'no-store',...(known&&error.retryAfter?{'Retry-After':String(error.retryAfter)}:{})}});
}
