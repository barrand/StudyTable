import { Header, Library } from '@/components/library';
export default async function Access({searchParams}:{searchParams:Promise<{error?:string}>}) {
  const error=(await searchParams).error;
  return <><Header title="Study Table"/><Library title="Welcome to the table" description="A private space for reading and study. Enter the shared invite password to continue."><form action="/api/access" method="post"><label htmlFor="password">Invite password</label><div className="form-row"><input id="password" name="password" type="password" autoComplete="current-password" maxLength={1024} required/><button>Enter</button></div>{error&&<p role="alert">{error==='password'?'That password did not match. Try again.':'Access is temporarily unavailable. Please try again later.'}</p>}</form></Library></>;
}
