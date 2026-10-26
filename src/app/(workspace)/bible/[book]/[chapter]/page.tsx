import { notFound } from 'next/navigation';
import { findBook, type Translation } from '@/lib/books';
import { loadChapter } from '@/lib/corpus';
import Reader from '@/components/reader';

export default async function ReaderPage({ params, searchParams }: { params: Promise<{book:string;chapter:string}>; searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  const [path, query] = await Promise.all([params, searchParams]);
  const book = findBook(path.book); const chapter = Number(path.chapter);
  if (!book || !/^\d+$/.test(path.chapter) || chapter < 1 || chapter > book.chapters) notFound();
  if (query.translation !== undefined && query.translation !== 'WEB' && query.translation !== 'KJV') notFound();
  const verse = typeof query.verse === 'string' && /^\d+$/.test(query.verse) ? Number(query.verse) : undefined;
  if (query.verse !== undefined && !verse) notFound();
  const [WEB, KJV] = await Promise.all([loadChapter({book:book.id,chapter},'WEB'),loadChapter({book:book.id,chapter},'KJV')]);
  if (verse && ![...WEB.verses,...KJV.verses].some(v=>v.number <= verse && (v.endVerse ?? v.number) >= verse)) notFound();
  return <Reader key={`${book.id}-${chapter}`} book={book} chapters={{WEB,KJV}} initialTranslation={query.translation as Translation|undefined} initialVerse={verse} />;
}
