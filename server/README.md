# PathPilot AI Backend

This folder is the secure platform backend: accounts, sessions, SQLite persistence, real analytics, admin data, feedback, client-error reporting, and an optional live AI provider. The frontend continues to use its local mode when the backend or AI credentials are absent.

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
ADMIN_EMAIL=your-admin-email@example.com
DATABASE_PATH=server/data/pathpilot.sqlite
PORT=8787
```

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

The first account registered with the same email as `ADMIN_EMAIL` receives the `admin` role and can open the real-data dashboard. Use a persistent disk for `DATABASE_PATH`; ephemeral disks will lose accounts and analytics during redeployments. Terminate TLS at the host and do not put any backend secret in a `VITE_` variable.
