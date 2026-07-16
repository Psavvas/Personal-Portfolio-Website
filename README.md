# Personal site

Astro 7 + TypeScript + Tailwind, deployed to Vercel with server-side rendering. Site content (projects, blog posts, short links, and the About page's "Now" section) lives in a **Neon Postgres** database and is managed through a password-protected **admin portal** at `/admin`. Uses Bun as the package manager.

## Quick start

```bash
bun install
cp .env.example .env   # fill in DATABASE_URL and ADMIN_PASSWORD
bun dev
```

Then open <http://localhost:4321>. The admin portal is at <http://localhost:4321/admin>.

## One-time database setup

1. Create a free project at [Neon](https://console.neon.tech).
2. Open the project's **SQL Editor**, paste the contents of [`db/schema.sql`](db/schema.sql), and run it. The script is idempotent — re-running it never deletes content.
3. Copy the project's **connection string** into the `DATABASE_URL` environment variable (locally in `.env`, and on Vercel under _Settings → Environment Variables_).
4. Set `ADMIN_PASSWORD` in the same places — this is the password for `/admin`.

## Environment variables

| Variable         | Required | Purpose                                                          |
| ---------------- | -------- | ---------------------------------------------------------------- |
| `DATABASE_URL`   | yes      | Neon Postgres connection string                                  |
| `ADMIN_PASSWORD` | yes      | Password for the `/admin` portal                                 |
| `SESSION_SECRET` | no       | Signs admin session cookies (derived from the password if unset) |

## Admin portal

Log in at `/admin` with `ADMIN_PASSWORD`. From there you can:

- **Projects** — create, edit, publish/unpublish, and delete projects. Page content is written in Markdown; links placed above a `---` divider become the button row at the top of the project page.
- **Blog** — write posts in Markdown with live preview, tags, publish dates, and an optional featured project.
- **Redirects** — manage `paulsavvas.com/redirect/<slug>` short links.
- **Now section** — edit the Markdown blurb shown on the About page.

Markdown extras: `![alt](url)` images are laid out automatically (pairs become a two-column grid), and YouTube/Vimeo links become embedded players.

Everything saves straight to Postgres and appears on the live site immediately — no rebuild needed. New items start as **drafts**; flip visibility to **published** when ready.

## Scripts

- `bun dev` — start the dev server
- `bun run build` — build for production
- `bun preview` — preview the production build locally
- `bun format` / `bun format:check` — Prettier

## Deployment

Optimized for Vercel with the `@astrojs/vercel` adapter. Connect the repo to Vercel, add the environment variables above, and deploy.
