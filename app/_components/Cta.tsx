import Link from 'next/link';

export function Cta({ totalCreators }: { totalCreators: number }) {
  return (
    <section className="cta">
      <div className="wrap">
        <h2>Your next shortlist is <span className="yl">already ranked.</span></h2>
        <p>Search {totalCreators.toLocaleString()} creators by engagement, category, and detected partnerships. Free to explore — no demo call required.</p>
        <div className="cta-ctas">
          <Link className="btn btn-yellow" href="/creators">Explore the database</Link>
          <Link className="btn btn-ghost-d" href="/compare">Compare creators</Link>
        </div>
      </div>
    </section>
  );
}
