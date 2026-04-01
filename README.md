# Personal site

Next.js (App Router) + TypeScript, built and deployed for Vercel. Uses Bun as the package manager for local development and production builds.

- Quick guide: see [docs/guide.md](docs/guide.md) for routing, content editing, and deployment notes.

## Quick start

```bash
bun install
bun dev
```

Then open <http://localhost:3000>. Pages live under `app/` and hot-reload as you edit.

## Scripts

- `bun dev` — start the dev server
- `bun build` — build for production
- `bun preview` — preview the production build locally
- `bun format` / `bun format:check` — Prettier

## Content and routes

- Blog posts live in `app/blog/posts.ts` (static array). Each post has `slug`, `title`, ISO `date`, `summary`, optional `tags`, and `content` paragraphs.
- Projects are defined inline in `app/projects/page.tsx`; `repo` accepts `owner/name` or a full URL.
- Contact page uses `your.email@example.com` as a placeholder—swap when ready.
- Short links are defined in `app/redirect/redirects.ts` under `REDIRECTS`. Absolute URLs are preferred; relative paths work too. Incoming query params are preserved by `resolveRedirectDestination`.
- Custom icon is generated via `app/icon.tsx` using `ImageResponse`.

## Deployment

The project is optimized for Vercel with dynamic SSR. Connect the repo to Vercel and deploy; no extra configuration is required.
