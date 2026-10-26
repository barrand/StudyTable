# Study Table

A reading-first Bible study app built with Next.js App Router, TypeScript, KJV and WEB. Gemini powers chapter overviews and passage-scoped study tools. The original design reference is `study-table-prototype.html`; product scope and architecture are in `requirements.md` and `plans/mvp.md`.

## Local development

Use Node 22 and npm. Install with `npm ci`, copy `.env.example` to `.env.local`, and run `npm run dev`. Open `http://127.0.0.1:3000`. Local access bypass requires both `NODE_ENV=development` (set by Next dev) and `ALLOW_DEV_ACCESS=true`. It never works in production.

Reading, exact reference/word/phrase search, and KJV/WEB comparison work without a Gemini key. Study tools show a configuration message until `GEMINI_API_KEY` is provided. `STUDY_STORE=memory` is an explicitly development-only store; production always uses Firestore. Custom questions are never placed in the shared cache or logged by application code.

## Checks

```sh
npm run verify:corpus
npm run verify:words
npm test
npm run typecheck
npm audit --omit=dev
npm run build
```

Tests cover real corpus references and literal search, USFM styles/notes/omissions, prototype and React reader interactions, stale requests, password/session handling, concurrent quotas and cache leases, Gemini request shaping, original-language source terms, and malformed output. CI runs these checks on Node 22, plus two integration tests against the real Firestore adapter in the local emulator (Java 21). Run the latter with `GOOGLE_CLOUD_PROJECT=demo-study-table` and `firebase emulators:exec --only firestore --project demo-study-table --config firebase.emulator.json "npx tsx --test tests/firestore.integration.ts"`. The tests refuse to run against a cloud database.

## Bundled sources

All 66 canonical books in both translations are committed as per-chapter JSON. Deployment builds perform no scripture downloads. `data/source-lock.json` records the exact eBible source URLs, editions, download checksums, import timestamps, attribution, and generated-file checksums. Run `npm run import:corpus` to reproduce from pinned archive checksums. `--update-lock` is reserved for deliberately reviewed source changes. The KJV package also contains Apocrypha, which is excluded from this MVP's 66-book canon. WEB retains explicit omitted-verse markers rather than substituting KJV text.

`npm run import:words` reproduces the curated source-language data. `data/word-source-lock.json` records each STEPBible file, its pinned Git commit, checksum and per-file rights review. Only three distinct terms per verse and their required facts are bundled, not full lexicons. Greek uses SBL-edition words in TAGNT; Hebrew/Aramaic uses the written Leningrad `L` readings in TAHOT. Morphology comes from TEGMC/TEHMC. The minimal Greek dictionary gloss comes from TBESG. TBESH definitions are excluded because their header requests separate Online Bible permission. Attested tagged glosses are translation choices, not a complete lexical definition. See the in-app Sources & Licenses view for attribution and normalization notices.

## AI behavior and caching

`POST /api/study` requires an access session and same-origin request. It validates the reference/action scope and loads scripture from the server's local corpus. Gemini Interactions requests use `store: false`, a JSON response schema, no tools/web grounding, and no previous interaction ID. Output is validated and rendered as text, with links resolved against the local corpus. External scholarly citations are not included.

The tested default is `gemini-3.1-flash-lite`, configurable through `GEMINI_MODEL`. Live validation on 2026-10-26 passed chapter overviews, verse context, and Greek/Hebrew word study. Newer Flash models returned capacity errors during this project's validation; there is no automatic model fallback or unbounded retry. Chapter overview schemas require all four context sections. Word studies receive both exact KJV/WEB verses for comparison alongside the source-language tags.

Validated standard actions are cached in Firestore by passage, scope, translation/corpus, action, model, prompt/schema/source versions, language, and `AI_CACHE_VERSION`. Cache hits are available even when generation quotas are exhausted. A transaction lease prevents simultaneous misses from generating the same response twice. Generation attempts count toward atomic per-IP/day and global/day budgets, defaulting to 10 and 50. Failed or invalid responses are not cached. Increment `AI_CACHE_VERSION` to invalidate reusable content without deleting old records. There is no public regenerate endpoint.

