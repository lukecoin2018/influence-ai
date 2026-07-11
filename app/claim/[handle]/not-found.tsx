import Link from 'next/link';
import { UserX } from 'lucide-react';

export default function ClaimNotFound() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAFA' }}>
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <UserX size={48} color="#D1D5DB" style={{ margin: '0 auto 16px' }} />
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#3A3A3A', margin: '0 0 8px 0' }}>
          We don&apos;t have this creator yet
        </h1>
        <p style={{ fontSize: '15px', color: '#6B7280', margin: '0 0 24px 0' }}>
          We couldn&apos;t find a creator with that handle in our database.
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-flex', padding: '10px 20px', borderRadius: '8px',
            backgroundColor: '#FFD700', color: '#3A3A3A',
            fontSize: '14px', fontWeight: 600, textDecoration: 'none',
          }}
        >
          Back to InfluenceIT
        </Link>
      </div>
    </div>
  );
}
