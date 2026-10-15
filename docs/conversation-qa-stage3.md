# Conversation QA Stage 3

This corpus is intentionally lightweight and provider-free. It is a review checklist for the conversational fast path and its fall-through boundary.

## Arabic / Egyptian Arabic

- `اهلاااا!!!` → greeting, normalize repeated letters and punctuation.
- `عامل ايه يا معلم؟` → status question, preserve Egyptian tone.
- `لسه مش فاهم خالص` → confusion follow-up, keep prior topic context.
- `كمل الشرح بقى` → action-bearing follow-up, bypass casual fast path.
- `معلش، أنا لخبطت` → apology/confusion, do not erase context.
- `تمام كده، تسلم` → acknowledgement + thanks, one concise response.
- `انت موجود؟` → presence/status, lightweight response.
- `انا عايزة اكمل` → strong feminine self-reference, feminine Arabic address.
- `انا عايز اكمل` → strong masculine self-reference, masculine Arabic address.
- `عايز مساعدة في الكود` → substantive request, normal reasoning/RAG/search path.

## Arabizi / code-switching

- `ahlan ya bro!!!` → greeting, Arabic-first response mode.
- `msh fahm el point` → confusion, retain the latest relevant context.
- `kml el shar7` → action-bearing follow-up, do not answer with a generic social variant.
- `shokran gedan` → thanks, avoid repeating the same thank-you reply.
- `ana kwayesa bs ta3bana` → strong feminine self-reference, preserve current evidence only.
- `why is DNS cached?` → new substantive topic, never attach an unrelated prior “why” turn.

## English

- `hellooo!!!` → greeting normalization.
- `still confused` → confusion follow-up.
- `what about the second one?` → context reference to the latest compatible turn.
- `continue with the next step` → action-bearing follow-up.
- `are you still there?` → presence/status.
- `thanks again` → thanks with anti-repetition.

## Regression rules

1. Normalization must tolerate punctuation noise, repeated Latin characters, Arabic diacritics, tatweel, and harmless spacing without changing intent.
2. Social fast-path handling must never swallow a request containing an action cue such as explain, continue, write, fix, debug, search, compare, code, or their supported Arabic/Arabizi equivalents.
3. Ambiguous grammatical evidence remains neutral. Only strong explicit or first-person self-reference may change Arabic address form.
4. Newer strong self-reference overrides older context. No demographic field or prompt-text profile is persisted.
5. Repeated same-intent turns should rotate wording when alternatives exist, while singleton fallback strings remain deterministic.
6. Context references must anchor to the latest compatible turn and reject unrelated topic jumps.
