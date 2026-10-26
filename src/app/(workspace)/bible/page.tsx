import Link from 'next/link';
import { books } from '@/lib/books';
import { Header, Library } from '@/components/library';

export default function Bible() {
  return <><Header title="Holy Bible" back="/" /><Library title="Choose a book" description="Old and New Testament books in canonical order.">{['Old Testament','New Testament'].map(testament => <section key={testament}><h2 className="eyebrow">{testament}</h2><div className="choices">{books.filter(b => b.testament === testament).map(b => <Link className="choice" href={`/bible/${b.slug}`} key={b.id}>{b.name}</Link>)}</div></section>)}</Library></>;
}
