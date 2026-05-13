# HACKSU Bingo

A SvelteKit web app where users sign in with Discord or GitHub and check off
HACKSU activity tiles on a personal bingo card.

## Stack

- **Frontend + backend:** SvelteKit 2 (Svelte 5) with `adapter-node`
- **Styling:** Tailwind CSS v4
- **Database:** PostgreSQL via [Drizzle ORM](https://orm.drizzle.team)
- **Auth:** [Better Auth](https://www.better-auth.com) (Discord + GitHub OAuth)
- **Runtime / package manager:** [Bun](https://bun.sh)
- **Deploy target:** Docker / Dokploy

## Local development

```bash
cp .env.example .env
# fill in BETTER_AUTH_SECRET and OAuth client IDs/secrets

# Spin up just the database
docker compose up -d db

bun install
bun run db:push     # apply schema to the DB
bun run db:seed     # insert the default 5x5 tile set
bun run dev
```

App: <http://localhost:5173>

## Full Docker run

```bash
cp .env.example .env
docker compose up --build
```

App: <http://localhost:3000>

After the app container is up, run the migration + seed inside it:

```bash
docker compose exec app bun run db:push
docker compose exec app bun run db:seed
```

## OAuth callback URLs

Register these in each provider's developer console:

- Discord → `${BETTER_AUTH_URL}/api/auth/callback/discord`
- GitHub  → `${BETTER_AUTH_URL}/api/auth/callback/github`

For local dev, `BETTER_AUTH_URL` is typically `http://localhost:5173` (dev) or
`http://localhost:3000` (Docker). For production set it to your public URL.

## Project layout

```
src/
├── app.html, app.css, app.d.ts
├── hooks.server.ts             # mounts Better Auth + populates locals.user/session
├── lib/
│   ├── auth-client.ts          # client-side Better Auth helpers (signIn / signOut)
│   └── server/
│       ├── auth.ts             # Better Auth instance (Discord + GitHub)
│       └── db/
│           ├── schema.ts       # Drizzle tables: user/session/account/verification + bingo_*
│           ├── index.ts        # Drizzle client
│           └── seed.ts         # bun run db:seed
└── routes/
    ├── +layout.svelte / +layout.server.ts
    ├── +page.svelte            # landing page
    ├── login/+page.svelte      # OAuth buttons
    ├── bingo/+page.{svelte,server.ts}  # card + toggle action
    └── api/auth/[...all]/+server.ts    # Better Auth handler
```

## Next steps

- Replace seed tiles with the real HACKSU activity list
- Drop final art / assets into `static/`
- Add admin tooling to manage tiles without re-seeding
- Add bingo-win detection (rows / cols / diagonals)
