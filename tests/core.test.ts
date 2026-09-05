import test from "node:test";
import assert from "node:assert/strict";
import { scryptSync } from "node:crypto";
import { readFileSync } from "node:fs";
import { books, parseReference, bibleHubUrl } from "../lib/books";
import { getChapter, getVerse, searchCorpus } from "../lib/corpus";
import { getTerms } from "../lib/words";
import { cleanUsfm } from "../scripts/import-corpus";
import { createSession, validSession, safeReturn } from "../lib/session";
import { verifyPassword } from "../lib/password";
import { quotaDecision, LimitError } from "../lib/quota-policy";
import { studyInput, studyOutput } from "../lib/study-schema";
test("canonical corpus has 66 books, all chapters, unique ordered verses and no USFM residue", () => {
  assert.equal(books.length, 66);
  assert.equal(
    books.reduce((n, b) => n + b.chapters, 0),
    1189,
  );
  for (const translation of ["WEB", "KJV"] as const)
    for (const book of books)
      for (let c = 1; c <= book.chapters; c++) {
        const chapter = getChapter(book.slug, c, translation);
        assert.ok(chapter.length > 0, `${translation} ${book.name} ${c}`);
        let previous = 0;
        for (const v of chapter) {
          assert.ok(v.number > previous);
          previous = v.number;
          assert.ok(!/\\|strong=|<[^>]+>/.test(v.text));
        }
      }
  assert.equal(getChapter("../outside", 1, "KJV").length, 0);
});
test("USFM keeps nested word content and punctuation and removes notes without joining words", () => {
  assert.equal(
    cleanUsfm(
      'He \\w said|strong="G1"\\w*, \\f + \\ft a note\\f* “\\+w love|strong="G2"\\+w*.”',
    ),
    "He said, “love.”",
  );
  assert.equal(cleanUsfm('\\w God|strong="G1"\\w*’s word.'), "God’s word.");
});
test("references resolve correctly, including numbered books and out-of-range chapters", () => {
  assert.deepEqual(parseReference("John 3:16"), {
    work: "bible",
    book: "john",
    chapter: 3,
    verse: 16,
  });
  assert.equal(parseReference("1 John 1:1")?.book, "1-john");
  assert.equal(parseReference("Matthew 29"), null);
  assert.match(
    getVerse(parseReference("John 3:16")!, "KJV")!.text,
    /only begotten Son/,
  );
  assert.match(
    getVerse(parseReference("Genesis 1:1")!, "KJV")!.text,
    /In the beginning God created/,
  );
  assert.equal(
    getVerse({ ...parseReference("John 3:16")!, verse: 99 }, "WEB"),
    undefined,
  );
  assert.equal(
    bibleHubUrl(parseReference("1 John 1:1")!),
    "https://biblehub.com/1_john/1-1.htm",
  );
  assert.equal(
    bibleHubUrl(parseReference("Song of Solomon 1:1")!),
    "https://biblehub.com/songs/1-1.htm",
  );
});
test("literal search treats regex characters literally and observes word boundaries", () => {
  assert.ok(searchCorpus("love one another", "KJV").total > 0);
  assert.equal(searchCorpus(".*", "KJV").total, 0);
  const results = searchCorpus("he", "KJV").results;
  assert.ok(results.length > 0);
  assert.ok(results.every((v) => /\bhe\b/i.test(v.text)));
});
test("Greek and Hebrew word studies are sourced with resolved occurrences", () => {
  for (const reference of ["John 3:16", "Genesis 1:1"]) {
    const terms = getTerms(parseReference(reference)!, "KJV");
    assert.ok(terms.length > 0 && terms.length <= 3, reference);
    assert.ok(
      terms.every(
        (t) =>
          t.transliteration &&
          t.lemma &&
          t.grammar &&
          t.range &&
          t.occurrences.every((r) => getVerse(r, "KJV")),
      ),
    );
    assert.ok(
      terms.every(
        (t) =>
          t.language === (reference.startsWith("John") ? "Greek" : "Hebrew"),
      ),
    );
  }
  const sources = JSON.parse(readFileSync("data/sources.json", "utf8"));
  assert.ok(
    sources.STEPBible.sources.every(
      (s: { sha256: string; license: string }) =>
        /^[a-f0-9]{64}$/.test(s.sha256) && s.license === "CC BY 4.0",
    ),
  );
});
test("study request schema rejects oversized questions and client-supplied scripture", () => {
  const base = {
    reference: parseReference("John 3:16"),
    translation: "WEB",
    action: "context",
  };
  assert.ok(studyInput.safeParse(base).success);
  for (const input of [
    { ...base, text: "invented text" },
    { ...base, translation: "NIV" },
    { ...base, action: "ask" },
    { ...base, action: "ask", question: "x".repeat(501) },
    { ...base, question: "why" },
  ])
    assert.equal(studyInput.safeParse(input).success, false);
  assert.equal(
    studyOutput.safeParse({
      observations: ["x"],
      interpretations: [],
      relatedReferences: [],
      cautions: [],
      html: "<script>",
    }).success,
    false,
  );
});
test("sessions expire and cannot be forged; return URLs remain local", async () => {
  const secret = "test-session-secret-must-be-long-enough",
    now = Date.now(),
    token = await createSession(secret, now);
  assert.equal(await validSession(token, secret, now), true);
  assert.equal(await validSession(token + "x", secret, now), false);
  assert.equal(
    await validSession(
      token,
      "a-different-secret-long-enough-for-testing",
      now,
    ),
    false,
  );
  assert.equal(await validSession(token, secret, now + 8 * 86400000), false);
  for (const url of [
    "//evil.example",
    "/\\evil.example",
    "https://evil.example",
    "/access",
  ])
    assert.equal(safeReturn(url), "/");
  assert.equal(safeReturn("/bible/john/3?verse=16"), "/bible/john/3?verse=16");
});
test("password hashes validate without storing plaintext", async () => {
  const password = "a-long-test-password",
    salt = "0123456789abcdef",
    stored = `scrypt:${salt}:${scryptSync(password, salt, 32).toString("hex")}`;
  assert.equal(await verifyPassword(password, stored), true);
  assert.equal(await verifyPassword("wrong", stored), false);
  assert.equal(await verifyPassword(password, "bad"), false);
});
test("both personal and global budgets stop before another request", () => {
  assert.deepEqual(quotaDecision(9, 49, 10, 50), {
    local: 10,
    global: 50,
    remaining: 0,
  });
  assert.throws(() => quotaDecision(10, 20, 10, 50), LimitError);
  assert.throws(() => quotaDecision(1, 50, 10, 50), LimitError);
});
