import { hasSession } from '@/server/session';
import { boundedText, checkOrigin, errorResponse } from '@/server/http';
import { getStore } from '@/server/store';
import { ServiceError } from '@/server/errors';
import { clientIp } from '@/server/limits';
import { generateWithGemini } from '@/server/gemini';
import { study } from '@/server/study-service';
export const runtime='nodejs';
export const maxDuration=60;
function limit(name:string,defaultValue:number) {
  const value=Number(process.env[name]??defaultValue);
  if(!Number.isInteger(value)||value<0||value>100000)throw new ServiceError(503,'AI limits are not configured correctly.');
  return value;
}
export async function POST(request:Request) {
  try {
    if(!await hasSession())throw new ServiceError(401,'Enter the invite password before using study tools.');
    checkOrigin(request);
    if(!request.headers.get('content-type')?.startsWith('application/json'))throw new ServiceError(415,'Expected a JSON study request.');
    let body:unknown;try{body=JSON.parse(await boundedText(request,20000));}catch(error){if(error instanceof ServiceError)throw error;throw new ServiceError(400,'The study request is not valid JSON.');}
    const key=process.env.GEMINI_API_KEY;const secret=process.env.RATE_LIMIT_SECRET;
    if(!key)throw new ServiceError(503,'Gemini study tools are not configured yet. Reading and translation comparison are available.');
    if(!secret||secret.length<32)throw new ServiceError(503,'AI request limits are not configured yet.');
    const model=process.env.GEMINI_MODEL??'gemini-3.1-flash-lite';
    const result=await study(body,clientIp(request.headers,Math.max(1,Math.min(5,Number(process.env.TRUSTED_PROXY_HOPS)||1))),{
      store:getStore(),secret,model,version:process.env.AI_CACHE_VERSION??'1',
      perKeyLimit:limit('AI_PER_KEY_DAILY_LIMIT',10),globalLimit:limit('AI_GLOBAL_DAILY_LIMIT',50),
      generate:(input,context)=>generateWithGemini(input,context,{key,model})
    });
    return Response.json(result,{headers:{'Cache-Control':'no-store'}});
  }catch(error){return errorResponse(error);}
}
