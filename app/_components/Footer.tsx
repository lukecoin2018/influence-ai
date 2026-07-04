import Link from 'next/link';

export function Footer() {
  return (
    <footer>
      <div className="wrap foot-in">
        <Link className="foot-brand" href="/">Influence<em>IT</em></Link>
        <div className="foot-links">
          <Link href="/creators">Browse creators</Link>
          <Link href="/compare">Compare</Link>
          <Link href="/blog">Blog</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </div>
        <span>
          © {new Date().getFullYear()} InfluenceIT · an{' '}
          <a href="https://lmg.media" target="_blank" rel="noopener noreferrer">LMG Media</a> platform
        </span>
      </div>
    </footer>
  );
}
