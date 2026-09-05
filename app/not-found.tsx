import Link from "next/link";
import { Header } from "@/components/header";
export default function NotFound() {
  return (
    <>
      <Header />
      <main className="picker">
        <h1>Passage not found</h1>
        <p className="subtle">
          That book, chapter, or verse is not in the Bible collection.
        </p>
        <Link className="choice" href="/bible">
          Choose a book
        </Link>
      </main>
    </>
  );
}
