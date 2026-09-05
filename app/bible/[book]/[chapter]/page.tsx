import { notFound } from "next/navigation";
import { findBook } from "@/lib/books";
import { getChapter, adjacentChapter } from "@/lib/corpus";
import Reader from "@/components/reader";
export default async function Chapter({
  params,
  searchParams,
}: {
  params: Promise<{ book: string; chapter: string }>;
  searchParams: Promise<{ verse?: string; translation?: string }>;
}) {
  const route = await params,
    query = await searchParams,
    book = findBook(route.book),
    chapter = Number(route.chapter);
  if (
    !book ||
    !Number.isInteger(chapter) ||
    chapter < 1 ||
    chapter > book.chapters
  )
    notFound();
  const corpus = {
    WEB: getChapter(book.slug, chapter, "WEB"),
    KJV: getChapter(book.slug, chapter, "KJV"),
  };
  const verse = query.verse !== undefined ? Number(query.verse) : undefined;
  if (
    verse !== undefined &&
    (!Number.isInteger(verse) ||
      verse < 1 ||
      (!corpus.WEB.some((v) => v.number === verse) &&
        !corpus.KJV.some((v) => v.number === verse)))
  )
    notFound();
  return (
    <Reader
      key={`${book.slug}/${chapter}`}
      book={book}
      chapter={chapter}
      corpus={corpus}
      initialVerse={verse}
      initialTranslation={
        query.translation === "KJV"
          ? "KJV"
          : query.translation === "WEB"
            ? "WEB"
            : undefined
      }
      previous={adjacentChapter(book.slug, chapter, -1)}
      next={adjacentChapter(book.slug, chapter, 1)}
    />
  );
}
