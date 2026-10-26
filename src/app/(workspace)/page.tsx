import Link from 'next/link';
import { Header, Library } from '@/components/library';
import Resume from '@/components/resume';

export default function Home() {
  return <><Header title="Study Table" /><Library title="Choose scripture" description="Select a work to begin reading."><div className="choices"><Link className="choice" href="/bible">Holy Bible<small>KJV and World English Bible</small></Link></div><Resume /></Library></>;
}
