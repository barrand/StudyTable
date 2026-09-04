# Study Table — Product Requirements (Draft)

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

- Navigate by testament, book, chapter, verse, and direct reference (for example, `John 3:16`).
- Read a complete Bible translation in a clean, responsive layout.
- Preserve the selected translation and most recently read passage locally.
- Support verse-level URLs so a passage can be shared or reopened directly.
- Include basic search by reference and words/phrases.

### 4.2 Book of Mormon reader

- Include the Book of Mormon in MVP navigation, search, verse selection, deep links, and AI study context.
- Present Bible and Book of Mormon as equally first-class works while keeping their books, chapter conventions, and source/edition labels clear.
- Obtain or confirm a permitted canonical text source before shipping the full text. Do not scrape or republish Church-owned editions without permission.
- Build the passage model as `work → book → chapter → verse`, so all reader, comparison, linking, and AI features work across both collections.

### 4.3 Translation comparison

- Select one primary translation and compare it against one or more secondary translations, initially KJV and WEB (World English Bible).
- Offer a readable comparison layout: inline switching on narrow screens and parallel columns on wider screens.
- Keep verse numbering aligned and make omitted/combined verses apparent.
- Show translation name, abbreviation, and any required copyright attribution where the text is displayed.

### 4.4 AI study actions

For a selected verse or passage, provide quick, intentionally scoped actions:

- **Deeper context:** historical setting, immediate literary context, key terms, and major interpretive considerations.
- **Related verses:** thematically and textually connected passages, with a short explanation of each connection.
- **Study questions:** optional reflection/discussion prompts (nice-to-have for MVP).
- **Ask about this passage:** an inline custom-question field that keeps the selected verse or passage in context. For example: “What does this phrase mean?”, “How have major traditions interpreted this?”, or “What should I read next to understand this?”

Custom questions should open a compact, passage-scoped conversation directly beneath or beside the selected text. The reader must be able to see exactly which passage and translation the answer is grounded in, change that selection, and return to reading without losing their place.

AI responses must:

- State the passage and translation being discussed.
- Separate observations from interpretive possibilities.
- Cite or link the underlying scripture references.
- Avoid inventing quotations, sources, historical facts, or confidence.
- Include a brief notice that AI assistance may be incomplete and should be checked against reliable sources.

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

Open question: Should the verse menu also include external links to an official scripture source for Book of Mormon passages?

### C. Book of Mormon

Adding the Book of Mormon makes Study Table a multi-scripture workspace and changes the information architecture, audience expectations, terminology, and source-rights review.

**Decision:** Include Book of Mormon reading and AI study in MVP. Use a generic `work → book → chapter → verse` model and settle the permitted text source and required attribution before implementation.

Open question: Is the 2013 LDS edition the desired MVP text, subject to source/permission confirmation?

### D. Accounts, notes, and privacy

Notes are highly valuable because they turn a reader into a long-term user. Requiring login before someone can read, however, adds friction and creates privacy/security obligations.

**Decision:** Notes, highlights, saved AI history, and cloud synchronization are post-MVP. MVP will not persist personal study data.

Open question: When notes return, is local-only storage sufficient before adding sync?

### E. AI scope and cost controls

AI can make the app distinctive but needs strong boundaries: response quality varies, usage has a cost, and theological framing can be sensitive. Custom questions increase the value of the feature, but also make rate limits, moderation, and clear source boundaries more important.

**Decision:** AI study actions and passage-scoped custom questions are free to visitors, with a small daily limit. Start with a per-browser/device allowance plus server-side abuse controls; do not promise that a browser-only counter is a security boundary. Do not offer a free-floating, unrestricted theological chat in MVP.

Open question: What is a useful daily allowance for personal/showcase use: 5, 10, or 20 AI answers per device?

### F. Personal-project access and show-and-tell controls

The app is initially for its creator, with occasional private demonstrations. Full user accounts are unnecessary for that goal. A single HTTP Basic Authentication username/password at the deployment edge is a practical temporary gate: it prevents casual public access but does not identify individual visitors, enforce individual quotas, or offer account recovery.

**Recommendation:** Deploy as invite-only behind HTTP Basic Authentication for MVP. Keep the credentials in deployment secrets, use HTTPS, and include a lightweight owner-controlled configuration for the global AI daily budget and the per-device allowance. Do not expose an admin panel or build user accounts yet.

If the app later needs public sharing, individual quotas, personalized settings, or saved data, replace Basic Auth with a real authentication system and a user-level rate-limit design. Never treat Basic Auth as sufficient protection for sensitive data; MVP intentionally stores none.

Open question: Do you prefer one shared invite password for trusted friends, or should the first deployment be private to you only until the reader is polished?

## 6. User flows

### Read a passage

1. Reader opens Study Table.
2. Reader searches or navigates to a reference.
3. App shows the primary translation immediately.
4. Reader can select a verse, switch translations, or open comparison.

### Explore a verse

1. Reader selects one verse or a small passage range.
2. Reader chooses **Deeper context**, **Related verses**, or enters a custom question in **Ask about this passage**.
3. App displays an AI response with linked scripture references and a clear source/interpretation distinction.
4. Reader can open a referenced passage without losing their place.

### Ask a custom question about a verse

1. Reader highlights a verse or passage range.
2. An inline study panel identifies the selection and offers a question field.
3. Reader asks a free-form question.
4. App responds in the context of the selected passage, declares the translation used, and links every cited scripture reference.
5. Reader may ask a follow-up; the conversation stays scoped to that passage unless the reader deliberately changes the selection.

## 7. Explicit non-goals for MVP

- A complete replacement for academic Bible-study software.
- Denomination-specific authoritative interpretation.
- Scraping or republishing third-party commentary without permission.
- Social feeds, public notes, groups, or collaborative editing.
- Notes, highlights, saved AI conversations, and cloud synchronization.
- An open-ended AI companion with unrestricted conversation history.
- Paid subscriptions, unless necessary to cover an approved text license or AI costs.

## 8. Success criteria for an MVP

- A reader can reach a Bible passage and begin reading in under a few seconds.
- A reader can compare KJV and WEB side by side.
- A reader can read and explore Book of Mormon passages using a confirmed permitted text source.
- AI actions return useful, passage-specific study help with working linked references and no unsupported quotations.
- Each Bible verse provides a working, clearly external Bible Hub link.
- The app makes source ownership and translation attribution clear.
- Core reading remains useful without a user account.

## 9. Suggested phased roadmap

| Phase | Focus | Outcome |
| --- | --- | --- |
| 0 — Validate | Content licensing, source strategy, AI response rubric | Confirm what text and reference material we may show. |
| 1 — Reader | KJV + WEB reader, Book of Mormon reader, navigation/search, responsive UI | A trustworthy, fast multi-scripture reading experience. |
| 2 — Study tools | Scoped AI context, related verses, custom questions, Bible Hub links | The differentiating study experience. |
| 3 — Personal workspace | Optional accounts, sync, notes, highlights, export/delete | Long-term personal study utility. |
| 4 — Additional works | More approved translations and selected works | Broader coverage, if validated. |

## 10. Questions for our next requirements discussion

1. Who is the first person we are building for: a casual daily reader, a serious independent student, or a member of a particular faith tradition?
2. Is the 2013 LDS Book of Mormon edition the desired MVP text, subject to source/permission confirmation?
3. What daily AI allowance feels right: 5, 10, or 20 answers per device?
4. Should the invite-only MVP use a shared password, or remain private to you until the reader is polished?
5. What tone should the AI use: neutral academic, devotional, discussion-guide, or user-selectable?
