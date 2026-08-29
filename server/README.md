# PathPilot AI Backend

This folder is the secure platform backend: accounts, sessions, SQLite persistence, real analytics, admin data, feedback, client-error reporting, optional Google sign-in, and an optional live AI provider. The frontend continues to use its local mode when the backend or AI credentials are absent.

## Configuration

Set these values in the secret/environment settings of the backend host. Never commit `.env.local` or expose `AI_API_KEY` as a Vite variable.

```env
AI_API_KEY=replace-in-host-secret-settings
AI_PROVIDER=OpenAI
AI_MODEL=provider-model-name
AI_BASE_URL=https://provider.example.com/v1
AI_API_MODE=chat-completions
AI_REASONING_EFFORT=medium
ALLOWED_ORIGINS=https://abdelrhmanmaroxo-spec.github.io,http://localhost:5173
OWNER_EMAIL=your-owner-email@example.com
GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
DATABASE_PATH=server/data/pathpilot.sqlite
PORT=8787
```

- `OWNER_EMAIL` is the protected platform owner. That account is always an admin and cannot be demoted. Only the owner can grant or remove admin access for other users from the Users tab.
- `ADMIN_EMAIL` is still accepted as a backwards-compatible alias for `OWNER_EMAIL`.
- `GOOGLE_CLIENT_ID` enables the official Google Identity Services sign-in button. Google users are normal users by default unless their email matches `OWNER_EMAIL` or the owner promotes them later.
- `AI_API_MODE=chat-completions` supports OpenAI-compatible chat endpoints.
- `AI_API_MODE=responses` supports providers exposing a Responses-style endpoint.
- `AI_ENDPOINT` can override the complete provider endpoint.
- `AI_REASONING_EFFORT` is optional. Leave it blank for models that do not support reasoning controls.

Run the backend with `npm run server`, deploy it to a server-capable host, then build the frontend with:

```env
VITE_AI_API_URL=https://your-backend.example.com/api/assistant
VITE_PLATFORM_API_URL=https://your-backend.example.com
```

The frontend automatically keeps its current local fallback if the backend is unavailable.

The owner account is recognized server-side from `OWNER_EMAIL`; the browser never decides who is an admin. Use a persistent disk for `DATABASE_PATH`; ephemeral disks will lose accounts and analytics during redeployments. Terminate TLS at the host and do not put backend secrets in `VITE_` variables.
