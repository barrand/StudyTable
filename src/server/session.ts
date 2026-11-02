import { cookies } from 'next/headers';
import { SESSION_COOKIE, devBypass, verifySession } from './auth';
export async function hasSession() {
  if (process.env.PUBLIC_ACCESS === 'true') return true;
  return devBypass()||verifySession((await cookies()).get(SESSION_COOKIE)?.value,process.env.SESSION_SECRET);
}
