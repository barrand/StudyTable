import Link from 'next/link';
import { Header, Library } from '@/components/library';
import { readerUrl, referenceLabel, type Translation } from '@/lib/books';
import { searchCorpus } from '@/lib/corpus';

export default async function Search({ searchParams }: {searchParams:Promise<{q?:string;translation?:string}>}) {
  const params = await searchParams;
  const query = typeof params.q === 'string' ? params.q.slice(0,200) : '';
  const translation: Translation = params.translation === 'KJV' ? 'KJV' : 'WEB';
  const found = query ? await searchCorpus(query,translation) : null;
  return <><Header title="Find a passage" back="/bible" /><Library title="Search scripture" description="Enter a reference, or an exact word or phrase. Search ignores letter case."><form className="search-form" action="/search"><label htmlFor="query">Reference or exact phrase</label><div className="form-row"><input id="query" name="q" maxLength={200} defaultValue={query} placeholder="John 3:16 or love one another" required /><select aria-label="Search translation" name="translation" defaultValue={translation}><option>WEB</option><option>KJV</option></select><button>Search</button></div></form>{found && <section aria-label="Search results"><p className="muted">{found.total ? `${found.total} result${found.total===1?'':'s'}${found.total>50?' · showing the first 50':''}` : 'No matching passages. Check the reference or try a shorter exact phrase.'}</p>{found.reference && <Link className="choice" href={readerUrl(found.reference,translation)}>{referenceLabel(found.reference)} · {translation}</Link>}{found.results.map(([book,chapter,verse,text]) => <Link className="search-result" key={`${book}-${chapter}-${verse}`} href={readerUrl({book,chapter,verse},translation)}><strong>{referenceLabel({book,chapter,verse})} · {translation}</strong><p>{text}</p></Link>)}</section>}</Library></>;
}
