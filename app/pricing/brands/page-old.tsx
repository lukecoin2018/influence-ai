import Link from 'next/link';
import { Coins, Sparkles, FileText, Calculator, MessageSquare, Users } from 'lucide-react';

const PACKS = [
  {
    tokens: 100,
    label: 'Starter',
    description: 'Perfect for getting started and exploring the platform.',
    popular: false,
    perks: ['20× Directory pages', '33× Creator profile views', '5× AI Matches', '4× Campaign Briefs'],
  },
  {
    tokens: 250,
    label: 'Growth',
    description: 'For brands running regular influencer campaigns.',
    popular: true,
    perks: ['50× Directory pages', '83× Creator profile views', '12× AI Matches', '10× Campaign Briefs'],
  },
  {
    tokens: 500,
    label: 'Pro',
    description: 'Full access for high-volume campaign management.',
    popular: false,
    perks: ['100× Directory pages', '166× Creator profile views', '25× AI Matches', '20× Campaign Briefs'],
  },
];

const FEATURE_COSTS = [
  { icon: <Users size={15} />, label: 'Directory page', cost: '5 tokens', free: '10 free pages' },
  { icon: <Users size={15} />, label: 'Creator profile view', cost: '3 tokens', free: '5 free views' },
  { icon: <Sparkles size={15} />, label: 'AI Match search', cost: '20 tokens', free: null },
  { icon: <FileText size={15} />, label: 'Campaign Brief', cost: '25 tokens', free: null },
  { icon: <MessageSquare size={15} />, label: 'Negotiation Assistant', cost: '20 tokens', free: null },
  { icon: <Calculator size={15} />, label: 'Budget Calculator', cost: '10 tokens', free: null },
  { icon: <MessageSquare size={15} />, label: 'Send Inquiry', cost: '5 tokens', free: null },
];

export default function BrandPricingPage() {
  return (
    <div style={{ backgroundColor: '#FAFAFA', minHeight: '100vh', paddingBottom: '80px' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', padding: '64px 24px 48px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '999px', backgroundColor: '#FFF9E0', marginBottom: '16px' }}>
          <Coins size={14} color="#FFD700" />
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#D97706' }}>Brand Token Packs</span>
        </div>
        <h1 style={{ fontSize: '40px', fontWeight: 800, color: '#3A3A3A', margin: '0 0 12px', letterSpacing: '-0.02em' }}>
          Simple, Transparent Pricing
        </h1>
        <p style={{ fontSize: '16px', color: '#6B7280', margin: '0 auto', maxWidth: '500px', lineHeight: 1.6 }}>
          Buy tokens once, use them across all brand tools. No subscriptions, no hidden fees.
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
            border: pack.popular ? '2px solid #FFD700' : '1px solid #E5E7EB',
            padding: '28px',
            position: 'relative',
            boxShadow: pack.popular ? '0 4px 24px rgba(255,215,0,0.15)' : '0 1px 4px rgba(0,0,0,0.05)',
          }}>
            {/* Popular badge */}
            {pack.popular && (
              <div style={{
                position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)',
                backgroundColor: '#FFD700', borderRadius: '999px',
                padding: '4px 14px', fontSize: '12px', fontWeight: 700, color: '#3A3A3A',
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
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#FFD700', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{pack.label}</p>
            <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 20px', lineHeight: 1.5 }}>{pack.description}</p>

            {/* Perks */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
              {pack.perks.map((perk) => (
                <div key={perk} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#FFF9E0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                  <span style={{ fontSize: '13px', color: '#374151' }}>{perk}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
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
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#3A3A3A', margin: '0 0 16px', textAlign: 'center' }}>What does each action cost?</h2>
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
                {item.free && (
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#059669', backgroundColor: '#ECFDF5', padding: '2px 7px', borderRadius: '999px' }}>
                    {item.free}
                  </span>
                )}
              </div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#3A3A3A' }}>{item.cost}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Link to creator pricing */}
      <p style={{ textAlign: 'center', marginTop: '40px', fontSize: '14px', color: '#9CA3AF' }}>
        Are you a creator?{' '}
        <Link href="/pricing/creators" style={{ color: '#3AAFF4', fontWeight: 600, textDecoration: 'none' }}>
          View creator pricing →
        </Link>
      </p>
    </div>
  );
}
