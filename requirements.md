# Study Table — MVP Product Requirements

## 1. Product concept

Study Table is a calm, source-aware scripture study workspace. It combines the dependable reading experience of a traditional Bible app with optional AI-guided exploration: historical context, literary connections, and related passages.

The product should help a person go deeper without making the AI feel like a replacement for the text, scholarship, clergy, or personal discernment.

## 2. Target users

- Individual readers who want a fast, familiar way to read and compare passages.
- Curious students who want guided context and cross-references without having to formulate a research plan.
- Scripture-study groups or teachers are a possible later audience, but are not an initial requirement.

## 3. Product principles

1. **Scripture first.** Reading the primary text is always the central screen and fastest path.
2. **Clear sources.** Every external fact, quotation, cross-reference, translation, or AI claim should be attributable and distinguishable from the scripture text.
3. **Respectful and non-sectarian by default.** Present interpretations as perspectives, especially when traditions differ.
4. **Useful before account creation.** A person should be able to read and explore without logging in.
5. **Depth on demand.** The simple reading experience must not be buried under study tools.

## 4. Proposed MVP

### 4.1 Scripture reader

- Start on a simple scripture chooser. MVP presents one enabled work: **Holy Bible**.
- After choosing the Bible, choose a book and then a chapter before entering the reader.
- Navigate by testament, book, chapter, verse, and direct reference (for example, `John 3:16`).
- Read a complete Bible translation in a clean, responsive layout.
- Preserve the selected translation and most recently read passage locally.
- Support verse-level URLs so a passage can be shared or reopened directly.
- Include basic search by reference and words/phrases.

### 4.2 Translation comparison

- Select one primary translation and compare it against one or more secondary translations, initially KJV and WEB (World English Bible).
- Offer a readable comparison layout: inline switching on narrow screens and parallel columns on wider screens.
- Keep verse numbering aligned and make omitted/combined verses apparent.
- Show translation name, abbreviation, and any required copyright attribution where the text is displayed.
- When a reader taps a verse, include a collapsed **Translations** section in that verse's study panel. Expanding it shows the exact selected verse in KJV and WEB, with the reading translation first and each version clearly labeled. Use parallel cards on wide screens and stacked cards on narrow screens. Changing verses updates the text and collapses the section; closing the panel restores the reading view. Additional approved translations can be added to this section later.

### 4.3 AI study actions

Provide a visible **Chapter overview** button above the chapter text, available without selecting a verse. It opens the study sheet for the entire chapter and explains:

- What happens in the chapter and its main themes.
- Where the chapter fits in the book's structure and argument, including the surrounding chapters.
- The author or traditional attribution, intended audience, and relevant historical setting.
- The people and communities involved and the circumstances that help explain the chapter.

Distinguish the historical setting of the events from the setting in which the book was written. Identify uncertainty or disagreement about authorship, dating, audience, and historical reconstruction rather than presenting a disputed attribution as settled fact. Link relevant scripture references, keep the selected chapter and translation visible, and let the reader close the sheet without losing their place.

For a selected verse, provide quick, intentionally scoped actions:

- **Deeper context:** historical setting, immediate literary context, key terms, and major interpretive considerations.
- **Related verses:** thematically and textually connected passages, with a short explanation of each connection.
- **Word study:** for Bible passages, explain important Hebrew, Aramaic, or Greek words in context. Show transliteration, a concise gloss, relevant grammar, translation differences, and linked occurrences elsewhere in scripture.
- **Study questions:** optional reflection/discussion prompts (nice-to-have for MVP).
- **Ask about this passage:** an inline custom-question field that keeps the selected verse or passage in context. For example: “What does this phrase mean?”, “How have major traditions interpreted this?”, or “What should I read next to understand this?”

Custom questions should open a compact, passage-scoped conversation directly beneath or beside the selected text. The reader must be able to see exactly which passage and translation the answer is grounded in, change that selection, and return to reading without losing their place.

AI responses must:

- State the passage and translation being discussed.
- Separate observations from interpretive possibilities.
- Cite or link the underlying scripture references.
- Avoid inventing quotations, sources, historical facts, or confidence.
- Include a brief notice that AI assistance may be incomplete and should be checked against reliable sources.

Word-study responses must name the source-language text/edition used, distinguish lexical range from the meaning in this specific passage, and avoid presenting a single "secret" English meaning.

### 4.4 Gemini and response caching

