import Link from "next/link";
import { Header } from "@/components/header";
import { books } from "@/lib/books";
export default function Bible() {
  return (
    <>
      <Header title="Holy Bible" back="/" />
      <main className="picker">
        <h1>Choose a book</h1>
        <p className="subtle">
          <Link href="/search">Find a passage</Link>
        </p>
        {["Old Testament", "New Testament"].map((testament) => (
          <section key={testament}>
            <h2 className="testament">{testament}</h2>
            <div className="choices">
              {books
                .filter((b) => b.testament === testament)
                .map((b) => (
                  <Link
                    className="choice"
                    key={b.code}
                    href={`/bible/${b.slug}`}
                  >
                    {b.name}
                  </Link>
                ))}
            </div>
          </section>
        ))}
      </main>
    </>
  );
}
