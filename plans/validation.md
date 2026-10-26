# MVP validation — 2026-10-26

## Verified

- Local checks: 30 unit/component tests and two Firestore emulator integration tests pass, along with TypeScript, the production Next.js build, both corpus integrity checks, and the production dependency audit (zero vulnerabilities). Each release also requires successful CI for its exact pushed main commit.
- Full KJV/WEB corpus: 66 books, 1,189 chapters per translation, pinned source/archive hashes. Original-language data: 1,189 chapter files with per-source rights review and source hashes.
- Deployed private preview: invite sign-in, Secure/HttpOnly/SameSite session cookie, real reader text, verse direct links, sources, missing-session rejection, invalid-reference rejection, and cross-origin rejection.
- Real Gemini: chapter overview, verse context, Greek John 3:16 word study, and Hebrew Genesis 1:1 word study validate. Unsupported/malformed responses and upstream errors have regression coverage. Newer Flash models returned upstream capacity errors; the tested configurable default is Gemini 3.1 Flash-Lite.
- Deployed Gemini overview: actual generation succeeds, persists in Firestore, and a second request returns the same generation timestamp as a saved response. The rendered overview includes book context, traditional/disputed authorship, audience, historical people, and separate event/composition periods.
- Firestore adapter integration: concurrent global and per-bucket quota reservations cannot overspend; separate service instances share generation leases and persisted answers; hits remain available after budget exhaustion; failed reservations do not leave active leases; `expireAt` is stored as a Firestore Timestamp.
- Cloud Firestore TTL configuration: active declarations for generation quotas, totals, leases, and request throttles; no daily TTL on reusable study responses. Unauthenticated direct collection access returns HTTP 403.
- Browser checks: verse panel opens collapsed translations; Enter expands exact KJV/WEB text; primary version comes first; switching selection resets disclosure; Close/Escape restore focus. Wide cards and narrow stacked cards render without horizontal overflow.
- Reduced-height 390×430 viewport: question input and Close remain reachable with internal sheet scrolling. A visual-viewport resize regression checks keyboard inset and restoration. This is not a physical-phone keyboard test.
- Custom follow-ups: signed, expiring, bounded passage/translation-scoped context is verified; no custom questions/answers/tokens enter the shared cache. These privacy and prompt-shaping checks are automated, not a claim that all possible prompt injection is preventable.
- Session-local question reuse includes a server-supplied opaque generation version. A regression verifies reuse for matching versions and a new call after generation-version changes. Newly saved shared responses also record prompt/schema/corpus versions and scope metadata explicitly.
- Selected verse and translation update the shareable URL without scrolling and become the local resume passage; regression coverage verifies both.
- Physical-phone check: the owner reported that opening a verse, expanding Translations, typing with the on-screen keyboard, and closing the panel worked well.
- Live provider cost ceiling: four real Gemini generations succeeded in the bounded owner smoke test; cache hits made no extra calls, and a fifth new generation was rejected before contacting Gemini.
- Live proxy probes: one and two supplied forwarding prefixes could not select the throttle bucket. The application's HMAC bucket matched the platform-controlled Cloud Run request address. The owner tool prints no raw IPs, cookies, passwords, or signing secrets. This verifies resistance to supplied prefix spoofing, not individual-user identity.
- Platform logging review: the project's `_Default` log bucket retains entries for 30 days; `_Required` is locked with 400-day retention. Platform request logs include remote addresses and request URLs. These are distinct from application Firestore data; custom questions are POST bodies, not URL parameters, and are not logged by application code.

CI evidence: [85fd62a verification](https://github.com/barrand/StudyTable/actions/runs/40271303815).

## Remaining before production sign-off

- Roll out the exact CI-verified main commit to preview, verify it, then promote it to the separate `study-table` production backend. Both backends are in the owner-selected existing project; they intentionally share the response cache and global budget. The production backend is configured with its own origin override and the same private invite gate, but setup alone is not evidence of a production rollout.
- Complete the remaining browser accessibility/entry-flow checks against the release. The owner's physical-phone feedback covers the verse-panel/keyboard flow, not every screen-reader interaction.
- Optional follow-up: cloud billing alerts and a second isolated project if stronger preview/production data separation becomes useful. The application generation ceiling is not a hard cap on total Firebase/GCP charges.

No claims of historical or theological authority are made by the AI validation. Scripture is local/source-backed; external scholarly retrieval is outside MVP scope.
