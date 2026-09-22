import Link from 'next/link';

/**
 * The homepage is written for brands end to end — every section sells the
 * database to someone buying, and the only creator-facing path into the
 * product was a cold DM link. This strip is the one place a creator who
 * arrives on their own can act.
 *
 * TWO buttons rather than one, because which path a creator needs depends on
 * something they have no way to know: whether we have already scraped them.
 * "Claim your profile" is for the ~6,000 who are in the database;
 * "Get listed" is for everyone else. Offering only one would send half of
 * them to a dead end.
 *
 * Sits between <Cta /> and <Footer />, and reuses the dark section's existing
 * class vocabulary (.wrap, .btn, .btn-yellow, .btn-ghost-d) so it needs no new
 * button styling — just the four rules under "creator strip" in home.css,
 * shaped after the footer's own.
 *
 * English, like the rest of app/page.tsx: the homepage is not in the i18n tree
 * (CLAUDE.md, "Localization"). Both destinations resolve their own locale.
 */
export function CreatorStrip() {
  return (
    <section className="creator-strip">
      <div className="wrap">
        <div className="strip-in">
          <h2>Are you a creator?</h2>
          <div className="strip-ctas">
            <Link className="btn btn-yellow" href="/auth/signup?role=creator">Claim your profile</Link>
            <Link className="btn btn-ghost-d" href="/get-listed?from=home_strip">Get listed</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