`TRUSTED_PROXY_HOPS` controls which trusted proxy-appended IP is used in both invite and study throttles. It defaults to the rightmost forwarded address, failing conservatively to one shared unresolved bucket if unavailable or the chain is too short. Live spoof-prefix probes verified that this bucket matches the platform request address and cannot be selected by supplied forwarding prefixes. This is a request bucket, not individual-user identity. IP-derived bucket IDs use a secret HMAC. Raw IPs and custom questions are not persisted by app code. Cloud request logs separately retain addresses/URLs in the project's 30-day `_Default` bucket; required audit logs have 400-day retention. No request bodies are logged by application code.

## Firebase deployments

Target project: `study-table-a2869`. [Production](https://study-table--study-table-a2869.us-central1.hosted.app) uses backend `study-table`; [preview](https://study-table-preview--study-table-a2869.us-central1.hosted.app) uses `study-table-preview`, both in `us-central1`. Firestore's default database is in `nam5`. Rules deny all direct client access. Cloud TTL policies are active for quota, throttle, and generation-lease records; shared responses intentionally have no daily TTL.

`apphosting.yaml` references these Secret Manager entries (runtime only):

| Secret | Use |
| --- | --- |
| `STUDY_GEMINI_API_KEY` | Owner-provided Gemini key |
| `STUDY_ACCESS_PASSWORD_HASH` | Scrypt hash of the shared invite password |
| `STUDY_SESSION_SECRET` | Random signing secret, at least 32 characters |
| `STUDY_RATE_LIMIT_SECRET` | Separate random HMAC secret, at least 32 characters |

Never put secrets in Git, public environment variables, URLs, or chat. Grant the runtime access only to its named secrets and Firestore. Firestore configuration deploys with `firebase deploy --only firestore --project study-table-a2869`. For application releases, use the verified preview-then-production helper below. Both current deployments were released from pushed, CI-verified `main`.

The separate production backend is `study-table` in the same owner-selected project. Its `production` environment loads `apphosting.production.yaml` to override the public origin; all secrets, the private invite gate, quotas, and cached responses remain shared. This is not project-level data isolation. `scripts/setup-production.ts` performs idempotent backend/secret setup without deploying the app. After committing and pushing, use `npx tsx scripts/release.ts preview`, then `npx tsx scripts/release.ts production`. The release helper refuses dirty/non-main/unpushed code, requires successful CI for the exact commit, verifies the same preview rollout before production, and runs deployed access/cache checks. No persistent GitHub deployment authorization is required; local source deployment is supported by Firebase. Automatic deployments can be connected later if desired.

Next.js is pinned to patched 15.5.28, with PostCSS overridden to 8.5.31, replacing the original older 15.2.x requirement. App Hosting's published active-version table still lists 15.2.x; the newer minor passed actual preview and production adapter/build validation. See the [Next.js security update](https://nextjs.org/blog/nextjs-security-update-october-14-2026) and [App Hosting framework support](https://firebase.google.com/docs/app-hosting/frameworks-tooling).

## Verified MVP release

Application commit `283b129` passed all 32 automated tests and the Node 22 production build, then the same commit passed preview and production rollouts and deployed access/cache checks. Live Gemini actions, bounded cost ceiling, private follow-ups, Firestore transactions/TTL, proxy spoof-prefix resistance, browser entry/search/comparison/URL/resume/focus behavior and the owner's physical-phone keyboard flow were checked. Runtime secrets were absent from production HTML and its ten delivered browser scripts. See `plans/completion-audit.md` for requirement-by-requirement evidence and `plans/validation.md` for operational limitations. No personal conversations are stored in Firestore or provider interaction history. Optional follow-ups include isolated projects, automatic GitHub deployments, billing alerts and a formal assistive-technology audit.
