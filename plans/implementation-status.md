# MVP implementation status

Implemented locally:

- Scripture → book → chapter navigation for all 66 Bible books.
- Complete KJV and WEB corpus, reproducible import, source manifest, chapter JSON and literal search index.
- Responsive reader, local translation/last-passage preferences, verse URLs, comparison, keyboard-accessible verse selection, fixed study sheet, safe-area/keyboard accommodations, Bible Hub links.
- Validated stateless Gemini endpoint, bounded output, verified scripture references, server-derived quotations, explicit missing-configuration/error states.
- STEPBible tagged text, brief lexical range, morphology and occurrences, with per-file versions, checksums and licenses.
- Shared-password session, same-origin API protection, server-side quota transactions, production-only enforcement, Firebase secrets and TTL configuration.

Verification completed locally:

- Production build and TypeScript checks pass.
- 11 tests pass: full corpus integrity, reference/literal search, Greek/Hebrew source data, request/response validation, session/password checks, quota policy, concurrent local reservation ceiling, and mocked provider transport.
- HTTP checks pass for reader/navigation/search/sources, invalid study requests, cross-origin rejection and unconfigured-provider behavior.
- A locally served production build redirects unauthenticated reader requests and rejects unauthenticated API calls even with development bypass values in `.env.local`.
- Production dependency audit reports no known vulnerabilities after moving to Next.js 15.5.25 and patched transitive dependencies.

Not yet verified:

- Browser interaction/visual QA of the implemented app, including actual mobile virtual-keyboard behavior.
- Live Gemini responses and billing, Firestore transactions under real concurrent requests, deployed TTL, and Firebase proxy headers.
- Firebase App Hosting preview compatibility on the patched Next.js release and production rollout.

No Firebase project, cloud credentials or Gemini key was available during this implementation. The user must identify the preview project and configure the secrets described in `README.md` before cloud validation and rollout. The local app does not pretend an unconfigured AI integration is live.
