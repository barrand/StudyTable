import Link from "next/link";
import { Header } from "@/components/header";
import Resume from "@/components/resume";
export default function Home() {
  return (
    <>
      <Header />
      <main className="picker">
        <h1>Choose scripture</h1>
        <p className="subtle">Select a work to begin reading.</p>
        <Link href="/bible" className="choice work-choice">
          Holy Bible<small>KJV and World English Bible</small>
        </Link>
        <Resume />
      </main>
    </>
  );
}
