# PathPilot Product Roadmap

This file is the execution tracker for the two approved 50-item roadmaps. Status values are `DONE`, `IN_PROGRESS`, `BLOCKED`, and `TODO`.

## Execution rule

- Fix broken CI/deploy first.
- Work in safe batches and verify each batch before the next one.
- If a task needs an external account action, credential, paid service, domain, store approval, or other user-only step, mark it `BLOCKED` with the exact requirement and continue with another unblocked task.
- Never weaken authentication, email verification, owner protections, or persistence to make a task pass.
- Preserve the Railway SQLite volume and production data.

## Progress notes

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
| A05 | DONE | Central API client |
| A06 | DONE | Startup configuration validator |
| A07 | DONE | Deep health checks for DB, Gemini, Tavily, Gmail API |
| A08 | DONE | React Error Boundary |
| A09 | IN_PROGRESS | Unified error codes and request correlation |
| A10 | IN_PROGRESS | Update README and deployment docs; changelog/user guide are now current |
| A11 | IN_PROGRESS | Key-based i18n architecture |
| A12 | IN_PROGRESS | Merge legacy i18n runtime layers |
| A13 | IN_PROGRESS | Translation coverage CI test; catalog integrity enforced, UI-literal coverage pending |
| A14 | TODO | Automated LTR/RTL UI checks |
| A15 | IN_PROGRESS | Full mobile UX pass; premium workspace responsive pass completed |
| A16 | IN_PROGRESS | Accessibility pass; focus states and reduced-motion support active |
| A17 | IN_PROGRESS | Unified design system; premium workspace token layer active |
| A18 | TODO | Skeleton loading states |
| A19 | TODO | Unified toast system |
| A20 | TODO | First-run onboarding |
| A21 | DONE | True multi-message chat |
| A22 | DONE | Conversation context and follow-ups |
| A23 | DONE | Edit and resubmit |
| A24 | DONE | Regenerate answer |
| A25 | DONE | Stop generation with request abort |
| A26 | TODO | Streaming responses |
| A27 | DONE | Markdown renderer |
| A28 | DONE | Rich code blocks and copy |
| A29 | DONE | Dedicated structured sources UI |
| A30 | IN_PROGRESS | Source quality score; backend ranking active, richer user-facing score pending |
| A31 | DONE | Smart request router |
| A32 | DONE | Stronger freshness detector |
| A33 | DONE | Natural local final answers for current local-reasoner scope |
| A34 | DONE | Stronger local challenge pass |
| A35 | DONE | Better constraint extraction |
| A36 | TODO | Indexed local RAG |
| A37 | TODO | Lazy-load large knowledge packs |
| A38 | TODO | Knowledge deduplication |
| A39 | TODO | Knowledge-pack versioning |
| A40 | TODO | Local LLM manager UI |
| A41 | TODO | Device-aware local model selection |
| A42 | DONE | Context budget manager for bounded recent conversation context |
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
| B11 | DONE | Conservative semantic answer cache |
| B12 | DONE | Research query cache |
| B13 | TODO | Dynamic model selection |
| B14 | TODO | Provider quality scoring |
| B15 | TODO | Answer verification pass |
| B16 | TODO | Citation-to-claim matching |
| B17 | TODO | Confidence indicators |
| B18 | IN_PROGRESS | Explicit uncertainty handling in prompts/fallbacks; dedicated UI pending |
| B19 | DONE | Prompt-injection protection for retrieved content |
| B20 | DONE | Trusted-domain/authority boosting in research ranking |
| B21 | TODO | PDF/TXT/DOCX uploads |
| B22 | TODO | Multimodal image input |
| B23 | DONE | Long-form voice input with browser auto-resume |
| B24 | DONE | Read aloud |
| B25 | TODO | PDF export |
| B26 | TODO | DOCX export |
| B27 | TODO | CSV table export |
| B28 | DONE | Favorite conversations foundation |
| B29 | DONE | Conversation folders foundation |
| B30 | DONE | Conversation tags foundation |
| B31 | DONE | Keyboard shortcuts |
| B32 | TODO | Command palette |
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
