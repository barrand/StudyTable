import Link from 'next/link';
import { notFound } from 'next/navigation';
import { findBook } from '@/lib/books';
import { Header, Library } from '@/components/library';

export default async function Chapters({ params }: { params: Promise<{book:string}> }) {
  const book = findBook((await params).book); if (!book) notFound();
  return <><Header title={book.name} back="/bible" /><Library title={`Choose a chapter in ${book.name}`} description="Select a chapter to enter the reader."><div className="choices chapters">{Array.from({length:book.chapters},(_,i)=><Link className="choice" key={i} href={`/bible/${book.slug}/${i+1}`}>{i+1}</Link>)}</div></Library></>;
}