- **Use Google Gemini for all AI generation**, including chapter overviews, verse context, related verses, word studies, and custom questions. Call Gemini only from the server; keep the API key out of the browser. The model is configurable server-side.
- Persist successful, validated standard chapter and verse responses in a shared server-side cache. Reopening a chapter overview or requesting the same verse action reuses the saved response across visits and visitors instead of generating it again.
- Cache identity includes the scripture work, canonical chapter or verse, translation and corpus edition, action, output language, Gemini model, prompt/response-schema version, and relevant source-data versions. Different passages, translations, actions, or source versions must not collide.
- Check the cache before reserving generation quota or calling Gemini. A cache hit makes no Gemini request and consumes no AI-generation allowance. Concurrent requests for the same missing response share one generation; waiting readers receive its saved result.
- Keep reusable responses until an owner invalidates them or a model, prompt, schema, corpus, or source change creates a new cache version. Do not regenerate simply because a reader revisits a passage. Do not cache failures, incomplete responses, or responses that fail validation.
- Reuse identical custom questions and their answers within the current browser session, keyed by passage, translation, exact trimmed question, and generation versions. Do not place personalized questions or their answers in the shared persistent cache or retain them as personal study history.
- Shared generated study content is an application cache, distinct from user notes or saved AI conversations. Its existence does not add accounts or saved personal history to MVP.

## 5. Decisions to make before implementation

### A. Text and translation rights

**KJV** is public domain in the United States and is a strong default for the first working reader.

**WEB (World English Bible)** is a modern-English, public-domain translation and the best initial choice for easier reading. It is more approachable than KJV while preserving a full Bible comparison experience. We should use an official/stable WEB text distribution and identify it faithfully as WEB.

**NIV** is copyrighted; displaying it requires an approved source/license and compliant attribution/usage limits. We should not copy NIV text from an unofficial source or treat it as public-domain content.

**Decision:** Ship KJV and WEB in MVP. Retain a translation-provider abstraction so NIV can be added later through a licensed source.

Open question: After WEB, which licensed translation would be most valuable to add: NIV, ESV, NRSVUE, NASB, or CSB?

### B. Bible Hub links

Bible Hub is valuable as a discovery destination, but directly ingesting or scraping its content creates reliability, attribution, copyright, and terms-of-use questions. Its pages also aggregate material with differing rights and provenance.

**Decision:** Do not ingest, scrape, summarize, or otherwise use Bible Hub as an application data source. Add a clearly labeled external **Open in Bible Hub** link on every Bible verse. The link opens the corresponding verse page in a new tab and is an optional reader destination, not an endorsement or source for the app's AI answers.

### C. Book of Mormon

Adding the Book of Mormon makes Study Table a multi-scripture workspace and changes the information architecture, audience expectations, terminology, and source-rights review.

**Decision:** Book of Mormon reading and AI study are post-MVP. Keep the generic `work → book → chapter → verse` model so another approved work can be added later without redesigning navigation, linking, or AI context. Source permission and edition selection must be settled before that later phase begins.

### D. Accounts, notes, and privacy

Notes are highly valuable because they turn a reader into a long-term user. Requiring login before someone can read, however, adds friction and creates privacy/security obligations.

**Decision:** Notes, highlights, saved personal AI history, and cloud synchronization are post-MVP. MVP will not persist personal study data. Shared, reusable Gemini-generated chapter and verse content is persisted as an application cache as specified in section 4.4.

Open question: When notes return, is local-only storage sufficient before adding sync?

### E. AI scope and cost controls

AI can make the app distinctive but needs strong boundaries: response quality varies, usage has a cost, and theological framing can be sensitive. Custom questions increase the value of the feature, but also make rate limits, moderation, and clear source boundaries more important.

**Decision:** Use Google Gemini. Chapter overviews, verse study actions, and passage-scoped custom questions are free to visitors. Enforce 10 new AI generations per anonymized server-side request bucket per UTC day and a configurable global limit that defaults to 50 new generations per UTC day. Cached responses remain available when generation allowance is exhausted and do not count toward these limits. Apply a separate server-side request throttle to cached and uncached requests. The interface may show the remaining generation allowance but must not present a browser-only counter as a security boundary. Do not offer a free-floating, unrestricted theological chat in MVP.

### F. Personal-project access and show-and-tell controls

The app is initially for its creator, with occasional private demonstrations. Full user accounts are unnecessary for that goal. A shared-password access page with a signed server session is a practical temporary gate: it prevents casual public access but does not identify individual visitors, enforce individual quotas, or offer account recovery.

