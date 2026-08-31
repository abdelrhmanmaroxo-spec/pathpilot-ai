# PathPilot Product Roadmap

This file is the execution tracker for the two approved 50-item roadmaps. Status values are `DONE`, `IN_PROGRESS`, `BLOCKED`, and `TODO`.

## Execution rule

- Fix broken CI/deploy first.
- Work in safe batches and verify each batch before the next one.
- If a task needs an external account action, credential, paid service, domain, store approval, or other user-only step, mark it `BLOCKED` with the exact requirement and continue with another unblocked task.
- Never weaken authentication, email verification, owner protections, or persistence to make a task pass.
- Preserve the Railway SQLite volume and production data.

## Progress notes

- 2026-08-31: A33 Egyptian Arabic/Arabizi naturalness hardening expanded the shared normalizer with common spelling variants such as `mmkn/momken`, `3arfa/3aref`, `fehm`, and feminine confusion forms. The lightweight path now recognizes these variants consistently, preserves Arabic mode, keeps context-sensitive confusion on the full reasoning path, and continues to reject mixed-language action-bearing requests. Regression tests cover whitespace/case noise, feminine variants, mixed-language routing, and context fallthrough. No prompt text is stored and auth, persistence, providers, and secrets remain unchanged.
- 2026-08-31: A33 conversational response diversity hardening advanced in the provider system prompt. PathPilot now explicitly rotates openings, sentence rhythm, examples, and closings for repeated or near-duplicate social turns; acknowledges continuity instead of restating an answer verbatim; uses only the last few relevant turns for lightweight pronoun/ellipsis/constraint handling; ignores stale context on clear topic changes; and avoids forcing novelty into high-stakes or tightly formatted outputs. No prompt text is stored, no demographic profile is introduced, and existing language, safety, provider, auth, persistence, and integration boundaries remain unchanged. Regression tests cover the new diversity guardrails and context-selection rules. A33 remains `DONE` with ongoing quality hardening.

## Roadmap status

- A33 Conversational quality and naturalness: `DONE` with ongoing regression hardening.
- A22 Context and follow-up continuity: `DONE` with ongoing regression hardening.
- A02 Admin architecture decomposition: `IN_PROGRESS`.
- A48 Role-safe moderation: `DONE`.
- A11 Reactive language state: `DONE`.
- A09 API error correlation and stable error envelopes: `DONE`.
- A06 Production persistence guard: `DONE`.
- A26 Local WebLLM streaming: `IN_PROGRESS`.
