/// <reference path="../.astro/types.d.ts" />

import type { Client } from './lib/demo-data';

declare namespace App {
  interface Locals {
    client: Client;
    user?: { id: string; email: string; role: 'admin' | 'viewer' | 'superuser' };
  }
}