**Decision:** Deploy the MVP with a custom `/access` page. Verify the shared password against a server-side secret hash, issue a signed HTTP-only session cookie, use HTTPS, and allow an explicit local-development bypass. Include owner-controlled configuration for the global AI daily budget and per-device allowance. Do not expose an admin panel or build user accounts yet.

Use one shared invite password for the creator and trusted friends. If the app later needs public sharing, individual quotas, personalized settings, or saved data, replace this gate with a real authentication system and a user-level rate-limit design. Never treat the shared-password gate as sufficient protection for sensitive data; MVP intentionally stores none.

## 6. User flows

### Read a passage

1. Reader opens Study Table.
2. Reader chooses **Holy Bible**.
3. Reader chooses a book and then a chapter.
4. App opens that chapter in the primary translation.
5. Reader can open **Chapter overview**, select a verse, switch translations, or open comparison.

Returning readers may resume their locally stored last passage. Direct reference URLs bypass the chooser and open the stated chapter and verse.

### Understand a chapter

1. Reader opens a chapter and chooses **Chapter overview** above its text.
2. The study sheet identifies the entire chapter and translation, with sections for the chapter summary, its place in the book, authorship and audience, and historical setting and people.
3. The app returns a matching cached overview, or asks Gemini once and caches the validated result for reuse.
4. Reader can follow linked scripture references or close the overview and continue reading in place. Selecting a verse switches the sheet to that verse's study tools.

### Explore a verse

1. Reader selects one verse.
2. Reader may expand **Translations** to compare that verse in KJV and WEB, choose **Deeper context**, **Related verses**, or enter a custom question in **Ask about this passage**.
3. App displays an AI response with linked scripture references and a clear source/interpretation distinction.
4. Reader can open a referenced passage without losing their place.

### Ask a custom question about a verse

1. Reader selects a verse.
2. An inline study panel identifies the selection and offers a question field.
3. Reader asks a free-form question.
4. App responds in the context of the selected passage, declares the translation used, and links every cited scripture reference.
5. Reader may ask a follow-up; the conversation stays scoped to that passage unless the reader deliberately changes the selection.

## 7. Explicit non-goals for MVP

- A complete replacement for academic Bible-study software.
- Denomination-specific authoritative interpretation.
- Scraping or republishing third-party commentary without permission.
- Social feeds, public notes, groups, or collaborative editing.
- Notes, highlights, saved personal AI conversations, and cloud synchronization. Shared generated-response caching is included in MVP.
- An open-ended AI companion with unrestricted conversation history.
- Book of Mormon or other additional scripture works.
- Paid subscriptions, unless necessary to cover an approved text license or AI costs.

## 8. Success criteria for an MVP

- A reader can reach a Bible passage and begin reading in under a few seconds.
- A reader can compare KJV and WEB side by side.
- Selecting a verse exposes a collapsed Translations section that expands to show that exact verse in KJV and WEB and updates correctly when the selection changes.
- A reader can request a Gemini chapter overview explaining its place in the book, authorship/audience, and the historical setting of the people involved, with uncertainty clearly identified.
- Repeated standard chapter and verse requests reuse persisted responses without new Gemini calls or generation-quota charges; simultaneous identical requests generate only once.
- AI actions return useful, passage-specific study help with working linked references and no unsupported quotations.
- Each Bible verse provides a working, clearly external Bible Hub link.
- The app makes source ownership and translation attribution clear.
- Core reading remains useful without a user account.

## 9. Suggested phased roadmap

| Phase | Focus | Outcome |
| --- | --- | --- |
| 0 — Validate | Content licensing, source strategy, AI response rubric | Confirm what text and reference material we may show. |
| 1 — Reader | KJV + WEB Bible reader, work/book/chapter navigation, search, responsive UI | A trustworthy, fast Bible reading experience. |
| 2 — Study tools | Gemini chapter overviews, scoped verse context, related verses, word studies, custom questions, response caching, Bible Hub links | The differentiating study experience. |
| 3 — Personal workspace | Optional accounts, sync, notes, highlights, export/delete | Long-term personal study utility. |
| 4 — Additional works | Book of Mormon, more approved translations, and selected works | Broader coverage after source rights are validated. |

## 10. Resolved MVP defaults

- Build first for a curious independent reader who values a calm reading experience and optional context.
- Use a neutral, source-aware AI tone in warm, plain language. Present denominational readings as perspectives rather than conclusions.
- Google Gemini is the AI provider. Persist and reuse validated standard chapter and verse responses through the shared server-side cache.
