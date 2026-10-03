import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * lib/pipeline/* is called from two places with nothing in common: the CLI
 * wrappers under scripts/ (plain tsx, no Next runtime, no request scope) and,
 * in a later PR, an admin API route. So these modules must stay free of
 * anything that only works in one of them: `next/*` imports, the `server-only`
 * marker, the cookie-bound or admin Supabase factories (the client is passed
 * in instead), `.env.local` reads, `import.meta.url` path resolution, and
 * `process.exit` (a route must throw, never take the server down).
 *
 * The scan follows relative imports out of lib/pipeline into the rest of lib/
 * so a helper that lib/pipeline depends on cannot smuggle one in either.
 */
const PIPELINE_DIR = path.resolve(__dirname);
const LIB_DIR = path.resolve(__dirname, '..');

const FORBIDDEN: { pattern: RegExp; why: string }[] = [
  { pattern: /from\s+['"]next(\/|['"])/, why: 'imports from next/*' },
  { pattern: /from\s+['"]server-only['"]|import\s+['"]server-only['"]/, why: 'carries the server-only marker' },
  { pattern: /supabase-admin['"]/, why: 'imports lib/supabase-admin.ts (server-only)' },
  { pattern: /supabase-server['"]/, why: 'imports lib/supabase-server.ts (reads cookies())' },
  { pattern: /next\/headers|next\/server|next\/cache|next\/navigation/, why: 'references a next/* module' },
  { pattern: /\.env\.local/, why: 'reads .env.local' },
  { pattern: /import\.meta\.url/, why: 'resolves paths from import.meta.url' },
  { pattern: /process\.exit\s*\(/, why: 'calls process.exit' },
];

const RELATIVE_IMPORT_RE = /from\s+['"](\.{1,2}\/[^'"]+)['"]/g;

function resolveRelative(fromFile: string, specifier: string): string | null {
  const base = path.resolve(path.dirname(fromFile), specifier);
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

function collectModules(): string[] {
  const seen = new Set<string>();
  const queue = fs
    .readdirSync(PIPELINE_DIR)
    .filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'))
    .map((name) => path.join(PIPELINE_DIR, name));

  while (queue.length > 0) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(RELATIVE_IMPORT_RE)) {
      const resolved = resolveRelative(file, match[1]);
      // Stay inside lib/ — that is the surface this test guards.
      if (resolved && resolved.startsWith(LIB_DIR) && !resolved.endsWith('.test.ts')) queue.push(resolved);
    }
  }
  return [...seen].sort();
}

describe('lib/pipeline stays runtime-neutral', () => {
  const modules = collectModules();

  it('scans the four step modules and their lib/ dependencies', () => {
    const names = modules.map((m) => path.relative(LIB_DIR, m));
    expect(names).toEqual(expect.arrayContaining(['pipeline/seed.ts', 'pipeline/prepass.ts', 'pipeline/classify.ts', 'pipeline/refresh.ts']));
    expect(names).toEqual(expect.arrayContaining(['reports/canonical-brands.ts', 'reports/percentile.ts']));
  });

  for (const file of modules) {
    it(`${path.relative(LIB_DIR, file)} has no Next, server-only, env-file, or process.exit dependency`, () => {
      const source = fs.readFileSync(file, 'utf8');
      // Strip comments so documentation that NAMES a forbidden thing (as these
      // modules deliberately do, to explain why it is avoided) does not trip the scan.
      const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      const hits = FORBIDDEN.filter(({ pattern }) => pattern.test(code)).map(({ why }) => why);
      expect(hits).toEqual([]);
    });
  }
});
