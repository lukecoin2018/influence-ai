# Brand normalization pipeline

Normalizes the free-text strings in `creator_posts.detected_brands` into
canonical entities (brand / creator / celebrity / media / fragment /
unknown). Entirely separate from the `brand_profiles` table and the admin
Brands section (`app/admin/brands`), which manage brand *customer accounts*
— this system is never read or written by that code, and vice versa.

## One-time setup

This repo has no migration runner (no Supabase CLI project, no direct
Postgres connection configured). Apply the schema manually:

1. Open the Supabase dashboard SQL editor for this project.
2. Run `supabase/migrations/0001_brand_aliases.sql`.

That creates the `brand_aliases` table and the `v_brand_partnerships` view.
`brand_aliases` is internal sales intelligence — RLS is enabled and scoped
to `user_roles.role = 'admin'` (see the migration for the policy), it is
**not** readable with the anon key. The pipeline scripts below use the
service-role key to bypass RLS; the admin Brand Index page works because a
logged-in admin's session JWT satisfies the policy even though the page
uses the anon-key browser client.

## Running the pipeline

In order, each idempotent (safe to rerun; later runs only touch
newly-discovered or newly-unclassified rows):

```bash
npm run brand-aliases:seed      # scan creator_posts, upsert every distinct alias + creators_count
npm run brand-aliases:prepass   # handle matches -> creator, stoplist matches -> fragment (no AI)
npm run brand-aliases:classify  # AI batch classification for the rest (creators_count >= 2 only)
```

Re-run `seed` periodically as new posts/creators are scraped — it only ever
updates `creators_count`, never touching already-classified rows. Re-run
`classify` any time; it only selects `classified_at IS NULL` rows.

Aliases with a single detected creator are never sent to the AI (low signal,
not worth the cost) — they stay unclassified and show up in the
"Unclassified" tab of the admin Brand Index (`/admin/brand-index`), which
also has "Unverified brands" (the human triage worklist — `verified` is
never set by this pipeline, only by an admin in that UI) and "Review —
unknown" (the small number of aliases the AI genuinely couldn't place).
