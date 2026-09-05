import { Header } from "@/components/header";
import sources from "@/data/sources.json";
export default function Sources() {
  return (
    <>
      <Header title="Sources & licenses" back="/bible" />
      <main className="picker prose">
        <h1>Sources &amp; licenses</h1>
        <h2>Bible text</h2>
        {[sources.WEB, sources.KJV].map((source) => (
          <section key={source.edition}>
            <h3>{source.edition}</h3>
            <p>{source.attribution}</p>
            <p>{source.changes}</p>
            <a href={source.rightsUrl} target="_blank" rel="noreferrer">
              Source and rights information ↗
            </a>
          </section>
        ))}
        <h2>Word study</h2>
        <p>
          Source-language text, brief lexical definitions, and morphology are
          from{" "}
          <a href="https://www.stepbible.org" target="_blank" rel="noreferrer">
            STEP Bible
          </a>
          , based on work at Tyndale House Cambridge. Each bundled dataset is
          licensed under{" "}
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            target="_blank"
            rel="noreferrer"
          >
            CC BY 4.0
          </a>
          .
        </p>
        <p>
          TAGNT includes multiple Greek witnesses; the study aid uses TR for KJV
          and Byzantine readings for WEB. TAHOT uses Leningrad-based Hebrew and
          Aramaic with English verse mapping. These help explain language; they
          do not claim an exact word-for-word alignment with an English
          translation. Brief definitions, tags, and occurrence lists have been
          normalized and shortened. Full lexicons are not bundled.
        </p>
        <details>
          <summary>Exact datasets and versions</summary>
          {sources.STEPBible.sources.map((source) => (
            <p key={source.file}>
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.file}
              </a>
              <br />
              Revision {source.version.slice(0, 12)} · {source.license}
            </p>
          ))}
        </details>
        <h2>AI guidance</h2>
        <p>
          AI responses are generated for the selected passage and translation.
          Only scripture references are checked against our local corpus.
          External scholarly citations are not included. Responses can be
          incomplete or mistaken; distinguish observations from interpretive
          possibilities.
        </p>
        <h2>External links</h2>
        <p>
          Bible Hub links open a separate website. Study Table does not fetch,
          scrape, or use Bible Hub content as an AI source.
        </p>
        <h2>Privacy</h2>
        <p>
          Your translation preference and last reading place stay in this
          browser. Study Table does not save questions, answers, notes, or
          account profiles. AI requests are sent to Google with interaction
          storage disabled; provider processing is subject to Google's terms.
          Temporary, hashed request counters enforce the daily allowance. A
          shared network may share an allowance.
        </p>
      </main>
    </>
  );
}
