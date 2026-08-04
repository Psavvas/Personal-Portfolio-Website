// Presentation constants for banners, deliberately free of any database or
// Node-only imports so client-side scripts can import them without dragging
// the Postgres driver into the browser bundle.

export type BannerColor =
  | 'neutral'
  | 'blue'
  | 'green'
  | 'amber'
  | 'red'
  | 'violet';

/**
 * Where a banner shows:
 *  - `all`   every public page
 *  - `home`  the home page only
 *  - `paths` an explicit list of pages (project/blog pages included)
 */
export type BannerScope = 'all' | 'home' | 'paths';

export const BANNER_COLORS: Array<{ value: BannerColor; label: string }> = [
  { value: 'neutral', label: 'Neutral (grey)' },
  { value: 'blue', label: 'Blue (info)' },
  { value: 'green', label: 'Green (good news)' },
  { value: 'amber', label: 'Amber (heads-up)' },
  { value: 'red', label: 'Red (urgent)' },
  { value: 'violet', label: 'Violet (highlight)' },
];

export const BANNER_SCOPES: Array<{ value: BannerScope; label: string }> = [
  { value: 'all', label: 'All pages' },
  { value: 'home', label: 'Home page only' },
  { value: 'paths', label: 'Specific pages…' },
];

/**
 * Full class strings per colour. Written out in full (rather than composed)
 * so Tailwind's scanner can see every class it needs to generate.
 */
export const BANNER_COLOR_CLASSES: Record<BannerColor, string> = {
  neutral:
    'bg-neutral-100 text-neutral-900 border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800',
  blue: 'bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-950 dark:text-blue-100 dark:border-blue-900',
  green:
    'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-100 dark:border-emerald-900',
  amber:
    'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950 dark:text-amber-100 dark:border-amber-900',
  red: 'bg-red-50 text-red-900 border-red-200 dark:bg-red-950 dark:text-red-100 dark:border-red-900',
  violet:
    'bg-violet-50 text-violet-900 border-violet-200 dark:bg-violet-950 dark:text-violet-100 dark:border-violet-900',
};

/** `/about/` and `/about` are the same page; `/` stays `/`. */
export function normalizePath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
}
