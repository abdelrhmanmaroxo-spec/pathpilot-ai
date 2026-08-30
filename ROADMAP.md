# PathPilot Product Roadmap

This file is the execution tracker for the two approved 50-item roadmaps. Status values are `DONE`, `IN_PROGRESS`, `BLOCKED`, and `TODO`.

## Execution rule

- Fix broken CI/deploy first.
- Work in safe batches and verify each batch before the next one.
- If a task needs an external account action, credential, paid service, domain, store approval, or other user-only step, mark it `BLOCKED` with the exact requirement and continue with another unblocked task.
- Never weaken authentication, email verification, owner protections, or persistence to make a task pass.
- Preserve the Railway SQLite volume and production data.

## Progress notes

- 2026-08-30: A33 conversational diversity advanced with language-scoped cross-intent wording freshness and stronger semantic short-turn matching. The variation engine now keeps a bounded history of response-catalog signatures in addition to per-intent variant IDs, allowing adjacent social intents to avoid near-duplicate phrasing such as repeatedly ending with the same “هات اللي بعده ونكمل” wording when a fresh alternative exists. No user prompt text is stored. Conversational archetype matching now ignores harmless Egyptian/English social fillers (`يا معلم`, `bro`, `بجد`, `so much`) while retaining action-bearing safeguards, expands repeated confusion/frustration and positive-update recognition, and keeps Arabic-first code switching stable when English product or technical words appear inside an otherwise Arabic turn. Regression tests cover global near-duplicate avoidance, singleton fallbacks, language isolation, filler-aware matching, code switching, repeated-state routing, and scoped-request fallthrough. A33 remains `DONE` as a shipped capability with continuing quality expansion.
- 2026-08-30: A33 conversational naturalness advanced again by separating lightweight intent understanding into `conversation-intent.js` instead of growing a brittle exact-phrase list. The new archetype detector combines normalization, embedded phrase recognition, short-message token matching, mixed Arabic/English handling, and action-bearing safeguards so social wording such as `thanks` or `تمام` cannot swallow a real follow-up like `كمل الشرح` / `explain the second part`. Coverage now includes ready/start transitions, encouragement requests, positive user updates, embedded Egyptian variants such as `عامل ايه يا معلم`, and context-sensitive confusion/frustration fallthrough support while preserving non-repeating variant selection. Regression tests cover mixed-language turns, embedded phrases, scoped-request fallthrough, normalization, context-sensitive routing, and variant rotation. A33 remains `DONE` as a shipped capability with continuing quality expansion.
- 2026-08-30: A33 conversational naturalness advanced with a reusable variation-history engine and broader lightweight intent coverage. Casual Arabic, Egyptian Arabic, and English turns now cover greetings by time of day, status questions, thanks, acknowledgements, farewells, apologies, confusion, generic help, frustration, compliments, laughter, identity, capability, and assistant-status questions without invoking unnecessary provider/RAG/search work. Response pools rotate against a small on-device history of variant IDs, so repeated intent in a new local chat avoids recently used wording without storing prompt content. Normalization now tolerates Arabic diacritics, tatweel, punctuation, common letter variants, and exaggerated repeated characters, while scoped/substantive requests still fall through to the normal reasoning pipeline. Regression tests cover intent routing, normalization, safe storage recovery, and deterministic non-repetition across repeated chats.
- 2026-08-30: A02 architecture cleanup advanced by extracting feature-specific user-management orchestration from `useAdminDashboardController` into `src/admin/useAdminUserActions.js`. Role changes, role-safe Ban/Unban, Owner-only password resets, account deletion, their busy states, confirmations, notices, and platform mutation calls now live behind the focused Users feature hook; the dashboard controller keeps workspace loading, invitations, Owner export, and shared state composition. Existing `canModerateUser`, Owner checks, server-side authorization, authentication, SQLite persistence, Gmail delivery, Gemini/Tavily integration, and public URLs remain unchanged. An architecture regression test prevents these user mutations from drifting back into the central dashboard controller. A02 remains `IN_PROGRESS` for the remaining invitation/export action split.
- 2026-08-30: A02 architecture cleanup advanced by separating the Admin Dashboard access/composition boundary from its presentation layer. `src/AdminDashboard.jsx` now only obtains the existing controller, enforces the existing backend/admin entry gates, and delegates rendering to `src/admin/AdminDashboardView.jsx`; feature presentation, Owner-only export UI, notices, tabs, analytics, security, users, API usage, errors, feedback, and Owner log composition live in the focused view module. No API, auth, persistence, Gmail, Gemini, Tavily, or Owner-protection behavior changed. An architecture regression test prevents the entry component from absorbing feature modules again. A02 remains `IN_PROGRESS` for the remaining feature-specific controller/action split.
- 2026-08-30: A02 architecture cleanup advanced by extracting `useAdminDashboardController` from `AdminDashboard.jsx`. Dashboard loading, refresh, owner-only invitation/export/password-reset/delete actions, role changes, role-safe Ban/Unban orchestration, busy/error/notice state, and immutable user-state updates now live behind a focused controller while the dashboard component is primarily presentation and feature composition. Existing server-side authorization remains authoritative; an additional owner guard now protects invitation revocation at the controller boundary. Regression tests cover immutable user patch/delete helpers and safe summary updates. A02 remains `IN_PROGRESS` for any remaining feature-specific decomposition.
- 2026-08-30: A48 role-safe user moderation advanced. Admin accounts can now Ban/Unban regular `user` accounts from the Users table, while both the React UI and the server independently block an Admin from moderating another Admin or the protected Owner. The Owner keeps existing moderation access to all non-owner accounts, and role changes, password resets, account deletion, admin invitations, and Owner logs remain Owner-only. Banning revokes the target user's active sessions immediately and writes an audited owner/admin-specific moderation event. Regression tests cover both the shared UI permission policy and the backend endpoint boundaries.
- 2026-08-30: A11 reactive language state advanced. `App.jsx` now subscribes to the existing `pathpilot:language-changed` bridge through a small reusable language-state helper and passes the active language into privileged Chat. The open Chat workspace and development notice now switch Arabic/English immediately without navigation, reload, or component remount, so the active conversation, composer text, streaming response, and tool state are preserved. Regression tests cover normalization, subscription/unsubscription, and the no-remount Chat integration.
- 2026-08-30: A02 architecture cleanup advanced by extracting the complete Users/admin-invitation table and owner-only account controls into `src/admin/AdminUsers.jsx`. `AdminDashboard.jsx` now acts as the orchestration shell for that feature while all existing server-side role checks, protected-owner guards, confirmations, busy states, and platform API calls remain unchanged. This reduces dashboard UI coupling without changing authentication, persistence, or admin behavior; A02 remains `IN_PROGRESS` while the remaining orchestration/actions are further modularized.
- 2026-08-30: A09 completed at the production API boundary. All JSON `4xx/5xx` responses now pass through one backward-compatible error-envelope middleware that preserves the existing human-readable `error`, preserves valid explicit codes, replaces unsafe/arbitrary codes with stable HTTP-class codes, and guarantees the active `requestId` for correlation. SSE, HTML verification/reset pages, successful JSON responses, authentication behavior, and provider payloads are left untouched. Regression tests cover stable defaults, explicit-code preservation, arbitrary-code rejection, JSON enrichment, and non-JSON passthrough.
- 2026-08-30: A06 production persistence guard hardened. Startup validation now rejects `DATABASE_PATH=:memory:` whenever PathPilot is running in production or Railway, preventing an accidental ephemeral SQLite database from replacing the mounted persistent database at runtime. Development/test in-memory databases remain supported, and feature reporting now exposes `persistentDatabase` as a strict boolean. Regression tests cover standard production, Railway detection, and development compatibility.
- 2026-08-30: Production live-AI connectivity fixed across the server stack. The browser's central API client sends `X-Request-ID` for end-to-end correlation; every active CORS layer now explicitly permits that header, allowing the streamed assistant POST to proceed after a successful preflight instead of falling through to Local Intelligence. A preflight regression test locks the browser/server contract.
- 2026-08-30: Production testing showed the configured Gemini compatibility endpoint completing normal AI requests in about 23 seconds but timing out native stream negotiation after 90 seconds. The assistant SSE route now selects provider-aware delivery: Gemini uses its reliable complete-response request, keeps the browser connection alive, and progressively emits lossless visible chunks through the same abortable live channel; providers with healthy native SSE keep true token streaming. The UI advances to the analysis stage as soon as the live channel opens.
- 2026-08-30: Provider-degradation behavior tightened after a production quota-style rejection. A failed streamed provider attempt no longer triggers an immediate duplicate provider request. The local deterministic tier now handles common technology decisions with concise recommendations that respect deadlines, career goals, and requested reason counts, while unknown choices ask for one decisive criterion instead of dumping unrelated knowledge.
- 2026-08-30: A09 streaming error correlation hardened. The live assistant stream now maps raw provider failures into a stable public taxonomy (`PROVIDER_AUTH_FAILED`, `PROVIDER_RATE_LIMITED`, `PROVIDER_UNAVAILABLE`, `PROVIDER_REQUEST_REJECTED`, `EMPTY_PROVIDER_RESPONSE`, `PROVIDER_TIMEOUT`, `REQUEST_ABORTED`, `STREAM_FAILED`) instead of reusing arbitrary internal/provider messages as error codes. Request IDs remain attached to client-visible failures and stable codes are recorded for analytics; regression tests cover provider statuses, arbitrary internal messages, empty streams, disconnects, and timeouts.
- 2026-08-30: A26 advanced with native Local WebLLM streaming in privileged Chat. The on-device model now emits sanitized visible deltas, supports active generation interruption, and can replace the draft with the quality-gate winner after review. Chat also exposes a safe high-level activity flow, auto-follows streamed content, uses Enter to send / Shift+Enter for a new line, and persists partial stopped or interrupted answers into conversation memory. Research synthesis still completes as a bounded non-stream response, so A26 remains `IN_PROGRESS`.
- 2026-08-30: Chat Agent Orchestrator v2 added a bilingual cognitive matcher for the closest task archetype and expanded the automatic pipeline with follow-up resolution, request decomposition, evidence mapping, decision/ranking engines, answer synthesis, self-correction, and live response streaming. This metadata guides routing and user-facing activity only; hidden chain-of-thought remains private and is never streamed.
- 2026-08-30: A13 i18n coverage expanded to `AuthDialog.jsx`. The guard exposed four untranslated authentication text nodes split around inline JSX elements; those nodes now have explicit runtime English mappings so sign-in, registration, verification, resend, and password-reset surfaces stay translatable without changing authentication behavior or email delivery.
- 2026-08-30: A13 i18n coverage expanded to `AccountExperience.jsx`. Account settings, feedback, Google account status, and account-menu Arabic-only UI copy are now guarded by the combined catalog check; the previously uncovered Google server-configuration status was added to the runtime catalog. Authentication behavior and backend contracts are unchanged.
- 2026-08-30: A13 i18n coverage expanded to the privileged Chat workspace and shared ConversationThread. New Arabic-only literals introduced in those conversational surfaces must now be backed by the combined translation catalogs, while intentional inline English/Arabic ternaries remain supported. This extends CI protection into the main live-chat path without changing runtime behavior or persistence.
- 2026-08-29: A13 i18n coverage hardened so explicit bilingual ternaries no longer cause the entire source line to be skipped. The guard now strips only the matched English/Arabic ternary pair, still catches unrelated Arabic-only UI copy on the same line, and has regression coverage for bilingual, mixed, and Arabic-only ternary cases.
- 2026-08-29: A13 i18n coverage expanded from a single `AppChrome.jsx` guard to a combined-catalog CI check across the main, override, and runtime-hardening catalogs plus critical Arabic-only UI surfaces (`AppChrome`, `Landing`, `WorkspacePanels`, `PinnedPrompts`, and `VoiceControls`). Explicit inline bilingual ternaries are excluded because they do not rely on runtime catalog translation. This prevents new untranslated Arabic-only labels/placeholders/status text from silently shipping while the legacy i18n layers are being consolidated.
- 2026-08-29: Privileged Chat streaming v1 implemented end-to-end for the live direct-AI route. The production server now exposes a secured POST SSE stream that forwards only visible provider output deltas, never provider reasoning fields; the central API client can consume SSE with request IDs, aborts, timeouts, normalized pre-stream errors, and stream cancellation; Chat now inserts the user turn immediately and renders the answer incrementally with a real Stop path. Internal auto-tool/debug chips were removed from the normal answer view so the experience feels like a conversational assistant rather than a developer console. Existing research and local-WebLLM paths remain compatible but still complete as non-streamed fallbacks, so A26 remains IN_PROGRESS until those routes stream natively too.
- 2026-08-29: Natural Chat fast path hardened after production-style testing exposed Egyptian casual variants such as `عامل اي` falling through to the heavy reasoning/provider path. Privileged Chat now recognizes common Egyptian greeting/status variants before model routing, returns an immediate conversational response without RAG/search/report framing, and avoids showing unused agent-tool metadata for those lightweight turns. Regression coverage now includes `عامل اي`, `عامل اية؟`, `إيه الأخبار؟`, and `الدنيا ايه` while substantive prompts still fall through to the reasoning pipeline.
- 2026-08-29: Chat Agent Orchestrator v1 added for the privileged Chat preview. The chat now selects helper capabilities automatically from a registry of 40 context, research, RAG, reasoning, specialist, verification, runtime, and voice capabilities; users can opt out of optional capability groups while context, safety, model routing, confidence checks, and the final quality gate remain mandatory. Search is now treated as a freshness/verification tool rather than a prerequisite for answering stable questions: privileged Chat prefers the evolving local LLM + RAG for stable requests when enabled, while freshness-sensitive requests can automatically route to grounded research. Casual conversation is classified separately so simple prompts such as “انت بتعمل اي؟” stay lightweight and conversational instead of triggering RAG/report templates. The local LLM was split into dedicated model-policy and prompt/review-policy modules, and voice dictation is wired into the Chat composer.
- 2026-08-29: Added an Admin/Owner-only experimental Chat workspace with persistent on-device chat sessions, explicit Search and Deep Think controls, long-history relevance retrieval across up to 30 stored turns while keeping the final model context bounded to the most relevant turns, and role-gated access. Regular users can see the Chat entry but receive a development notice stating that the feature is under development by Abdelrhman. Search can force grounded research; Deep Think enables stricter provider-side verification without exposing hidden reasoning. Account/cloud conversation sync remains TODO and no production SQLite data model was changed.
- 2026-08-29: Conversation intelligence upgraded with a relevance-aware context analyzer. PathPilot now classifies the latest message as standalone/new-topic/related/continuation/follow-up, keeps only relevant prior turns, carries forward explicit constraints only when continuity justifies it, gives the newest request precedence over conflicting history, routes using the latest request instead of the full context envelope, and keeps local RAG retrieval focused on the latest request while the LLM still receives selected conversational context. Regression tests cover follow-ups without lexical overlap, unrelated topic resets, inherited constraints, and RAG query isolation.
- 2026-08-29: Top utility controls cleaned up. Global search and the Arabic/English switch now stay in the document's top utility row and scroll away with the page instead of following the user. Shared responsive sizing, visible keyboard focus, reduced-motion handling, and regression tests were added so the controls remain aligned and non-sticky on desktop and mobile.
- 2026-08-29: Global search privacy tightened. Regular users no longer receive admin-mode history in search, and the global search is not mounted on an unauthorized `#/admin` route. Admin/Owner search access is preserved and covered by regression tests.
- 2026-08-29: Local final-answer quality gate now understands negative constraints such as `without backend changes` / `بدون تغيير backend`. Contradictory reviewed answers receive an explicit penalty and `contradicted-constraints` flag, preventing a stylistically polished review from replacing a draft that actually obeyed the user's hard constraint. Regression tests cover Arabic negative constraints and draft-vs-review selection.
- 2026-08-29: Roadmap reconciled with shipped local intelligence work: local RAG is currently `rag-v4` with query expansion, reranking, deduplication/diversity and bounded context; device-aware model selection with fallback is active; local confidence-aware review and answer-quality verification are active foundations.
- 2026-08-29: Expanded A13 translation coverage CI with a source-level guard for quoted Arabic literals in `AppChrome.jsx`. New Arabic labels, titles, status text, or install instructions in the shared app chrome must now have a matching English catalog entry or CI fails.
- 2026-08-29: Added an automated i18n catalog integrity test that runs in the existing CI suite. It enforces a stable translation baseline, non-empty trimmed entries, Arabic source keys, and reverse-map safety while allowing intentional Arabic aliases that share the same English label. A13 remains in progress until UI-literal coverage is also enforced.
- 2026-08-29: Premium workspace layer shipped with responsive glass/depth UI, animated 3D-style AI core, structured source rail, long-form voice dictation with browser auto-resume, live request processing timer, final response-time badge, public changelog, public user guide, and restored `Built by Abdelrhman Essam` attribution.
- 2026-08-29: Research flow changed to prioritize AI synthesis as soon as a sufficient evidence set exists. The configured Gemini OpenAI-compatible path is preferred when appropriate, with native Gemini fallback. A regression test now requires grounded research to complete through `research-ai` when search and AI are healthy.
- 2026-08-29: Multi-turn context, edit/resubmit, regenerate, real AbortController stop, Markdown/code rendering, sources UI, smart routing, freshness detection, semantic answer cache, Tavily query cache, voice input/read aloud, keyboard shortcuts, history organization foundations, provider resilience, and retrieved-content prompt-injection filtering added.
- 2026-08-29: A05 Central API client advanced with an explicit JSON request contract, stable validation for conflicting JSON/body inputs, and isolation of PathPilot-only request metadata from native `fetch` options. Tests added for serialization, request IDs, metadata isolation, and invalid option handling.

