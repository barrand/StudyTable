# Study Table MVP

## Summary

Build a reading-first, dark-mode Bible study web app with KJV and WEB. A compact Chapter overview action introduces the chapter in its book and historical setting; tapping one verse opens a bottom-anchored study sheet with translation comparison and deliberately bounded AI help. Google Gemini generates study responses, and reusable chapter and verse responses are persisted and served from a shared cache.

Book of Mormon, notes, accounts, highlights, saved personal AI history, passage-range selection, semantic search, and scholarly-source retrieval are post-MVP. Shared generated-content caching is included in MVP.

## Product and reader behavior

- Use Next.js App Router, TypeScript, Node 22, and Firebase App Hosting. Pin Next.js 15.5.28 with patched PostCSS 8.5.31 and use the standard build command. This replaces the original 15.2.x pin to incorporate current security patches; verify the newer minor in an App Hosting preview before rollout (Firebase's published active-support table still lists 15.2.x). See the [October 2026 Next.js security update](https://nextjs.org/blog/nextjs-security-update-october-14-2026).
- The root route starts with a scripture chooser containing one enabled option, **Holy Bible**, followed by a book chooser and chapter chooser. Choosing a chapter opens its reader route. A valid direct reader URL bypasses this onboarding flow, and returning readers may resume their locally stored last passage.
- Reader routes are `/bible/:book/:chapter` with an optional `verse` query parameter. The selected translation and last read reference persist locally; direct links always open the stated verse.
- At rest, show scripture with a compact header: book navigation back arrow, centered passage title, and Settings icon. Include one understated **Chapter overview** button above the chapter text; keep verse study controls and expanded comparison content hidden until requested.
- Chapter overview opens the same bottom-anchored study sheet without requiring a verse selection. Show the chapter and translation, a chapter summary, its place in the book and surrounding chapters, authorship/traditional attribution and intended audience, and historical setting and people. Distinguish the time of the narrated events from the time of composition, and acknowledge disputed authorship, dating, or historical reconstruction. Closing restores reading; selecting a verse switches to verse study mode and closes the overview content.
- Settings controls the primary translation and an optional comparison mode. Normal reading shows one translation; comparison renders aligned KJV and WEB columns on desktop and an inline switcher on mobile.
- Independently of chapter-wide comparison, the selected-verse sheet includes a collapsed **Translations** disclosure above the study actions. Expanding it shows that exact verse in KJV and WEB, reading translation first, as labeled parallel cards on desktop and stacked cards on mobile. Resolve text from the local corpus, show attribution, and identify a genuinely missing verse instead of substituting another verse. Selecting another verse resets the disclosure to collapsed and updates both texts. Hide this disclosure in chapter-overview mode; support native keyboard disclosure controls.
- Search supports valid Bible references and exact word/phrase matches only. It must not imply fuzzy, semantic, or AI-powered search.
- A verse is the sole selectable unit for MVP. Tapping another verse replaces the selection. Close, Escape, and tapping the sheet close control restore pure reading.
- The fixed study sheet respects mobile safe-area insets, keeps its own response area scrollable, manages focus when opened/closed, and uses semantic keyboard-accessible controls.
- Every Bible verse exposes a clearly external, new-tab Bible Hub link. Bible Hub content is never fetched, scraped, summarized, or used as an AI source.

## Corpus and source model

- Import canonical KJV and WEBP USFM distributions through a reproducible local script. Pin each source URL, edition label, download checksum, import timestamp, and attribution in a committed source manifest.
- Commit the generated, normalized per-translation/per-chapter JSON and compact reference/phrase-search index. Deployment builds must not fetch scripture content from third parties.
- Use the eBible WEBP 2020 stable text and retain its required naming/trademark guidance. Pin the exact KJV edition used before import.
- Add a visible Sources & Licenses view in Settings. It distinguishes: locally bundled Bible text, STEPBible source-language data, AI-generated study guidance, and external Bible Hub links.
- Pin the exact STEPBible source-language, lexicon, and morphology files required for word study. Record the version, checksum, upstream URL, and license for every file in the source manifest; do not assume all STEPBible datasets share one license. Bundle only files whose recorded license permits the intended use, with required attribution and change notices. Do not bundle full lexicons or unrelated datasets.

## AI, access, and data handling

- Provide a single server-only `POST /api/study` route. Its validated input is `{ reference, translation, action, question? }`, where `translation` is `KJV` or `WEB`. For `chapter-overview`, `reference` is one canonical chapter; for `context`, `related`, `word-study`, or `ask`, it is one canonical verse. Reject chapter/verse scope mismatches. `question` is required only for `ask` and capped at 500 characters.
- Derive all scripture text and immediate context from the server-side local corpus by reference; chapter overviews use the complete chapter, surrounding chapter context, and book-level context. Never accept client-supplied scripture as prompt context. Treat the custom question as untrusted text.
- **Google Gemini is the required provider for every AI action.** Use Gemini Interactions API with `store: false`, no `previous_interaction_id`, no web grounding, and structured JSON responses. Keep the model configurable server-side and record it in cached response metadata. Each response contains separate `observations`, `interpretations`, `relatedReferences`, and `cautions` fields; chapter overviews also contain `summary`, `bookContext`, `authorshipAndAudience`, and `historicalSettingAndPeople`. Never render model output as HTML. Provider-side `store: false` does not prevent the app from caching validated standard responses in Firestore.
- Resolve every model-suggested scripture reference against the local corpus before rendering it. Render linked references using local Study Table routes and, when needed, render quoted text from the local corpus rather than model-generated quotations.
- Label every answer as AI-generated study guidance, identify its selected verse and translation, distinguish observation from interpretation, and state that external scholarly citations are not included in MVP.
- Word study is Bible-only and offers one to three source-language terms associated with the selected verse, including source language, transliteration, concise gloss, grammar when available, lexical range, and linked occurrences. Explain that lexical range is not a hidden single meaning.
- Protect the deployment with one shared-password `/access` page in production. Verify against a secret password hash server-side, issue a signed HTTP-only session cookie, and allow a local-development bypass. This is a private demonstration gate, not user authentication or a content-security boundary.
- After session/input validation and a separate request throttle, check the shared response cache. On a cache miss, enforce a server-side daily generation limit with a Firestore transaction, atomically reserving both per-key and global quota before calling Gemini. The per-key document key is `HMAC(rate-limit-secret, client-IP + UTC-date)`; store only the hash, count, and `expireAt`. Limit each key to 10 generation attempts per UTC day and the configurable global limit to 50/day. Configure Firestore TTL on quota `expireAt`. Cache hits consume neither allowance and remain readable when generation limits are exhausted.
- Store the Gemini key, password hash, session-signing secret, and rate-limit secret in Firebase App Hosting/Secret Manager. Keep all Firebase Admin and Gemini access server-only.

## Generated-response caching

- Persist successful, schema-validated and reference-validated `chapter-overview`, `context`, `related`, and `word-study` responses in a server-only Firestore collection shared across visits and visitors. Standard prompts depend only on public scripture/source context, never a visitor's custom questions or personal information.
- Build a deterministic cache key from work, canonical reference with chapter/verse scope, translation and corpus edition/checksum, action, output language, configured Gemini model, prompt version, response-schema version, and relevant source-data versions. Store validated response JSON, generation timestamp, model, and version metadata. Revalidate a hit against the current schema and local reference resolver before returning it.
- Reuse a matching response without another Gemini request. Retain shared entries until explicit owner invalidation or a change in generation inputs/versions; do not apply a daily TTL or automatic regeneration on page load. Do not cache errors, partial responses, or invalid output. API responses identify whether content was cached and when it was generated.
- Use a transaction-backed, expiring generation lease per cache key so concurrent misses share one generation and only the lease owner reserves quota/calls Gemini. Recheck the cache after acquiring the lease. Waiters return the saved response or a retryable pending result without spending quota. Release failed leases and recover expired ones; perform no Gemini network call inside a Firestore transaction. Count actual generation attempts, including upstream failures, toward cost controls.
- Reuse exact trimmed custom-question requests within the current browser session only, keyed by canonical verse, translation, question, and generation versions. Keep these responses in memory, clear them when the session ends, and do not persist or share custom questions/answers. Changes in verse or translation never reuse the previous selection's answer.
- Treat the shared response cache as application content rather than saved personal AI history. Require the access session even for cache hits, keep Firestore access server-only, and provide an owner-operated invalidation mechanism through configuration or tooling rather than a public regenerate button/admin panel.

## Validation and delivery sequence

1. Build and test the scripture → book → chapter entry flow, reader, corpus importer, direct URLs, reference/exact-phrase search, settings, comparison, mobile layout, and Bible Hub links.
2. Add the bottom-anchored study sheet, chapter-overview entry point, and collapsed selected-verse translation comparison. Verify switching chapter/verse modes and selections, Close, Escape, focus handling, keyboard disclosure controls, and small-screen keyboard behavior.
3. Add the Gemini endpoint, chapter-overview context, response-schema validation, prompt-injection resistance, local-reference resolution, shared response cache and generation leases, graceful Gemini failures, and the AI disclosure. Verify cache hits avoid calls and quota charges.
4. Add STEPBible-backed word study, source attribution, and tests for Greek New Testament and Hebrew Old Testament examples.
5. Add password access, Firestore rate limiting and TTL, Firebase secrets, App Hosting preview deployment, production rollout, and a manually tested Gemini cost ceiling.

## Acceptance tests

- A new reader can choose Holy Bible, a book, and a chapter and reach the reader; a direct linked verse opens quickly on desktop and mobile with the correct translation and verse visible.
- KJV and WEB are aligned in comparison mode; normal mode remains a distraction-free one-translation reader.
- Imported chapter counts, canonical book order, source metadata, checksums, and verse identifiers validate during import.
- A selected verse opens the fixed sheet without moving the reader position; selecting a different verse updates it; closing it returns to the untouched reading view.
- The selected-verse Translations section starts collapsed, expands to the correct KJV and WEB verse, works with keyboard controls, and resets when another verse is selected. Chapter overviews hide verse-only comparison/actions.
- Chapter overview is available without selecting a verse and identifies its chapter/translation while explaining its place in the book, author/audience, and historical setting/people. Disputed historical claims are qualified; closing and switching to verse study preserve the reading position.
- Reference and literal phrase search return only corpus-backed results; invalid references have a clear empty/error state.
- The study route rejects invalid chapters/verses, action/reference-scope mismatches, unsupported translations/actions, oversized questions, and missing sessions. Cache misses reject exhausted per-key/global generation quotas; valid cache hits still succeed.
- Repeated standard requests across visits/visitors return persisted responses with no Gemini call or quota charge; simultaneous identical misses invoke Gemini once. Translation/action/version changes select different cache entries, failed/invalid generations are not cached, and expired generation leases recover. Custom-question reuse is session-local and cannot expose one visitor's question/answer to another.
- AI output never produces unverified scripture links or model-authored scripture quotations, is visibly labeled, and Word study displays required STEPBible attribution.
- The deployed app reads all secrets from App Hosting configuration, exposes no Gemini key to the browser, and retains no user notes, identity data, or AI conversation history.

## Implementation defaults

- Firebase App Hosting deploys from `main`; preview environments are used before production rollouts.
- Use a generated static corpus and index committed to the repository; no database stores Bible text.
- Firestore stores shared validated AI responses, temporary generation leases, and short-lived anonymized quota counters. No Firebase Auth, user profiles, notes, or personal chat history are part of MVP.
- Treat the interactive prototype as the source of truth for MVP navigation, hierarchy, and interaction behavior. Treat this plan as the source of truth for implementation architecture, security, data handling, and validation. `requirements.md` records the agreed product scope; Book of Mormon is explicitly post-MVP.
