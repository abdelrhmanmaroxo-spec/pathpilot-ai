# PathPilot Changelog

This file tracks product changes that matter to users. Internal refactors are included only when they improve reliability, speed, safety, or future maintainability.

## 2026-08-29 — Premium Intelligence & Workspace Upgrade

### What users get
- **Long-form voice dictation**: voice input now auto-resumes when the browser ends a speech-recognition session after silence or an internal time limit. Recording continues until the user explicitly stops it.
- **Live processing timer**: every AI request now shows a live elapsed-time counter while PathPilot is working, then keeps the final completion time on the answer.
- **Smarter AI research flow**: AI synthesis is now prioritized as soon as there is enough evidence instead of spending the time budget chasing extra sources first.
- **Better Gemini routing**: PathPilot prefers the configured compatibility path when the deployment is using Google's OpenAI-compatible endpoint, then falls back to the native Gemini path when useful.
- **Structured source panel**: research references are separated from the main answer so users can read the response without long raw URLs interrupting it.
- **Cleaner research answers**: duplicated research banners and appended raw source lists are removed from the visible answer when structured source data is available.
- **Premium 3D AI workspace**: new glass-depth UI, subtle neon accents, responsive source rail, animated AI core, improved voice controls, and a more readable response surface.
- **Reduced-motion support**: 3D and voice animations respect the operating system's Reduce Motion preference.

### Intelligence and reliability improvements already active
- Multi-turn conversation context with bounded context windows.
- Edit/reuse a previous prompt and resubmit it.
- Regenerate the latest answer.
- Real request cancellation with AbortController.
- Smart routing between direct AI and grounded web research.
- Freshness detection for queries that need current information.
- Tavily research cache and conservative semantic answer cache.
- Provider retries, concurrency limits, and circuit breakers.
- Prompt-injection filtering for retrieved web content.
- Markdown output, code blocks, copy controls, and structured source handling.
- Voice input and read-aloud controls.
- Keyboard shortcuts including Ctrl/Cmd + Enter, Ctrl/Cmd + K, and Escape while generating.
- Favorites, folders, tags, history search, and pinned-prompt foundations.
- Account verification and password reset through Gmail API.
- Admin analytics, system status, security controls, feedback, error visibility, and owner protections.

### Why this release matters
The goal is not only to add more buttons. This release makes PathPilot behave more like one coherent assistant: the interface communicates what is happening, AI gets priority when it should, research evidence is easier to inspect, long voice input is practical, and failures have safer fallback paths.

## 2026-08 — Accounts, Email, Research, and Local Intelligence

### Added
- Email/password registration with verification.
- Password reset with expiring one-time links.
- Gmail API delivery over HTTPS for Railway compatibility.
- Persistent SQLite storage on the Railway volume.
- Owner/admin protections and audit-style event logging.
- Tavily web research with source-quality ranking.
- Gemini-powered synthesis and AI-only fallback.
- Local Super Reasoner and browser Local LLM option.
- Expanded local encyclopedia and multi-pass local reasoning.
- Arabic/English language switching with runtime translation hardening.
- Installable PWA experience.

### Safety and resilience
- Password hashing with scrypt.
- Opaque session tokens stored as hashes.
- Rate limiting and security guards.
- Safe account persistence when verification email delivery fails.
- Deep health checks for database, AI, search, and email readiness.

---

## Changelog policy
- User-facing benefits come first.
- Security-sensitive implementation details are described at a safe level and never include secrets.
- Experimental capabilities are labeled when appropriate.
- If a feature is partially rolled out or blocked by an external provider, that status should be stated rather than hidden.