## Foundation roadmap (A01-A50)

| ID | Status | Item |
|---|---|---|
| A01 | DONE | Split App.jsx into focused UI modules |
| A02 | IN_PROGRESS | Split Admin Dashboard into feature modules; access gate, presentation, workspace controller, Users UI, and user-management action hook extracted; invitation/export action split remains |
| A03 | TODO | Split authentication UI by flow |
| A04 | TODO | Archive/remove legacy intelligence servers after parity verification |
| A05 | DONE | Central API client, including JSON contracts, request IDs, abort/timeout handling, and SSE event streaming |
| A06 | DONE | Startup configuration validator, including production/Railway persistent-SQLite enforcement |
| A07 | DONE | Deep health checks for DB, Gemini, Tavily, Gmail API |
| A08 | DONE | React Error Boundary |
| A09 | DONE | Unified production JSON error envelopes and request correlation, including stable streaming/provider failure taxonomy |
| A10 | IN_PROGRESS | Update README and deployment docs; changelog/user guide are now current |
| A11 | IN_PROGRESS | Key-based i18n architecture; app-owned reactive language state now updates open Chat immediately without navigation/remount |
| A12 | IN_PROGRESS | Merge legacy i18n runtime layers |
| A13 | IN_PROGRESS | Translation coverage CI validates combined catalogs plus core app, workspace, voice, privileged Chat, conversation-thread, account-experience, and authentication surfaces; broader component coverage remains |
| A14 | TODO | Automated LTR/RTL UI checks |
| A15 | IN_PROGRESS | Full mobile UX pass; premium workspace responsive pass + non-sticky top utility controls completed |
| A16 | IN_PROGRESS | Accessibility pass; focus states, reduced-motion support, and top utility keyboard focus protection active |
| A17 | IN_PROGRESS | Unified design system; premium workspace token layer active |
| A18 | TODO | Skeleton loading states |
| A19 | TODO | Unified toast system |
| A20 | TODO | First-run onboarding |
| A21 | DONE | True multi-message chat; dedicated privileged chat preview now uses persistent local sessions |
| A22 | DONE | Relevance-aware conversation context, follow-up resolution, new-topic isolation, and long-chat relevant-turn retrieval |
| A23 | DONE | Edit and resubmit |
| A24 | DONE | Regenerate answer |
| A25 | DONE | Stop generation with request abort |
| A26 | IN_PROGRESS | True live streaming is active for the direct provider SSE route and the browser Local WebLLM route with abortable incremental rendering; research synthesis streaming remains TODO |
| A27 | DONE | Markdown renderer |
| A28 | DONE | Rich code blocks and copy |
| A29 | DONE | Dedicated structured sources UI |
| A30 | IN_PROGRESS | Source quality score; backend ranking active, richer user-facing score pending |
| A31 | DONE | Smart request router; contextual prompts are routed using the latest user request |
| A32 | DONE | Stronger freshness detector |
| A33 | DONE | Natural local final answers with semantic short-message archetypes, filler-aware mixed-language matching, action-bearing fallthrough, and language-scoped near-duplicate avoidance across adjacent conversational intents without forcing research/RAG templates |
| A34 | DONE | Stronger local challenge pass |
| A35 | DONE | Better constraint extraction |
| A36 | TODO | Indexed local RAG |
| A37 | TODO | Lazy-load large knowledge packs |
| A38 | DONE | Knowledge deduplication and diversity control active in local RAG |
| A39 | IN_PROGRESS | Knowledge-pack versioning; runtime version metadata active, migration/compatibility policy pending |
| A40 | TODO | Local LLM manager UI |
| A41 | DONE | Device-aware local model selection with automatic lighter-model fallback |
| A42 | DONE | Context budget manager with relevance filtering; privileged Chat scans up to 30 stored turns but injects only the most relevant bounded context |
| A43 | TODO | Optional account conversation storage |
| A44 | TODO | Cross-device conversation sync |
| A45 | DONE | Conversation/history search foundation |
| A46 | TODO | Session management and logout-all |
| A47 | TODO | Versioned database migrations and restore tests |
| A48 | IN_PROGRESS | Advanced admin analytics; role-safe Admin/Owner Ban/Unban controls shipped, while privacy-scoped server-derived anonymous visitor IP/User-Agent/session telemetry and retention disclosure remain |
| A49 | TODO | Production E2E test suite |
| A50 | BLOCKED | Final Google Sign-In rollout. Requires final Google OAuth Client ID/origin configuration when implementation reaches this stage. |

