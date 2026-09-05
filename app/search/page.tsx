import Link from "next/link";
import { Header } from "@/components/header";
import {
  parseReference,
  referenceUrl,
  referenceLabel,
  type Translation,
} from "@/lib/books";
import { getVerse, searchCorpus } from "@/lib/corpus";
export default async function Search({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; translation?: string; page?: string }>;
}) {
  const query = await searchParams,
    q = (query.q ?? "").trim().slice(0, 120),
    translation: Translation = query.translation === "KJV" ? "KJV" : "WEB",
    page = Math.max(0, Math.min(1000, Number(query.page) || 0));
  const ref = parseReference(q),
    referenceQuery = /\d+:\d+$/.test(q) || !!ref;
  const hits =
    ref && getVerse(ref, translation)
      ? {
          results: [{ ...ref, text: getVerse(ref, translation)!.text }],
          total: 1,
        }
      : referenceQuery
        ? { results: [], total: 0 }
        : q.length > 1
          ? searchCorpus(q, translation, page * 30)
          : { results: [], total: 0 };
  return (
    <>
      <Header title="Find a passage" back="/bible" />
      <main className="picker">
        <h1>Find a passage</h1>
        <p className="subtle">Enter a reference, word, or exact phrase.</p>
        <form className="search-form">
          <label className="sr-only" htmlFor="q">
            Reference or phrase
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="John 3:16 or love one another"
            maxLength={120}
            required
          />
          <label className="sr-only" htmlFor="translation">
            Translation
          </label>
          <select
            id="translation"
            name="translation"
            defaultValue={translation}
          >
            <option>WEB</option>
            <option>KJV</option>
          </select>
          <button className="primary">Find</button>
        </form>
        {q && (
          <p className="subtle">
            {hits.total
              ? `${hits.total} result${hits.total === 1 ? "" : "s"} in ${translation}`
              : "No matching passage found. Check the reference or try another exact phrase."}
          </p>
        )}
        {hits.results.map((result) => {
          const reference = { work: "bible" as const, ...result };
          return (
            <Link
              className="search-result"
              key={referenceUrl(reference)}
              href={referenceUrl(reference, translation)}
            >
              {referenceLabel(reference)}
              <p>{result.text}</p>
            </Link>
          );
        })}
        {hits.total > (page + 1) * 30 && (
          <Link
            className="choice"
            href={`/search?q=${encodeURIComponent(q)}&translation=${translation}&page=${page + 1}`}
          >
            More results
          </Link>
        )}
      </main>
    </>
  );
}
