# Study Table MVP

## Summary

Build a reading-first, dark-mode Bible study web app with KJV and WEB. The central interaction is a reader that stays quiet until a reader taps one verse, opening a bottom-anchored study sheet with deliberately bounded AI help.

Book of Mormon, notes, accounts, highlights, saved AI history, passage-range selection, semantic search, and scholarly-source retrieval are post-MVP.

## Product and reader behavior

- Use Next.js App Router, TypeScript, Node 22, and Firebase App Hosting. Pin the app to an App Hosting-supported Next.js 15.2.x release and use the standard build command.
- Reader routes are `/bible/:book/:chapter` with an optional `verse` query parameter. The selected translation and last read reference persist locally; direct links always open the stated verse.
- At rest, show scripture with only a compact header: book navigation back arrow, centered passage title, and Settings icon. Do not show a persistent chapter subtitle, study controls, or comparison UI in the reader.
- Settings controls the primary translation and an optional comparison mode. Normal reading shows one translation; comparison renders aligned KJV and WEB columns on desktop and an inline switcher on mobile.
- Search supports valid Bible references and exact word/phrase matches only. It must not imply fuzzy, semantic, or AI-powered search.
- A verse is the sole selectable unit for MVP. Tapping another verse replaces the selection. Close, Escape, and tapping the sheet close control restore pure reading.
- The fixed study sheet respects mobile safe-area insets, keeps its own response area scrollable, manages focus when opened/closed, and uses semantic keyboard-accessible controls.
- Every Bible verse exposes a clearly external, new-tab Bible Hub link. Bible Hub content is never fetched, scraped, summarized, or used as an AI source.

## Corpus and source model

- Import canonical KJV and WEBP USFM distributions through a reproducible local script. Pin each source URL, edition label, download checksum, import timestamp, and attribution in a committed source manifest.
- Commit the generated, normalized per-translation/per-chapter JSON and compact reference/phrase-search index. Deployment builds must not fetch scripture content from third parties.
- Use the eBible WEBP 2020 stable text and retain its required naming/trademark guidance. Pin the exact KJV edition used before import.
- Add a visible Sources & Licenses view in Settings. It distinguishes: locally bundled Bible text, STEPBible source-language data, AI-generated study guidance, and external Bible Hub links.
- Bundle the necessary STEPBible tagged original-language text, brief lexicon, and morphology data under CC BY 4.0 with prominent attribution and an upstream link. Do not bundle full lexicons or unrelated datasets.

## AI, access, and data handling

- Provide a single server-only `POST /api/study` route. Its validated input is `{ reference, translation, action, question? }`, where `reference` is one canonical verse, `translation` is `KJV` or `WEB`, `action` is `context`, `related`, `word-study`, or `ask`, and `question` is required only for `ask` and capped at 500 characters.
- Derive all scripture text and immediate context from the server-side local corpus by reference; never accept client-supplied scripture as prompt context. Treat the custom question as untrusted text.
- Use Gemini Interactions API with `store: false`, no `previous_interaction_id`, no web grounding, and structured JSON responses. Each response contains separate `observations`, `interpretations`, `relatedReferences`, and `cautions` fields; never render model output as HTML.
- Resolve every model-suggested scripture reference against the local corpus before rendering it. Render linked references using local Study Table routes and, when needed, render quoted text from the local corpus rather than model-generated quotations.
- Label every answer as AI-generated study guidance, identify its selected verse and translation, distinguish observation from interpretation, and state that external scholarly citations are not included in MVP.
- Word study is Bible-only and offers one to three source-language terms associated with the selected verse, including source language, transliteration, concise gloss, grammar when available, lexical range, and linked occurrences. Explain that lexical range is not a hidden single meaning.
- Protect the deployment with one shared-password `/access` page in production. Verify against a secret password hash server-side, issue a signed HTTP-only session cookie, and allow a local-development bypass. This is a private demonstration gate, not user authentication or a content-security boundary.
- Enforce a server-side daily AI limit with a Firestore transaction. The document key is `HMAC(rate-limit-secret, client-IP + UTC-date)`; store only the hash, count, and `expireAt`. Limit each key to 10 requests per UTC day and reject requests once the configurable global limit of 50 requests/day is reached. Configure Firestore TTL on `expireAt`.
- Store the Gemini key, password hash, session-signing secret, and rate-limit secret in Firebase App Hosting/Secret Manager. Keep all Firebase Admin and Gemini access server-only.

## Validation and delivery sequence

1. Build and test the reader, corpus importer, direct URLs, reference/exact-phrase search, settings, comparison, mobile layout, and Bible Hub links.
2. Add the bottom-anchored selection sheet and verify changing selection, Close, Escape, focus handling, keyboard navigation, and small-screen keyboard behavior.
3. Add the stateless AI endpoint, response-schema validation, prompt-injection resistance, local-reference resolution, graceful Gemini failures, and the AI disclosure.
4. Add STEPBible-backed word study, source attribution, and tests for Greek New Testament and Hebrew Old Testament examples.
5. Add password access, Firestore rate limiting and TTL, Firebase secrets, App Hosting preview deployment, production rollout, and a manually tested Gemini cost ceiling.

## Acceptance tests

- A new reader reaches and reads a direct linked verse quickly on desktop and mobile; the correct translation and verse are visible.
- KJV and WEB are aligned in comparison mode; normal mode remains a distraction-free one-translation reader.
- Imported chapter counts, canonical book order, source metadata, checksums, and verse identifiers validate during import.
- A selected verse opens the fixed sheet without moving the reader position; selecting a different verse updates it; closing it returns to the untouched reading view.
- Reference and literal phrase search return only corpus-backed results; invalid references have a clear empty/error state.
- The study route rejects invalid verses, unsupported translations/actions, oversized questions, missing sessions, exhausted per-key quotas, and exhausted global quotas.
- AI output never produces unverified scripture links or model-authored scripture quotations, is visibly labeled, and Word study displays required STEPBible attribution.
- The deployed app reads all secrets from App Hosting configuration, exposes no Gemini key to the browser, and retains no user notes, identity data, or AI conversation history.

## Implementation defaults

- Firebase App Hosting deploys from `main`; preview environments are used before production rollouts.
- Use a generated static corpus and index committed to the repository; no database stores Bible text.
- Firestore is used only for short-lived, anonymized AI-quota counters; no Firebase Auth, user profiles, notes, or chat history are part of MVP.
- Treat this plan as the authoritative MVP scope. Reconcile `requirements.md` before implementation so Book of Mormon is explicitly post-MVP.
