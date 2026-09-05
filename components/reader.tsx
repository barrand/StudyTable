"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Header } from "./header";
import {
  bibleHubUrl,
  referenceLabel,
  referenceUrl,
  type Book,
  type Reference,
  type Translation,
  type Verse,
} from "@/lib/books";
import type { StudyOutput } from "@/lib/study-schema";
import type { StudyTerm } from "@/lib/words";
type Answer = Omit<StudyOutput, "relatedReferences"> & {
  relatedReferences: (StudyOutput["relatedReferences"][number] & {
    text: string;
  })[];
  terms: StudyTerm[];
  remaining: number;
};
export default function Reader({
  book,
  chapter,
  corpus,
  initialVerse,
  initialTranslation,
  previous,
  next,
}: {
  book: Book;
  chapter: number;
  corpus: Record<Translation, Verse[]>;
  initialVerse?: number;
  initialTranslation?: Translation;
  previous: string | null;
  next: string | null;
}) {
  const [translation, setTranslation] = useState<Translation>(
      initialTranslation ?? "WEB",
    ),
    [compare, setCompare] = useState(false),
    [selected, setSelected] = useState<number | null>(null),
    [question, setQuestion] = useState(""),
    [answer, setAnswer] = useState<Answer | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [remaining, setRemaining] = useState<number | null>(null),
    [keyboardViewport, setKeyboardViewport] = useState<{
      bottom: number;
      maxHeight: number;
    } | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null),
    lastTrigger = useRef<HTMLButtonElement | null>(null),
    controller = useRef<AbortController | null>(null),
    requestId = useRef(0),
    settings = useRef<HTMLDetailsElement>(null);
  const reference: Reference = {
    work: "bible",
    book: book.slug,
    chapter,
    verse: selected ?? 1,
  };
  const cancel = () => {
    requestId.current++;
    controller.current?.abort();
    setLoading(false);
  };
  const close = () => {
    cancel();
    setSelected(null);
    setAnswer(null);
    setError("");
    lastTrigger.current?.focus({ preventScroll: true });
  };
  useEffect(() => {
    try {
      const saved = localStorage.getItem("study-translation");
      if (!initialTranslation && (saved === "WEB" || saved === "KJV"))
        setTranslation(saved);
      localStorage.setItem(
        "study-last",
        JSON.stringify({ book: book.slug, chapter }),
      );
    } catch {}
    if (initialVerse)
      requestAnimationFrame(() =>
        document
          .getElementById(`verse-${initialVerse}`)
          ?.scrollIntoView({ block: "center" }),
      );
    return () => controller.current?.abort();
  }, [book.slug, chapter, initialTranslation, initialVerse]);
  useEffect(() => {
    if (selected !== null) closeRef.current?.focus({ preventScroll: true });
  }, [selected]);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (selected === null || !viewport) {
      setKeyboardViewport(null);
      return;
    }
    const update = () =>
      setKeyboardViewport(
        viewport.height < window.innerHeight * 0.75
          ? {
              bottom: Math.max(
                0,
                window.innerHeight - viewport.height - viewport.offsetTop,
              ),
              maxHeight: viewport.height - 16,
            }
          : null,
      );
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, [selected]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (selected !== null) close();
        else if (settings.current) settings.current.open = false;
      }
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  });
  function chooseTranslation(value: Translation) {
    cancel();
    setTranslation(value);
    setSelected(null);
    setAnswer(null);
    setError("");
    try {
      localStorage.setItem("study-translation", value);
    } catch {}
  }
  async function study(action: "context" | "related" | "word-study" | "ask") {
    if (selected === null) return;
    cancel();
    const id = requestId.current;
    controller.current = new AbortController();
    setLoading(true);
    setError("");
    setAnswer(null);
    try {
      const response = await fetch("/api/study", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference,
          translation,
          action,
          ...(action === "ask" ? { question } : {}),
        }),
        signal: controller.current.signal,
      });
      const data = await response.json();
      if (id !== requestId.current) return;
      if (typeof data.remaining === "number") setRemaining(data.remaining);
      if (!response.ok) throw new Error(data.error);
      setAnswer(data);
      setQuestion("");
    } catch (error) {
      if (
        id === requestId.current &&
        !(error instanceof DOMException && error.name === "AbortError")
      )
        setError(error instanceof Error ? error.message : "Please try again.");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }
  const secondary: Translation = translation === "WEB" ? "KJV" : "WEB";
  const numbers = [
    ...new Set(
      [...corpus[translation], ...(compare ? corpus[secondary] : [])].map(
        (v) => v.number,
      ),
    ),
  ].sort((a, b) => a - b);
  function verseButton(
    number: number,
    version: Translation,
    isSecondary = false,
  ) {
    const verse = corpus[version].find((v) => v.number === number);
    return (
      <button
        id={!isSecondary ? `verse-${number}` : undefined}
        className={`verse ${selected === number ? "selected" : ""} ${isSecondary ? "secondary-column" : ""}`}
        key={version}
        type="button"
        aria-pressed={selected === number}
        aria-label={`${book.name} ${chapter}:${number}, ${version}. Study verse`}
        onClick={(event) => {
          cancel();
          if (version !== translation) {
            setTranslation(version);
            try {
              localStorage.setItem("study-translation", version);
            } catch {}
          }
          lastTrigger.current = event.currentTarget;
          setSelected(number);
          setAnswer(null);
          setError("");
          setQuestion("");
        }}
      >
        <sup>{verse?.label ?? number}</sup>
        {verse?.text || (
          <span className="subtle">
            {verse
              ? `Verse omitted in ${version}.`
              : `No separately numbered verse in ${version}.`}
          </span>
        )}
      </button>
    );
  }
  return (
    <>
      <Header
        title={`${book.name} ${chapter}`}
        back={`/bible/${book.slug}`}
        backLabel={`Choose another chapter in ${book.name}`}
      >
        <details className="settings" ref={settings}>
          <summary className="icon" aria-label="Settings">
            ⚙
          </summary>
          <div className="settings-menu">
            <label>
              Reading translation
              <select
                value={translation}
                onChange={(e) =>
                  chooseTranslation(e.target.value as Translation)
                }
              >
                <option value="WEB">WEB · World English Bible</option>
                <option value="KJV">KJV · King James Version</option>
              </select>
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={compare}
                onChange={(e) => setCompare(e.target.checked)}
              />
              Compare translations
            </label>
            <Link href="/search">Find a passage</Link>
            <Link href="/sources">Sources &amp; licenses</Link>
            {remaining !== null && (
              <span className="subtle">
                {remaining} study requests remaining today
              </span>
            )}
            <button
              className="plain"
              onClick={async () => {
                await fetch("/api/access", { method: "DELETE" });
                window.location.assign("/access");
              }}
            >
              Leave private access
            </button>
          </div>
        </details>
      </Header>
      <main
        className={`reader ${compare ? "compare" : ""} ${selected !== null ? "sheet-open" : ""}`}
        aria-label={`${book.name} chapter ${chapter}`}
      >
        {compare && (
          <>
            <div className="column-labels">
              <span>{translation}</span>
              <span>{secondary}</span>
            </div>
            <div className="mobile-switch" aria-label="Compare translations">
              {(["WEB", "KJV"] as const).map((t) => (
                <button
                  className="action"
                  key={t}
                  aria-pressed={translation === t}
                  onClick={() => chooseTranslation(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </>
        )}
        {numbers.map((number) => (
          <div key={number} className={compare ? "verse-row" : ""}>
            {verseButton(number, translation)}
            {compare && verseButton(number, secondary, true)}
          </div>
        ))}
        <nav className="chapter-nav" aria-label="Chapter navigation">
          {previous ? (
            <Link href={previous}>‹ Previous chapter</Link>
          ) : (
            <span />
          )}
          {next && <Link href={next}>Next chapter ›</Link>}
        </nav>
      </main>
      {selected !== null && (
        <aside
          className="sheet"
          aria-label="Study selected verse"
          style={keyboardViewport ?? undefined}
        >
          <div className="sheet-head">
            <div>
              <h2>Study this passage</h2>
              <div className="selected-ref">
                {referenceLabel(reference)} · {translation}
              </div>
            </div>
            <button className="plain" ref={closeRef} onClick={close}>
              Close
            </button>
          </div>
          <div className="actions">
            <button
              className="action"
              disabled={loading}
              onClick={() => study("context")}
            >
              Deeper context
            </button>
            <button
              className="action"
              disabled={loading}
              onClick={() => study("related")}
            >
              Related verses
            </button>
            <button
              className="action"
              disabled={loading}
              onClick={() => study("word-study")}
            >
              Word study
            </button>
            <a
              className="action"
              href={bibleHubUrl(reference)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Bible Hub ↗
            </a>
          </div>
          <form
            className="question"
            onSubmit={(event) => {
              event.preventDefault();
              study("ask");
            }}
          >
            <label htmlFor="study-question" className="sr-only">
              Ask about this passage
            </label>
            <input
              id="study-question"
              placeholder="Ask about this passage…"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={500}
              required
            />
            <button className="primary" disabled={loading || !question.trim()}>
              Ask
            </button>
          </form>
          <div className="response" aria-live="polite" aria-busy={loading}>
            {loading && <p>Studying this passage…</p>}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            {!loading && !answer && !error && (
              <p className="subtle">
                Choose a prompt or ask a focused question.
              </p>
            )}
            {answer && (
              <>
                <h3>AI-generated study guidance</h3>
                {answer.observations.length > 0 && (
                  <>
                    <h3>Observations</h3>
                    {answer.observations.map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </>
                )}
                {answer.interpretations.length > 0 && (
                  <>
                    <h3>Interpretive possibilities</h3>
                    {answer.interpretations.map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </>
                )}
                {answer.terms.map((term) => (
                  <section key={term.id}>
                    <h3>
                      <span lang={term.language === "Greek" ? "el" : "he"}>
                        {term.lemma}
                      </span>{" "}
                      · {term.transliteration}
                    </h3>
                    <p>
                      {term.language} · {term.id}
                      <br />
                      {term.edition}
                    </p>
                    <p>
                      <strong>Contextual gloss:</strong> {term.gloss}
                      <br />
                      <strong>Grammar:</strong> {term.grammar}
                    </p>
                    <p>
                      <strong>Lexical range:</strong> {term.range}
                    </p>
                    <p>
                      {term.occurrences.map((ref) => (
                        <span key={referenceLabel(ref)}>
                          <Link href={referenceUrl(ref, translation)}>
                            {referenceLabel(ref)}
                          </Link>
                          {" · "}
                        </span>
                      ))}
                    </p>
                  </section>
                ))}
                {answer.terms.length > 0 && (
                  <p className="subtle">
                    Word data:{" "}
                    <a
                      href="https://www.stepbible.org"
                      target="_blank"
                      rel="noreferrer"
                    >
                      STEP Bible
                    </a>{" "}
                    · CC BY 4.0. Lexical range is not a single hidden meaning.
                  </p>
                )}
                {answer.relatedReferences.map((item, i) => (
                  <section key={i}>
                    <Link href={referenceUrl(item.reference, translation)}>
                      {referenceLabel(item.reference)}
                    </Link>
                    <p>{item.reason}</p>
                    <blockquote>{item.text}</blockquote>
                  </section>
                ))}
                {answer.cautions.map((p, i) => (
                  <p className="subtle" key={i}>
                    {p}
                  </p>
                ))}
              </>
            )}
          </div>
          <p className="disclaimer">
            AI is a study aid and may be incomplete. Check references. External
            scholarly citations are not included.
          </p>
        </aside>
      )}
    </>
  );
}
