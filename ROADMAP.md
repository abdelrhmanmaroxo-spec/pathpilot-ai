# PathPilot Product Roadmap

This file is the execution tracker for the two approved 50-item roadmaps. Status values are `DONE`, `IN_PROGRESS`, `BLOCKED`, and `TODO`.

## Execution rule

- Fix broken CI/deploy first.
- Work in safe batches and verify each batch before the next one.
- If a task needs an external account action, credential, paid service, domain, store approval, or other user-only step, mark it `BLOCKED` with the exact requirement and continue with another unblocked task.
- Never weaken authentication, email verification, owner protections, or persistence to make a task pass.
- Preserve the Railway SQLite volume and production data.

## Progress notes

- 2026-08-31: A33 conversational turn shaping hardened in the provider adapter. PathPilot now derives a deterministic lightweight turn profile for normalized Arabic, Egyptian Arabic, Arabizi, English, and mixed-language input, covering social intents, follow-ups, confusion/frustration, and action-bearing fallthrough. Explicit first-person masculine/feminine cues are scoped to conversational Arabic wording only; names and ambiguous signals remain neutral. Provider requests carry only compact intent/language/agreement metadata, while API shapes, security boundaries, provider integrations, auth, persistence, and production data remain unchanged. Regression coverage locks noise-tolerant intent detection, lightweight-vs-substantive routing, explicit/conflicting gender evidence, language behavior, and both provider request modes. A33 remains `DONE` with ongoing quality hardening.

- 2026-08-31: A33 conversational response diversity hardening advanced in the provider system prompt. PathPilot now explicitly rotates openings, sentence rhythm, examples, and closings for repeated or near-duplicate social turns; acknowledges continuity instead of restating an answer verbatim; uses only the last few relevant turns for lightweight pronoun/ellipsis/constraint handling; ignores stale context on clear topic changes; and avoids forcing novelty into high-stakes or tightly formatted outputs. No prompt text is stored, no demographic profile is introduced, and existing language, safety, provider, auth, persistence, and integration boundaries remain unchanged. Regression tests cover the new diversity guardrails and context-selection rules.
"+"