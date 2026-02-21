import Link from 'next/link';
import { UserX } from 'lucide-react';

export default function CreatorNotFound() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <UserX size={48} color="#D1D5DB" style={{ margin: '0 auto 16px' }} />
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#3A3A3A', margin: '0 0 8px 0' }}>
          Creator not found
        </h1>
        <p style={{ fontSize: '15px', color: '#6B7280', margin: '0 0 24px 0' }}>
          We couldn't find a creator with that handle.
        </p>
        <Link
          href="/creators"
          style={{
            display: 'inline-flex', padding: '10px 20px', borderRadius: '8px',
            backgroundColor: '#FFD700', color: '#3A3A3A',
            fontSize: '14px', fontWeight: 600, textDecoration: 'none',
          }}
        >
          Back to Creators
        </Link>
      </div>
    </div>
  );
}