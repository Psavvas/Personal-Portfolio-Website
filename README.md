# Personal site

Astro 7 + TypeScript + Tailwind, deployed to Vercel with server-side rendering. Site content (projects, blog posts, short links, and the About page's "Now" section) lives in a **Neon Postgres** database and is managed through an **admin portal** at `/admin`, secured with [Better Auth](https://better-auth.com). Uses Bun as the package manager.

## Quick start

```bash
bun install
cp .env.example .env   # fill in DATABASE_URL and BETTER_AUTH_SECRET
bun dev
```

Then open <http://localhost:4321>. The admin portal is at <http://localhost:4321/admin>.

## Database

Content and admin accounts both live in a [Neon](https://console.neon.tech) Postgres database. Put its **connection string** in `DATABASE_URL` (locally in `.env`, and on Vercel under _Settings → Environment Variables_), and set `BETTER_AUTH_SECRET` to a long random value (`openssl rand -base64 32`) in the same places.

The database holds these tables: `projects`, `blog_posts`, `redirects`, and `site_content` for site content, plus `user`, `session`, `account`, and `verification` for Better Auth.

## Environment variables

| Variable             | Required | Purpose                                                              |
| -------------------- | -------- | -------------------------------------------------------------------- |
| `DATABASE_URL`       | yes      | Neon Postgres connection string                                      |
| `BETTER_AUTH_SECRET` | yes      | Signs admin sessions; changing it logs every device out              |
| `BETTER_AUTH_URL`    | no       | Pins the auth origin; inferred per request when unset                |
| `UPLOADTHING_TOKEN`  | no       | Enables image uploads from the admin editor (UploadThing → API Keys) |

## Admin portal

Sign in at `/admin` with your email and password. From there you can:

- **Projects** — create, edit, publish/unpublish, and delete projects. Page content is written in Markdown; links placed above a `---` divider become the button row at the top of the project page.
- **Blog** — write posts in Markdown with live preview, tags, publish dates, and an optional featured project.
- **Redirects** — manage `paulsavvas.com/redirect/<slug>` short links.
- **Now section** — edit the Markdown blurb shown on the About page.
- **Account** — change your password (which signs other devices out).

Markdown extras: `![alt](url)` images are laid out automatically (pairs become a two-column grid), and YouTube/Vimeo links become embedded players.

With `UPLOADTHING_TOKEN` set, the Markdown editor gets an **Insert image** button, and you can also paste or drag & drop images directly into the editor — they upload to UploadThing and the Markdown is inserted at the cursor.

Projects have a **Created entirely with AI** checkbox for fully AI-generated ("vibe-coded") work — it adds a small click-to-expand disclosure on the project page.

### Authentication

Better Auth stores the owner account, its password hash, and active sessions in the same Neon database (`user`, `session`, `account`, and `verification` tables). The portal is deliberately single-account and closed: the public sign-up endpoint is blocked in middleware, and a database hook rejects any attempt to create a second user.

Everything saves straight to Postgres and appears on the live site immediately — no rebuild needed. New items start as **drafts**; flip visibility to **published** when ready.

## Scripts

- `bun dev` — start the dev server
- `bun run build` — build for production
- `bun preview` — preview the production build locally
- `bun format` / `bun format:check` — Prettier

## Deployment

Optimized for Vercel with the `@astrojs/vercel` adapter. Connect the repo to Vercel, add the environment variables above, and deploy.
