import Link from 'next/link';
export default function NotFound() { return <main id="main" className="library"><h1>Passage not found</h1><p className="muted">Check the book, chapter, verse, and translation in the link.</p><Link href="/bible">Choose a passage</Link></main>; }