## Product and scale roadmap (B01-B50)

| ID | Status | Item |
|---|---|---|
| B01 | DONE | Feature flags and percentage rollout |
| B02 | TODO | Canary releases |
| B03 | TODO | Preview environment per pull request |
| B04 | TODO | Fast production rollback workflow |
| B05 | DONE | Request IDs across client and server foundation |
| B06 | DONE | Provider circuit breakers |
| B07 | DONE | Intelligent retry with exponential backoff |
| B08 | DONE | AI request queue and concurrency control |
| B09 | DONE | Per-user/per-role style rate-limit policies |
| B10 | TODO | Idempotency keys for sensitive writes |
| B11 | DONE | Conservative semantic answer cache; automatic agent tool plans are isolated in cache signatures |
| B12 | DONE | Research query cache |
| B13 | TODO | Dynamic model selection |
| B14 | TODO | Provider quality scoring |
| B15 | IN_PROGRESS | Answer verification pass; local Draft → Review quality gate and contradiction-aware constraint verification active; automatic Chat orchestration can escalate deep review when needed |
| B16 | TODO | Citation-to-claim matching |
| B17 | IN_PROGRESS | Local LLM confidence scoring is active and influences review; dedicated user-facing indicator pending |
| B18 | IN_PROGRESS | Explicit uncertainty handling in prompts/fallbacks; dedicated UI pending |
| B19 | DONE | Prompt-injection protection for retrieved content |
| B20 | DONE | Trusted-domain/authority boosting in research ranking |
| B21 | TODO | PDF/TXT/DOCX uploads |
| B22 | TODO | Multimodal image input |
| B23 | DONE | Long-form voice input with browser auto-resume; privileged Chat composer now reuses voice dictation |
| B24 | DONE | Read aloud |
| B25 | TODO | PDF export |
| B26 | TODO | DOCX export |
| B27 | TODO | CSV table export |
| B28 | DONE | Favorite conversations foundation |
| B29 | DONE | Conversation folders foundation |
| B30 | DONE | Conversation tags foundation |
| B31 | DONE | Keyboard shortcuts |
| B32 | DONE | Command palette / global search, with admin/owner-only administrative search visibility |
| B33 | IN_PROGRESS | Pinned prompts storage/component foundation; full workspace integration pending |
| B34 | TODO | Custom tool builder |
| B35 | TODO | Custom instructions |
| B36 | TODO | User profiles/personas |
| B37 | TODO | Project spaces |
| B38 | TODO | Expiring share links |
| B39 | TODO | Private share controls |
| B40 | DONE | Better PWA update UX |
| B41 | TODO | Admin MFA |
| B42 | TODO | Passkeys |
| B43 | TODO | Suspicious-login alerts |
| B44 | TODO | Email-change verification |
| B45 | TODO | Self-service account deletion |
| B46 | TODO | User data export |
| B47 | TODO | Data-retention controls |
| B48 | TODO | AI cost dashboard |
| B49 | TODO | Golden evaluation set |
| B50 | TODO | Product intelligence funnel dashboard |

## Current execution order

1. Finish i18n cleanup/coverage and remaining architecture split work.
2. Streaming + loading states + unified toast/feedback UX.
3. Indexed local RAG + lazy knowledge packs + deduplication/versioning.
4. Local LLM manager + device-aware model selection.
5. Persistence, sync, sessions, migrations, analytics.
6. File/multimodal/export/product features.
7. Security hardening, E2E suite, then final Google Sign-In rollout.