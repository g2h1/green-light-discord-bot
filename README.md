# GREEN LIGHT

Private Discord server management dashboard + bot.

```
frontend/  React + Vite + TypeScript + Tailwind — admin dashboard
backend/   Node + Express + TypeScript — API, auth, privileged Discord actions
bot/       discord.js + TypeScript — gateway bot, slash commands
```

## Setup

```bash
npm install
```

Copy each `.env.example` to `.env` and fill in real values:

- `backend/.env` — Discord OAuth app credentials, bot token, Supabase service role key, session secret
- `bot/.env` — bot token, Supabase service role key
- `frontend/.env` — `VITE_API_URL` (defaults to `/api`, proxied to the backend in dev)

## Development

```bash
npm run dev:frontend   # http://localhost:5173
npm run dev:backend    # http://localhost:4000
npm run dev:bot        # connects to Discord gateway
```

Register slash commands after adding/changing any command:

```bash
npm run deploy-commands -w bot
```

## Security

- The Discord bot token, OAuth client secret, and Supabase service role key live only in `backend/.env` and `bot/.env` — never sent to the frontend.
- The frontend only receives data explicitly returned by the backend API. All privileged actions (moderation, role/channel changes, message sends) are authorized server-side, not trusted from the client.
- Every server-scoped API route re-validates the caller's live Discord permissions on that guild (`requireServerAccess`) — nothing is cached or trusted from login time.
- Role/channel edits and moderation actions check hierarchy against the bot's own highest role before acting, refusing with a clear error rather than letting Discord bounce a confusing 403.

## Deployment

- **Frontend** (`frontend/`): deploy to Vercel. `vercel.json` handles SPA client-side routing. Set `VITE_API_URL` to the deployed backend's `/api` URL.
- **Backend** (`backend/`) and **Bot** (`bot/`): each has a `Dockerfile` (multi-stage, builds TypeScript then runs the compiled output) that works on Railway, Render, or a plain VPS. Point each platform at the respective subdirectory as the build context, and set the same environment variables as `.env.example` in that service's dashboard — never commit real secrets.
- The backend needs a public `PORT` and `FRONTEND_URL` set to the deployed frontend's origin (for CORS). The bot process has no exposed port — it only holds a persistent gateway connection.
- Both backend and bot connect to the same Supabase project; only the backend serves the browser-facing API.
