import { NextResponse } from 'next/server';
import { SESSION_COOKIE, SESSION_SECONDS, signSession, verifyPassword } from '@/server/auth';
import { boundedText, checkOrigin, errorResponse, publicOrigin } from '@/server/http';
import { getStore } from '@/server/store';
import { clientIp, throttle, trustedProxyHops } from '@/server/limits';
import { ServiceError } from '@/server/errors';
export const runtime='nodejs';
export async function POST(request:Request) {
  try {
    checkOrigin(request);
    if(!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded'))throw new ServiceError(415,'Unsupported form type.');
    const hash=process.env.ACCESS_PASSWORD_HASH;const secret=process.env.SESSION_SECRET;const rateSecret=process.env.RATE_LIMIT_SECRET;
    if(!hash||!secret||secret.length<32||!rateSecret||rateSecret.length<32)throw new ServiceError(503,'Private access is not configured yet.');
    const password=new URLSearchParams(await boundedText(request,4096)).get('password')??'';
    await throttle(getStore(),clientIp(request.headers,trustedProxyHops()),rateSecret,'access',5,300000);
    if(!await verifyPassword(password,hash))return NextResponse.redirect(new URL('/access?error=password',publicOrigin(request)),303);
    const response=NextResponse.redirect(new URL('/',publicOrigin(request)),303);
    response.cookies.set(SESSION_COOKIE,signSession(secret),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:SESSION_SECONDS});
    response.headers.set('Cache-Control','no-store');return response;
  }catch(error){return errorResponse(error);}
}
