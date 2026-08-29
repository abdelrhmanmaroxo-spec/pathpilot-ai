# PathPilot Product Roadmap

This file is the execution tracker for the two approved 50-item roadmaps. Status values are `DONE`, `IN_PROGRESS`, `BLOCKED`, and `TODO`.

## Execution rule

- Fix broken CI/deploy first.
- Work in safe batches and verify each batch before the next one.
- If a task needs an external account action, credential, paid service, domain, store approval, or other user-only step, mark it `BLOCKED` with the exact requirement and continue with another unblocked task.
- Never weaken authentication, email verification, owner protections, or persistence to make a task pass.
- Preserve the Railway SQLite volume and production data.

## Progress notes

- 2026-08-29: A05 Central API client advanced with an explicit `json` request contract, stable validation for conflicting `json`/`body` inputs, and isolation of PathPilot-only request metadata from native `fetch` options. Tests added for serialization, request IDs, metadata isolation, and invalid option handling.

## Foundation roadmap (A01-A50)

| ID | Status | Item |
|---|---|---|
| A01 | TODO | Split App.jsx into focused UI modules |
| A02 | TODO | Split Admin Dashboard into feature modules |
| A03 | TODO | Split authentication UI by flow |
| A04 | TODO | Archive/remove legacy intelligence servers after parity verification |
| A05 | IN_PROGRESS | Central API client |
| A06 | IN_PROGRESS | Startup configuration validator |
| A07 | TODO | Deep health checks for DB, Gemini, Tavily, Gmail API |
| A08 | IN_PROGRESS | React Error Boundary |
| A09 | IN_PROGRESS | Unified error codes and request correlation |
| A10 | TODO | Update README and deployment docs |
| A11 | IN_PROGRESS | Key-based i18n architecture |
| A12 | IN_PROGRESS | Merge legacy i18n runtime layers |
| A13 | TODO | Translation coverage CI test |
| A14 | TODO | Automated LTR/RTL UI checks |
| A15 | TODO | Full mobile UX pass |
| A16 | TODO | Accessibility pass |
| A17 | TODO | Unified design system |
| A18 | TODO | Skeleton loading states |
| A19 | TODO | Unified toast system |
| A20 | TODO | First-run onboarding |
| A21 | TODO | True multi-message chat |
| A22 | TODO | Conversation context and follow-ups |
| A23 | TODO | Edit and resubmit |
| A24 | TODO | Regenerate answer |
| A25 | TODO | Stop generation |
| A26 | TODO | Streaming responses |
| A27 | TODO | Markdown renderer |
| A28 | TODO | Rich code blocks and copy |
| A29 | TODO | Dedicated sources UI |
| A30 | TODO | Source quality score |
| A31 | TODO | Smart request router |
| A32 | TODO | Stronger freshness detector |
| A33 | IN_PROGRESS | Natural local final answers |
| A34 | IN_PROGRESS | Stronger local challenge pass |
| A35 | IN_PROGRESS | Better constraint extraction |
| A36 | TODO | Indexed local RAG |
| A37 | TODO | Lazy-load large knowledge packs |
| A38 | TODO | Knowledge deduplication |
| A39 | TODO | Knowledge-pack versioning |
| A40 | TODO | Local LLM manager UI |
| A41 | TODO | Device-aware local model selection |
| A42 | TODO | Context budget manager |
| A43 | TODO | Optional account conversation storage |
| A44 | TODO | Cross-device conversation sync |
| A45 | TODO | Conversation search |
| A46 | TODO | Session management and logout-all |
| A47 | TODO | Versioned database migrations and restore tests |
| A48 | TODO | Advanced admin analytics |
| A49 | TODO | Production E2E test suite |
| A50 | BLOCKED | Final Google Sign-In rollout. Requires final Google OAuth Client ID/origin configuration when implementation reaches this stage. |

## Product and scale roadmap (B01-B50)

| ID | Status | Item |
|---|---|---|
| B01 | TODO | Feature flags and percentage rollout |
| B02 | TODO | Canary releases |
| B03 | TODO | Preview environment per pull request |
| B04 | TODO | Fast production rollback workflow |
| B05 | IN_PROGRESS | Request IDs across client and server |
| B06 | TODO | Provider circuit breakers |
| B07 | TODO | Intelligent retry with backoff |
| B08 | TODO | AI request queue and concurrency control |
| B09 | TODO | Per-user and per-role rate limits |
| B10 | TODO | Idempotency keys for sensitive writes |
| B11 | TODO | Semantic answer cache |
| B12 | TODO | Research query cache |
| B13 | TODO | Dynamic model selection |
| B14 | TODO | Provider quality scoring |
| B15 | TODO | Answer verification pass |
| B16 | TODO | Citation-to-claim matching |
| B17 | TODO | Confidence indicators |
| B18 | TODO | Explicit uncertainty handling |
| B19 | TODO | Prompt-injection protection for retrieved content |
| B20 | TODO | Trusted-domain boosting |
| B21 | TODO | PDF/TXT/DOCX uploads |
| B22 | TODO | Multimodal image input |
| B23 | TODO | Voice input |
| B24 | TODO | Read aloud |
| B25 | TODO | PDF export |
| B26 | TODO | DOCX export |
| B27 | TODO | CSV table export |
| B28 | TODO | Favorite conversations |
| B29 | TODO | Conversation folders |
| B30 | TODO | Conversation tags |
| B31 | TODO | Keyboard shortcuts |
| B32 | TODO | Command palette |
| B33 | TODO | Pinned prompts |
| B34 | TODO | Custom tool builder |
| B35 | TODO | Custom instructions |
| B36 | TODO | User profiles/personas |
| B37 | TODO | Project spaces |
| B38 | TODO | Expiring share links |
| B39 | TODO | Private share controls |
| B40 | TODO | Better PWA update UX |
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

1. Architecture and API foundation
2. Error/config/observability foundation
3. i18n cleanup and coverage
4. Conversation context + streaming + rendering + sources
5. Smart routing + local RAG + evaluation
6. Persistence, sync, sessions, migrations, analytics
7. File/multimodal/voice/export/product features
8. Security hardening and Google Sign-In rollout
