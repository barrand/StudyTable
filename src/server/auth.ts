import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const derive = promisify(scrypt);
export const SESSION_COOKIE = 'study-table-session';
export const SESSION_SECONDS = 8 * 60 * 60;
export function devBypass(env: NodeJS.ProcessEnv = process.env) { return env.NODE_ENV === 'development' && env.ALLOW_DEV_ACCESS === 'true'; }
export async function hashPassword(password: string, salt = randomBytes(16).toString('hex')) {
  const derived = await derive(password, salt, 64) as Buffer;
  return `scrypt:${salt}:${derived.toString('hex')}`;
}
export async function verifyPassword(password: string, hash: string) {
  if (!password || password.length > 1024 || !/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(hash)) return false;
  const actual = await hashPassword(password, hash.split(':')[1]);
  return timingSafeEqual(Buffer.from(actual), Buffer.from(hash));
}
function signature(payload: string, secret: string) {return createHmac('sha256',secret).update(payload).digest('base64url');}
export function signSession(secret: string, now = Date.now()) {
  if (secret.length < 32) throw new Error('Session signing secret must have at least 32 characters');
  const payload=Buffer.from(JSON.stringify({v:1,expires:now+SESSION_SECONDS*1000,id:randomBytes(16).toString('hex')})).toString('base64url');
  return `${payload}.${signature(payload,secret)}`;
}
export function verifySession(token: string | undefined, secret: string | undefined, now = Date.now()): boolean {
  if (!token || token.length>512 || !secret || secret.length<32) return false;
  try {
    const [payload,sig,...extra]=token.split('.'); if(extra.length||!payload||!sig)return false;
    const expected=Buffer.from(signature(payload,secret));const actual=Buffer.from(sig);
    if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return false;
    const data=JSON.parse(Buffer.from(payload,'base64url').toString());
    return data.v===1&&Number.isFinite(data.expires)&&data.expires>now&&data.expires<=now+SESSION_SECONDS*1000&&/^[a-f0-9]{32}$/.test(data.id);
  } catch {return false;}
}
