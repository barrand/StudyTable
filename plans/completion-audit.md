# MVP completion audit — 2026-10-26

Scope: `requirements.md` sections 4–6, 8 and 10, and all mandatory behavior, validation steps, acceptance tests and implementation defaults in `plans/mvp.md`. Optional Study questions, additional licensed translations, accounts, notes, other scripture works, semantic search, scholarly retrieval and saved personal history remain outside MVP.

## Release evidence

- Application commit: `283b129b812953492618f44d9e386c3b0c8bd98b`, pushed to `main` before either deployment.
- [Exact-commit CI](https://github.com/barrand/StudyTable/actions/runs/40273709653): 30 unit/component tests, two real Firestore-adapter emulator tests, TypeScript, pinned corpus/source integrity, zero production dependency vulnerabilities, and the Next.js production build passed on Node 22.
- Preview rollout `study-table-preview/build-2026-10-26-005`: control-plane state `SUCCEEDED`; deployed access and Gemini/Firestore cache checks passed.
- Production rollout `study-table/build-2026-10-26-001`: control-plane state `SUCCEEDED`; the same-commit release guard, access checks, real reader/source pages, request rejection tests, and shared response-cache checks passed.
- [Production](https://study-table--study-table-a2869.us-central1.hosted.app) and [preview](https://study-table-preview--study-table-a2869.us-central1.hosted.app) remain protected by the shared invite gate. Runtime-only secrets are in the owner-selected `study-table-a2869` project. The environment-specific origin was verified by successful production sign-in and same-origin API tests.

## Requirement-by-requirement evidence

| Mandatory area | Authoritative evidence | Result |
| --- | --- | --- |
| Next.js App Router, TypeScript, Node 22, patched dependencies, Firebase App Hosting | `package.json`, `next.config.ts`, CI build, successful preview/production App Hosting builds | Pass |
| Scripture → book/testament → chapter → reader; Bible-only MVP | Workspace routes and `books.ts`; actual deployed chooser flow exercised with keyboard links | Pass |
| Complete KJV/WEB, reproducible pinned import, manifests, rights/attribution, no deployment-time downloads | `import-corpus.ts`, `source-lock.json`, source licenses page; offline verification of 2,380 generated files and 66 books/1,189 chapters per translation in CI | Pass |
| Reader navigation, direct verse URLs, local translation/last passage, responsive layout | Reader/route tests; deployed direct John 3:16 link; selection and translation URL updates, retained scroll position and resumed John 3:16/KJV link observed in the browser | Pass |
| Aligned chapter comparison and narrow-screen version switching | Shared verse-number rows and explicit omitted/combined rendering; browser parallel-column check, responsive checks and corpus/parser tests | Pass |
| Collapsed exact-verse translations, reading version first, reset on selection, hide in overview | Prototype/component tests plus actual Enter disclosure, source-text comparison, selection reset and chapter/verse mode checks; owner's phone check passed | Pass |
| Fixed sheet, internal scrolling, safe area/keyboard, Close/Escape/focus, semantic controls | Reader CSS/effects; component focus/stale-response/visual-viewport tests; browser AX names/landmarks, keyboard selection and disclosure, unchanged opening/closing scroll position; owner confirmed physical-phone keyboard flow | Pass |
| Reference and literal word/phrase search, invalid input state | Corpus search tests; deployed reference and seven-result exact-phrase searches; invalid John 3:999 displayed an explicit empty state | Pass |
| Visible chapter overview with book context, author/audience, people/history and uncertainty | Required action-specific Gemini JSON schema; full server-derived chapter/neighbor/book context; live output and rendered saved overview reviewed; event/composition dates distinguished | Pass |
| Gemini context, related passages, word study, custom question and follow-up | Server-only Interactions implementation (`store: false`, structured JSON, no tools/previous interaction); four-action live smoke plus actual related, question and two-turn signed-context follow-up checks passed | Pass |
| Source-backed Greek, Hebrew, Aramaic word study, editions/grammar/glosses/occurrences, lexical-range distinction | Pinned per-file STEPBible manifest and source importer; 1,189 word files verified; Greek/Hebrew/Aramaic tests; real Greek/Hebrew generation; both exact translations supplied for comparison; rendered attribution/limitations | Pass |
| AI scope/body/session validation, text-only rendering, qualified guidance and locally verified scripture links | Strict Zod input/result validation, source-term ID checks, local reference resolution and quotation/source-markup guard; malicious/malformed/scope/body/origin/session regression tests; deployed 400/401/403 checks | Pass |
| Persist validated standard answers across visits/visitors; separate passage/translation/action/model/version/source keys | `study-service.ts` identity and metadata; unit and real-adapter tests; actual production request reused the Firestore timestamp; explicit cache-hit metadata | Pass |
| Cache hits avoid Gemini/quota, concurrency lease, failure exclusion/expiry, no daily response TTL | Memory and real Firestore adapter tests, live repeated-call counters, failed/expired lease tests, deployed cache checks, cloud TTL declarations | Pass |
| Exact session-local custom-question reuse including generation versions; private bounded conversation | Reader regression tests and server-supplied version key; signed three-turn/expiry/scope/tamper tests; live follow-up; no custom content in persistent cache/provider interaction history | Pass |
| Shared-password gate, signed Secure/HttpOnly session, local bypass only in development | Scrypt/session tests, production-only gate/layout and no-store responses; real production browser sign-in and HTTP cookie assertions | Pass |
| Atomic 10-per-bucket/50-global daily attempts, cache independent of allowance, request/login throttle, anonymization/TTL | Firestore transaction integration and midnight/per-key/global tests; live four-generation budget blocked the next call; spoofed forwarding prefixes did not choose a bucket; four short-lived cloud TTL policies active | Pass |
| Owner-only invalidation/configuration, runtime secrets and no browser-key exposure | `AI_CACHE_VERSION`, configurable model/budgets, no public regenerate/admin UI; runtime-only Secret Manager bindings; production HTML and ten delivered same-origin scripts checked against all runtime secrets and invite password | Pass |
| Bible Hub external new-tab links only; visible source categories; no personal cloud storage | Per-verse deterministic external URLs with labels/`target`/`rel`; sources view and component/source inspection; no Bible Hub network ingestion, profiles, notes or saved custom conversations in app code | Pass |
| Preview before production, deploy pushed main, tests and commits | Same exact successful CI commit promoted with `release.ts`; actual successful rollout and HTTP/browser checks; Git commits pushed to `main` | Pass |

## Operational boundaries, not missing MVP features

- The shared invite and IP-derived bucket are not individual authentication or identity. Multiple readers can share a bucket. The global limit remains atomic.
- Preview and production intentionally share one project, cache, secrets and AI budget. Separate project-level isolation and automatic GitHub deployments are optional follow-ups; Firebase supports the verified local-source release path.
- Application code does not log personal questions or raw IPs. Google platform request logging is separate: `_Default` retains addresses/URLs for 30 days; `_Required` audit retention is 400 days. No logging protections were disabled.
- AI guidance is not historical/theological authority. Its disclosure, source boundaries, uncertainty prompts, local-reference checks and failure handling remain essential; validation is not a guarantee that every future natural-language claim is correct.
- Optional: formal assistive-technology certification, additional physical devices, cloud billing alerts, and further scholarly quality evaluation. Generation attempt limits are not a hard cap on total GCP charges.

Documentation and owner-validation tooling may be committed after the release; no application, corpus, dependency or hosting configuration change may be hidden behind that distinction.
