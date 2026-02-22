import Link from 'next/link';
import { Mail, Users, BarChart2, TrendingUp } from 'lucide-react';

export default function AboutPage() {
  return (
    <div style={{ backgroundColor: '#FAFAFA', minHeight: '100vh' }}>
      <div className="max-w-7xl mx-auto px-6" style={{ paddingTop: '64px', paddingBottom: '96px' }}>

        {/* Header */}
        <div style={{ maxWidth: '640px', marginBottom: '64px' }}>
          <h1 style={{ fontSize: '42px', fontWeight: 800, color: '#3A3A3A', margin: '0 0 16px 0', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            About InfluenceIT
          </h1>
          <p style={{ fontSize: '18px', color: '#6B7280', margin: 0, lineHeight: '1.7' }}>
            We help marketing teams discover and evaluate Instagram creators using real data — not follower counts alone.
          </p>
        </div>

        {/* Mission */}
        <div className="card" style={{ padding: '40px', marginBottom: '24px', maxWidth: '720px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#3A3A3A', margin: '0 0 12px 0' }}>Our Mission</h2>
          <p style={{ fontSize: '15px', color: '#6B7280', margin: 0, lineHeight: '1.7' }}>
            Influencer marketing is broken. Brands overpay for large accounts with disengaged audiences, while high-performing mid-tier creators go undiscovered. InfluenceIT exists to fix that — by surfacing creators based on what actually matters: authentic engagement, audience quality, and content relevance.
          </p>
        </div>

        {/* Why mid-tier */}
        <div className="card" style={{ padding: '40px', marginBottom: '24px', maxWidth: '720px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#FFF9E0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <TrendingUp size={18} color="#FFD700" />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#3A3A3A', margin: 0 }}>Why mid-tier creators?</h2>
          </div>
          <p style={{ fontSize: '15px', color: '#6B7280', margin: '0 0 16px 0', lineHeight: '1.7' }}>
            Creators in the 50K–500K follower range consistently outperform mega-influencers on engagement. Their audiences are more targeted, their recommendations more trusted, and their rates more accessible.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {[
              { value: '3–8%', label: 'Avg. engagement rate' },
              { value: '60%', label: 'Lower cost per engagement' },
              { value: '2x', label: 'Higher conversion intent' },
            ].map(({ value, label }) => (
              <div key={label} style={{ textAlign: 'center', padding: '20px', backgroundColor: '#F9FAFB', borderRadius: '10px' }}>
                <p style={{ fontSize: '28px', fontWeight: 800, color: '#FFD700', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>{value}</p>
                <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* How we work */}
        <div className="card" style={{ padding: '40px', marginBottom: '24px', maxWidth: '720px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#FFF9E0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <BarChart2 size={18} color="#FFD700" />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#3A3A3A', margin: 0 }}>How we work</h2>
          </div>
          <p style={{ fontSize: '15px', color: '#6B7280', margin: 0, lineHeight: '1.7' }}>
            Our platform continuously discovers and indexes Instagram creators, tracking real engagement metrics over time. Every creator in our network is verified active, with up-to-date follower counts, engagement rates, and category data. No fake profiles, no inflated numbers.
          </p>
        </div>

        {/* Contact */}
        <div className="card" style={{ padding: '40px', maxWidth: '720px', background: 'white', border: '1px solid #E5E7EB' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#EBF7FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Mail size={18} color="#3AAFF4" />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#3A3A3A', margin: 0 }}>Get in touch</h2>
          </div>
          <p style={{ fontSize: '15px', color: '#6B7280', margin: '0 0 20px 0', lineHeight: '1.7' }}>
            Interested in listing your brand, adding creators, or partnering with us? We'd love to hear from you.
          </p>
          
          <Link href="/contact" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '8px', backgroundColor: '#FFD700', color: '#3A3A3A', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}>
  <Mail size={14} />
  Get in touch
</Link>
        </div>

      </div>
    </div>
  );
}