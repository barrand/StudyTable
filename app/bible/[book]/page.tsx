import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/header";
import { findBook } from "@/lib/books";
export default async function Chapters({
  params,
}: {
  params: Promise<{ book: string }>;
}) {
  const book = findBook((await params).book);
  if (!book) notFound();
  return (
    <>
      <Header title={book.name} back="/bible" />
      <main className="picker">
        <h1>Choose a chapter in {book.name}</h1>
        <p className="subtle">Select a chapter to enter the reader.</p>
        <div className="choices chapters">
          {Array.from({ length: book.chapters }, (_, i) => (
            <Link
              className="choice"
              key={i}
              href={`/bible/${book.slug}/${i + 1}`}
            >
              {i + 1}
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
