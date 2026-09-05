# Study Table

Bible-first scripture reading with local KJV and WEB text, reference and literal phrase search, translation comparison, and stateless passage-scoped AI assistance.

## Local development

Use Node 22 (Node 24 also supported) and pnpm 11.19.0.

Next.js is pinned to 15.5.25 because the planned 15.2.x release has known security vulnerabilities. Validate Firebase adapter compatibility in preview before rollout. PostCSS and the older transitive UUID dependency are overridden to patched compatible releases. Windows produces a standard Next build (its standalone copier requires unavailable symlink privileges); Firebase's Linux build generates standalone output.

```sh
pnpm install
# Copy .env.example to .env.local and fill any available configuration.
pnpm dev
```

`LOCAL_ACCESS_BYPASS=true` and `LOCAL_QUOTA_MEMORY=true` only work under `NODE_ENV=development`. Production always requires the password session and Firestore. Missing Gemini configuration shows an unavailable message without blocking the reader. No sample or fabricated AI response is used.

```sh
pnpm test
pnpm typecheck
pnpm build
```

## Scripture sources

Generated chapter files and search indexes are committed under `data/corpus`, word data under `data/words`. Builds never download scripture. `data/sources.json` records original URLs, exact checksums, edition labels, license statements, revision and transformations. WEBP's source currently identifies itself as the 2020 stable edition and as WEB Updated; its actual downloaded wording is preserved, including differences from the older prototype sample.

To reproduce, download official source inputs into the ignored cache, then run both importers:

```sh
pnpm exec tsx scripts/download-sources.ts
pnpm import:corpus
pnpm import:words
```

The Bible importer rejects changed source checksums unless explicitly passed `--accept-source-update`. Review wording and rights before updating the committed manifest. STEPBible downloads use an immutable Git revision. Only brief lexicons, tagged text, and morphology are included. Word-study witness selection and normalization are documented in the Sources view. Omitted verses remain explicit; no fabricated text fills them.

## Private Firebase deployment

1. Select a Firebase project with billing and an App Hosting backend. Configure its Node runtime as Node 22 and its live branch as `main`. Use a separate preview backend/project first.
2. Set the five Secret Manager values named in `apphosting.yaml`: Gemini key, scrypt password hash, session secret (at least 32 random characters), rate-limit secret, and exact HTTPS application origin. Grant the backend access to those secrets. Never commit credentials.
3. Produce a password hash with `pnpm password:hash` by supplying the password on stdin, not as a command-line argument. The output is `scrypt:salt:hash`. Use a password of at least 12 characters.
4. Enable Firestore in Native mode and grant the runtime service account Firestore access. Deploy the deny-all client rules and `expireAt` TTL configuration from `firebase.json`. Admin SDK access is server-only. TTL cleanup is asynchronous; daily keys prevent expired counts from affecting a new day.
5. Verify the password page, secure cookie, unauthorized API rejection, same-origin checks, trusted proxy/IP handling, two requests competing for the last quota slot, and provider error behavior on the preview backend. Then test one live answer for each action and confirm billing/usage. Verify no questions or answers are logged.
6. Promote the verified revision to production. Configure billing alerts independently: the 50-call limit bounds application calls, not total Firebase infrastructure spend. Each request is capped at 2,200 output tokens with no automatic retry. Failed provider requests consume a reserved slot to avoid retry abuse.

When `TRUST_GOOGLE_PROXY=true`, quota extraction assumes the managed Google load balancer adds the client and load-balancer addresses at the right of X-Forwarded-For. Validate that chain on the target backend. Without it, use a shared server bucket; never trust an arbitrary browser header. Login attempts have a separate quota. A shared IP can share an allowance; it is not an individual identity.

No Firebase project or production credentials are embedded in this repository. Until deployment configuration and live acceptance checks are complete, local build/test success does not indicate a verified production rollout.

## Data handling

Only translation preference and last passage persist in browser storage. The server derives prompt scripture from the local corpus, validates inputs and model JSON, checks linked references, and supplies quoted scripture from the corpus. Questions and answers are not persisted. Gemini calls use `store:false`, no previous interaction ID, and no web grounding. Provider processing remains subject to Google terms. Prose is never rendered as HTML; quoted model prose is rejected. AI statements still require human discernment.
