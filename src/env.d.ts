/// <reference types="astro/client" />

import type { AdminSession } from './lib/auth';

declare global {
  namespace App {
    interface Locals {
      /** Signed-in admin, populated by src/middleware.ts for /admin routes. */
      admin: AdminSession | null;
    }
  }
}

export {};
