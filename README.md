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

Tests cover real corpus references and literal search, USFM styles/notes/omissions, prototype and React reader interactions, stale requests, password/session handling, concurrent quotas and cache leases, Gemini request shaping, original-language source terms, and malformed output. CI runs these checks on Node 22. These checks do not replace the live Gemini, actual Firestore, production-access, mobile keyboard, and deployed-preview checks in the MVP plan.

## Bundled sources

All 66 canonical books in both translations are committed as per-chapter JSON. Deployment builds perform no scripture downloads. `data/source-lock.json` records the exact eBible source URLs, editions, download checksums, import timestamps, attribution, and generated-file checksums. Run `npm run import:corpus` to reproduce from pinned archive checksums. `--update-lock` is reserved for deliberately reviewed source changes. The KJV package also contains Apocrypha, which is excluded from this MVP's 66-book canon. WEB retains explicit omitted-verse markers rather than substituting KJV text.

`npm run import:words` reproduces the curated source-language data. `data/word-source-lock.json` records each STEPBible file, its pinned Git commit, checksum and per-file rights review. Only three distinct terms per verse and their required facts are bundled, not full lexicons. Greek uses SBL-edition words in TAGNT; Hebrew/Aramaic uses the written Leningrad `L` readings in TAHOT. Morphology comes from TEGMC/TEHMC. The minimal Greek dictionary gloss comes from TBESG. TBESH definitions are excluded because their header requests separate Online Bible permission. Attested tagged glosses are translation choices, not a complete lexical definition. See the in-app Sources & Licenses view for attribution and normalization notices.

## AI behavior and caching

`POST /api/study` requires an access session and same-origin request. It validates the reference/action scope and loads scripture from the server's local corpus. Gemini Interactions requests use `store: false`, a JSON response schema, no tools/web grounding, and no previous interaction ID. Output is validated and rendered as text, with links resolved against the local corpus. External scholarly citations are not included.

Validated standard actions are cached in Firestore by passage, scope, translation/corpus, action, model, prompt/schema/source versions, language, and `AI_CACHE_VERSION`. Cache hits are available even when generation quotas are exhausted. A transaction lease prevents simultaneous misses from generating the same response twice. Generation attempts count toward atomic per-IP/day and global/day budgets, defaulting to 10 and 50. Failed or invalid responses are not cached. Increment `AI_CACHE_VERSION` to invalidate reusable content without deleting old records. There is no public regenerate endpoint.

`TRUSTED_PROXY_HOPS` controls which trusted proxy-appended IP is used. It defaults to the rightmost forwarded address, failing conservatively to one shared unresolved bucket if unavailable. Verify the actual App Hosting proxy chain before rollout; do not trust an arbitrary client-controlled leftmost forwarding value. IP-derived bucket IDs use a secret HMAC. Raw IPs and custom questions are not persisted by app code. Cloud/platform access logging is separate and must be reviewed before rollout.

## Firebase preview

Target project: `study-table-a2869`. Preview backend: `study-table-preview` in `us-central1`. Firestore's default database is in `nam5`. Rules deny all direct client access. `firestore.indexes.json` declares TTL policies for quota, throttle, and generation-lease records; shared responses intentionally have no daily TTL. Confirm those policies are active after deployment.

`apphosting.yaml` references these Secret Manager entries (runtime only):

| Secret | Use |
| --- | --- |
| `STUDY_GEMINI_API_KEY` | Owner-provided Gemini key |
| `STUDY_ACCESS_PASSWORD_HASH` | Scrypt hash of the shared invite password |
| `STUDY_SESSION_SECRET` | Random signing secret, at least 32 characters |
| `STUDY_RATE_LIMIT_SECRET` | Separate random HMAC secret, at least 32 characters |

Never put secrets in Git, public environment variables, URLs, or chat. Grant the preview runtime access only to its named secrets and Firestore. Use `firebase deploy --only firestore --project study-table-a2869`, then `firebase deploy --only apphosting:study-table-preview --project study-table-a2869`. Test the private preview before creating a production rollout or GitHub automatic deployment. The main branch is the intended eventual production source.

Next.js is pinned to patched 15.5.28, with PostCSS overridden to 8.5.31, replacing the original older 15.2.x requirement. App Hosting's published active-version table still lists 15.2.x; successful preview adapter/build validation is required for the newer minor. See the [Next.js security update](https://nextjs.org/blog/nextjs-security-update-october-14-2026) and [App Hosting framework support](https://firebase.google.com/docs/app-hosting/frameworks-tooling).

## Remaining acceptance work

The goal is not complete until the full plan is verified. Remaining work includes live Gemini output/quality and failure checks, actual Firestore cache/quota/TTL verification, the private deployed preview and cost ceiling, production rollout, and mobile/browser accessibility checks. Follow-up questions use signed, expiring, passage/translation-bound capsules of at most three compact turns held in browser memory; no conversation content is stored in Firestore or provider-side interaction history.
