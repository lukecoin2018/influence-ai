import Link from 'next/link';
import { Coins, FileText, PenTool, MessageSquare } from 'lucide-react';

const PACKS = [
  {
    tokens: 100,
    label: 'Starter',
    description: 'Try out creator tools and get a feel for the platform.',
    popular: false,
    perks: ['Contract reviews', 'Negotiation responses', 'Profile analytics'],
  },
  {
    tokens: 250,
    label: 'Active',
    description: 'For creators managing multiple brand deals.',
    popular: true,
    perks: ['All Starter features', 'More negotiation rounds', 'Priority support'],
  },
  {
    tokens: 500,
    label: 'Pro',
    description: 'Full access for professional creators at scale.',
    popular: false,
    perks: ['All Active features', 'Unlimited tool usage', 'Advanced analytics'],
  },
];

const FEATURE_COSTS = [
  { icon: <FileText size={15} />, label: 'Contract review', cost: 'TBD' },
  { icon: <MessageSquare size={15} />, label: 'Negotiation Assistant', cost: 'TBD' },
  { icon: <PenTool size={15} />, label: 'Profile tools', cost: 'TBD' },
];

export default function CreatorPricingPage() {
  return (
    <div style={{ backgroundColor: '#FAFAFA', minHeight: '100vh', paddingBottom: '80px' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', padding: '64px 24px 48px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '999px', backgroundColor: '#EBF7FF', marginBottom: '16px' }}>
          <Coins size={14} color="#3AAFF4" />
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#3AAFF4' }}>Creator Token Packs</span>
        </div>
        <h1 style={{ fontSize: '40px', fontWeight: 800, color: '#3A3A3A', margin: '0 0 12px', letterSpacing: '-0.02em' }}>
          Built for Creators
        </h1>
        <p style={{ fontSize: '16px', color: '#6B7280', margin: '0 auto', maxWidth: '500px', lineHeight: 1.6 }}>
          Creator pricing is lower than brand pricing — because we know creator margins are tight.
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '12px' }}>
          New accounts receive <strong style={{ color: '#3A3A3A' }}>100 free tokens</strong> on signup.
        </p>
      </div>

      {/* Packs */}
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '0 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
        {PACKS.map((pack) => (
          <div key={pack.tokens} style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            border: pack.popular ? '2px solid #3AAFF4' : '1px solid #E5E7EB',
            padding: '28px',
            position: 'relative',
            boxShadow: pack.popular ? '0 4px 24px rgba(58,175,244,0.12)' : '0 1px 4px rgba(0,0,0,0.05)',
          }}>
            {pack.popular && (
              <div style={{
                position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)',
                backgroundColor: '#3AAFF4', borderRadius: '999px',
                padding: '4px 14px', fontSize: '12px', fontWeight: 700, color: 'white',
                whiteSpace: 'nowrap',
              }}>
                Most Popular
              </div>
            )}

            {/* Coming Soon badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              padding: '3px 10px', borderRadius: '999px',
              backgroundColor: '#F3F4F6', marginBottom: '16px',
            }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#9CA3AF' }} />
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280' }}>Coming Soon</span>
            </div>

            {/* Token amount */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '4px' }}>
              <span style={{ fontSize: '48px', fontWeight: 800, color: '#3A3A3A', lineHeight: 1 }}>{pack.tokens}</span>
              <span style={{ fontSize: '16px', fontWeight: 600, color: '#6B7280' }}>tokens</span>
            </div>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#3AAFF4', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{pack.label}</p>
            <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 20px', lineHeight: 1.5 }}>{pack.description}</p>

            {/* Perks */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
              {pack.perks.map((perk) => (
                <div key={perk} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#EBF7FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#3AAFF4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                  <span style={{ fontSize: '13px', color: '#374151' }}>{perk}</span>
                </div>
              ))}
            </div>

            <button disabled style={{
              width: '100%', padding: '11px',
              borderRadius: '10px', border: 'none',
              backgroundColor: '#F3F4F6', color: '#9CA3AF',
              fontSize: '14px', fontWeight: 600, cursor: 'not-allowed',
            }}>
              Pricing Coming Soon
            </button>
          </div>
        ))}
      </div>

      {/* Token cost table */}
      <div style={{ maxWidth: '640px', margin: '56px auto 0', padding: '0 24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#3A3A3A', margin: '0 0 6px', textAlign: 'center' }}>Token costs for creators</h2>
        <p style={{ fontSize: '13px', color: '#9CA3AF', textAlign: 'center', margin: '0 0 16px' }}>Exact costs will be confirmed when creator tools launch.</p>
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          {FEATURE_COSTS.map((item, i) => (
            <div key={item.label} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 20px',
              borderBottom: i < FEATURE_COSTS.length - 1 ? '1px solid #F3F4F6' : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#374151' }}>
                <span style={{ color: '#9CA3AF' }}>{item.icon}</span>
                <span style={{ fontSize: '14px' }}>{item.label}</span>
              </div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#9CA3AF' }}>{item.cost}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Link to brand pricing */}
      <p style={{ textAlign: 'center', marginTop: '40px', fontSize: '14px', color: '#9CA3AF' }}>
        Are you a brand?{' '}
        <Link href="/pricing/brands" style={{ color: '#FFD700', fontWeight: 600, textDecoration: 'none' }}>
          View brand pricing →
        </Link>
      </p>
    </div>
  );
}
