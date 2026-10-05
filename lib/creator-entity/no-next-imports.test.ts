import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * lib/creator-entity/* runs from the CLI under scripts/ (plain tsx, no Next
 * runtime), and types.ts is also imported by a 'use client' page. Same guard
 * as lib/pipeline/no-next-imports.test.ts: no `next/*`, no `server-only`, no
 * cookie-bound or admin Supabase factory (the client is passed in), no
 * `.env.local` reads, no `import.meta.url`, no `process.exit`.
 */
const DIR = path.resolve(__dirname);
const LIB_DIR = path.resolve(__dirname, '..');

const FORBIDDEN: { pattern: RegExp; why: string }[] = [
  { pattern: /from\s+['"]next(\/|['"])/, why: 'imports from next/*' },
  { pattern: /from\s+['"]server-only['"]|import\s+['"]server-only['"]/, why: 'carries the server-only marker' },
  { pattern: /supabase-admin['"]/, why: 'imports lib/supabase-admin.ts (server-only)' },
  { pattern: /supabase-server['"]/, why: 'imports lib/supabase-server.ts (reads cookies())' },
  { pattern: /\.env\.local/, why: 'reads .env.local' },
  { pattern: /import\.meta\.url/, why: 'resolves paths from import.meta.url' },
  { pattern: /process\.exit\s*\(/, why: 'calls process.exit' },
];

const modules = fs
  .readdirSync(DIR)
  .filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'))
  .map((name) => path.join(DIR, name));

describe('lib/creator-entity stays runtime-neutral', () => {
  it('scans the four modules', () => {
    expect(modules.map((m) => path.relative(LIB_DIR, m)).sort()).toEqual([
      'creator-entity/classify.ts',
      'creator-entity/heuristics.ts',
      'creator-entity/load.ts',
      'creator-entity/types.ts',
    ]);
  });

  for (const file of modules) {
    it(`${path.relative(LIB_DIR, file)} has no Next, server-only, env-file, or process.exit dependency`, () => {
      const code = fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      expect(FORBIDDEN.filter(({ pattern }) => pattern.test(code)).map(({ why }) => why)).toEqual([]);
    });
  }

  it('keeps types.ts free of node and SDK imports, because a client page imports it', () => {
    const code = fs.readFileSync(path.join(DIR, 'types.ts'), 'utf8');
    expect(code).not.toMatch(/from\s+['"](node:|@anthropic-ai|@supabase)/);
  });
});
