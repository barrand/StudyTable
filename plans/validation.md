# MVP validation — 2026-10-26

## Verified

- Node 22 CI: 28 unit/component tests and two Firestore emulator integration tests pass, along with TypeScript, the production Next.js build, both corpus integrity checks, and the production dependency audit (zero vulnerabilities).
- Full KJV/WEB corpus: 66 books, 1,189 chapters per translation, pinned source/archive hashes. Original-language data: 1,189 chapter files with per-source rights review and source hashes.
- Deployed private preview: invite sign-in, Secure/HttpOnly/SameSite session cookie, real reader text, verse direct links, sources, missing-session rejection, invalid-reference rejection, and cross-origin rejection.
- Real Gemini: chapter overview, verse context, Greek John 3:16 word study, and Hebrew Genesis 1:1 word study validate. Unsupported/malformed responses and upstream errors have regression coverage. Newer Flash models returned upstream capacity errors; the tested configurable default is Gemini 3.1 Flash-Lite.
- Deployed Gemini overview: actual generation succeeds, persists in Firestore, and a second request returns the same generation timestamp as a saved response. The rendered overview includes book context, traditional/disputed authorship, audience, historical people, and separate event/composition periods.
- Firestore adapter integration: concurrent global and per-bucket quota reservations cannot overspend; separate service instances share generation leases and persisted answers; hits remain available after budget exhaustion; failed reservations do not leave active leases; `expireAt` is stored as a Firestore Timestamp.
- Cloud Firestore TTL configuration: active declarations for generation quotas, totals, leases, and request throttles; no daily TTL on reusable study responses. Unauthenticated direct collection access returns HTTP 403.
- Browser checks: verse panel opens collapsed translations; Enter expands exact KJV/WEB text; primary version comes first; switching selection resets disclosure; Close/Escape restore focus. Wide cards and narrow stacked cards render without horizontal overflow.
- Reduced-height 390×430 viewport: question input and Close remain reachable with internal sheet scrolling. A visual-viewport resize regression checks keyboard inset and restoration. This is not a physical-phone keyboard test.
- Custom follow-ups: signed, expiring, bounded passage/translation-scoped context is verified; no custom questions/answers/tokens enter the shared cache. These privacy and prompt-shaping checks are automated, not a claim that all possible prompt injection is preventable.

CI evidence: [85fd62a verification](https://github.com/barrand/StudyTable/actions/runs/40271303815).

## Remaining before production sign-off

- Review the private preview with the owner before promoting to a separate production backend or connecting automatic GitHub deployments. The current backend is deliberately named `study-table-preview`; a successful preview rollout is not evidence of a separate production rollout.
- Verify the actual App Hosting forwarding chain before changing `TRUSTED_PROXY_HOPS`. The conservative current setting can place visitors behind a common proxy in one request bucket; it is not an individual-user quota. Global transaction limits remain enforced.
- Test a physical mobile keyboard, screen-reader navigation, and target-phone browser behavior. Automated viewport and desktop keyboard checks do not substitute for that device pass.
- Review platform access-log retention and optional cloud billing alerts. The application generation ceiling is not a hard cap on total Firebase/GCP charges.

No claims of historical or theological authority are made by the AI validation. Scripture is local/source-backed; external scholarly retrieval is outside MVP scope.
