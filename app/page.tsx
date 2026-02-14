import Link from 'next/link';
import { ArrowRight, Users, BarChart2, Shield, Zap } from 'lucide-react';
import { CreatorCard } from '@/components/CreatorCard';
import { supabase } from '@/lib/supabase';
import type { Creator } from '@/lib/types';

async function getFeaturedCreators(): Promise<Creator[]> {
  const { data } = await supabase
    .from('creators')
    .select('*')
    .eq('is_featured', true)
    .order('display_order', { ascending: true })
    .limit(8);
  return (data ?? []) as Creator[];
}

async function getStats() {
  const { data } = await supabase
    .from('creators')
    .select('engagement_rate, category_name');

  if (!data) return { totalCreators: 0, avgEngagementRate: 0, categoryCount: 0 };

  const totalCreators = data.length;
  const rates = data.map((c) => c.engagement_rate).filter((r): r is number => r != null);
  const avgEngagementRate = rates.length > 0
    ? Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 10) / 10
    : 0;
  const categoryCount = new Set(data.map((c) => c.category_name).filter(Boolean)).size;

  return { totalCreators, avgEngagementRate, categoryCount };
}

export default async function HomePage() {
  const [featuredCreators, stats] = await Promise.all([getFeaturedCreators(), getStats()]);

  return (
    <div style={{ backgroundColor: '#FAFAFA' }}>

      {/* Hero */}
      <section style={{ maxWidth: '1280px', margin: '0 auto', padding: '80px 24px 72px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: '#EDE9FE', borderRadius: '999px', padding: '6px 14px', marginBottom: '24px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#7C3AED' }} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#7C3AED' }}>{stats.totalCreators} creators and growing</span>
        </div>
        <h1 style={{ fontSize: '56px', fontWeight: 800, color: '#111827', margin: '0 0 20px 0', lineHeight: '1.1', letterSpacing: '-0.03em', maxWidth: '760px', marginLeft: 'auto', marginRight: 'auto' }}>
          Find the right creators for your brand
        </h1>
        <p style={{ fontSize: '19px', color: '#6B7280', margin: '0 auto 36px', maxWidth: '560px', lineHeight: '1.6' }}>
          Discover and evaluate Instagram creators with real engagement data. Built for marketing teams who care about results.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/creators" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '14px 28px', borderRadius: '10px', backgroundColor: '#7C3AED', color: 'white', fontSize: '15px', fontWeight: 600, textDecoration: 'none', boxShadow: '0 4px 14px rgba(124,58,237,0.35)' }}>
            Explore Creators
            <ArrowRight size={16} />
          </Link>
          <Link href="/about" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '14px 28px', borderRadius: '10px', border: '1px solid #E5E7EB', backgroundColor: 'white', color: '#374151', fontSize: '15px', fontWeight: 600, textDecoration: 'none' }}>
            Learn More
          </Link>
        </div>
      </section>

      {/* Live stats */}
      <section style={{ backgroundColor: 'white', borderTop: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px', display: 'flex', justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            { label: 'Active Creators', value: stats.totalCreators.toLocaleString() },
            { label: 'Avg. Engagement Rate', value: `${stats.avgEngagementRate}%` },
            { label: 'Categories', value: stats.categoryCount.toString() },
          ].map((stat, i) => (
            <div key={i} style={{ padding: '32px 48px', textAlign: 'center', borderRight: i < 2 ? '1px solid #F3F4F6' : 'none' }}>
              <p style={{ fontSize: '36px', fontWeight: 800, color: '#111827', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>{stat.value}</p>
              <p style={{ fontSize: '14px', color: '#6B7280', margin: 0, fontWeight: 500 }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Value props */}
      <section style={{ maxWidth: '1280px', margin: '0 auto', padding: '80px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={{ fontSize: '36px', fontWeight: 800, color: '#111827', margin: '0 0 12px 0', letterSpacing: '-0.02em' }}>Why InfluenceAI</h2>
          <p style={{ fontSize: '17px', color: '#6B7280', margin: 0, maxWidth: '480px', marginLeft: 'auto', marginRight: 'auto' }}>Everything you need to make confident creator partnership decisions.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
          {[
            { icon: BarChart2, title: 'Data-driven decisions', desc: 'Real engagement rates, follower ratios, and growth metrics — not vanity numbers.' },
            { icon: Shield, title: 'Verified mid-tier creators', desc: 'Focused on the 50K–500K sweet spot where engagement and reach intersect.' },
            { icon: Zap, title: 'Instant discovery', desc: 'Filter by category, engagement rate, follower count, and more in seconds.' },
            { icon: Users, title: 'Side-by-side comparison', desc: 'Compare up to 4 creators at once to find the best fit for your campaign.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card" style={{ padding: '28px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <Icon size={20} color="#7C3AED" strokeWidth={2} />
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111827', margin: '0 0 8px 0' }}>{title}</h3>
              <p style={{ fontSize: '14px', color: '#6B7280', margin: 0, lineHeight: '1.6' }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured creators */}
      {featuredCreators.length > 0 && (
        <section style={{ backgroundColor: 'white', borderTop: '1px solid #E5E7EB', padding: '80px 0' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '36px', fontWeight: 800, color: '#111827', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>Featured Creators</h2>
                <p style={{ fontSize: '16px', color: '#6B7280', margin: 0 }}>Hand-picked creators across top categories.</p>
              </div>
              <Link href="/creators" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 600, color: '#7C3AED', textDecoration: 'none' }}>
                View all {stats.totalCreators} creators <ArrowRight size={14} />
              </Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
              {featuredCreators.slice(0, 6).map((creator) => (
                <CreatorCard key={creator.creator_id} creator={creator} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section style={{ maxWidth: '1280px', margin: '0 auto', padding: '80px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={{ fontSize: '36px', fontWeight: 800, color: '#111827', margin: '0 0 12px 0', letterSpacing: '-0.02em' }}>How it works</h2>
          <p style={{ fontSize: '17px', color: '#6B7280', margin: 0 }}>Three steps to finding your perfect creator match.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px' }}>
          {[
            { step: '01', title: 'Browse', desc: 'Search and filter our network of verified creators by category, engagement rate, and follower count.' },
            { step: '02', title: 'Match', desc: 'Compare creators side by side with real metrics to find the perfect fit for your brand and campaign.' },
            { step: '03', title: 'Connect', desc: 'Reach out directly to your chosen creators with all the context you need to close the deal.' },
          ].map(({ step, title, desc }) => (
            <div key={step} style={{ textAlign: 'center', padding: '32px' }}>
              <div style={{ fontSize: '48px', fontWeight: 800, color: '#EDE9FE', marginBottom: '16px', letterSpacing: '-0.02em', lineHeight: 1 }}>{step}</div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: '0 0 10px 0' }}>{title}</h3>
              <p style={{ fontSize: '15px', color: '#6B7280', margin: 0, lineHeight: '1.6' }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section style={{ backgroundColor: '#7C3AED', padding: '80px 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '36px', fontWeight: 800, color: 'white', margin: '0 0 16px 0', letterSpacing: '-0.02em' }}>
          Ready to find your creators?
        </h2>
        <p style={{ fontSize: '17px', color: 'rgba(255,255,255,0.8)', margin: '0 auto 32px', maxWidth: '480px', lineHeight: '1.6' }}>
          Start exploring our network of {stats.totalCreators} verified creators today.
        </p>
        <Link href="/creators" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '14px 28px', borderRadius: '10px', backgroundColor: 'white', color: '#7C3AED', fontSize: '15px', fontWeight: 700, textDecoration: 'none' }}>
          Start Exploring
          <ArrowRight size={16} />
        </Link>
      </section>
    </div>
  );
}