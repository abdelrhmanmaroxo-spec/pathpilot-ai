# PathPilot Product Roadmap

This file is the execution tracker for the two approved 50-item roadmaps. Status values are `DONE`, `IN_PROGRESS`, `BLOCKED`, and `TODO`.

## Execution rule

- Fix broken CI/deploy first.
- Work in safe batches and verify each batch before the next one.
- If a task needs an external account action, credential, paid service, domain, store approval, or other user-only step, mark it `BLOCKED` with the exact requirement and continue with another unblocked task.
- Never weaken authentication, email verification, owner protections, or persistence to make a task pass.
- Preserve the Railway SQLite volume and production data.

## Progress notes

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
| A02 | IN_PROGRESS | Split Admin Dashboard into feature modules |
| A03 | TODO | Split authentication UI by flow |
| A04 | TODO | Archive/remove legacy intelligence servers after parity verification |
| A05 | DONE | Central API client, including JSON contracts, request IDs, abort/timeout handling, and SSE event streaming |
| A06 | DONE | Startup configuration validator |
| A07 | DONE | Deep health checks for DB, Gemini, Tavily, Gmail API |
| A08 | DONE | React Error Boundary |
| A09 | IN_PROGRESS | Unified error codes and request correlation |
| A10 | IN_PROGRESS | Update README and deployment docs; changelog/user guide are now current |
| A11 | IN_PROGRESS | Key-based i18n architecture |
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
| A26 | IN_PROGRESS | True live SSE streaming is active for the direct provider Chat route with immediate user turns and abortable incremental rendering; research and local-WebLLM native streaming remain TODO |
| A27 | DONE | Markdown renderer |
| A28 | DONE | Rich code blocks and copy |
| A29 | DONE | Dedicated structured sources UI |
| A30 | IN_PROGRESS | Source quality score; backend ranking active, richer user-facing score pending |
| A31 | DONE | Smart request router; contextual prompts are routed using the latest user request |
| A32 | DONE | Stronger freshness detector |
| A33 | DONE | Natural local final answers, including lightweight casual conversation without forcing research/RAG templates |
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
| A48 | IN_PROGRESS | Advanced admin analytics |
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
