import { redirect } from 'next/navigation';
import { hasSession } from '@/server/session';
export const dynamic='force-dynamic';
export default async function WorkspaceLayout({children}:{children:React.ReactNode}) {
  if(!await hasSession())redirect('/access');
  return children;
}
