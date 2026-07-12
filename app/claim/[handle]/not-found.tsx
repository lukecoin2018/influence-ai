import Link from 'next/link';
import { UserX } from 'lucide-react';

export default function ClaimNotFound() {
  return (
    // <main>, full viewport height: this route opts out of the shared SiteShell
    // chrome (components/SiteShell.tsx) entirely, so there's no surrounding
    // nav/footer — and no <main> landmark from SiteShell either, hence one here.
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, backgroundColor: '#FAFAFA', padding: '40px 20px' }}>
      <div style={{ textAlign: 'center' }}>
        <UserX size={48} color="#D1D5DB" style={{ margin: '0 auto 16px' }} />
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-lmg-grey)', margin: '0 0 8px 0' }}>
          We don&apos;t have this creator yet
        </h1>
        <p style={{ fontSize: '15px', color: '#6B7280', margin: '0 0 24px 0' }}>
          We couldn&apos;t find a creator with that handle in our database.
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-flex', padding: '10px 20px', borderRadius: '8px',
            backgroundColor: 'var(--color-lmg-yellow)', color: 'var(--color-lmg-grey)',
            fontSize: '14px', fontWeight: 600, textDecoration: 'none',
          }}
        >
          Back to InfluenceIT
        </Link>
      </div>
      <div style={{ textAlign: 'center', fontSize: 12, color: '#9C9A91' }}>
        <Link href="/privacy" style={{ color: 'inherit', textDecoration: 'underline' }}>
          Privacy
        </Link>
        {' · '}
        <Link href="/terms" style={{ color: 'inherit', textDecoration: 'underline' }}>
          Terms
        </Link>
      </div>
    </main>
  );
}
