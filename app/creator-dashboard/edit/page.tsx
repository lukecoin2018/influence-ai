'use client';

// app/creator-dashboard/edit/page.tsx
// Creator edit profile — bio, availability, preferences

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

const INDUSTRIES = ['Fashion', 'Beauty', 'Travel', 'Food & Beverage', 'Tech', 'Fitness', 'Lifestyle', 'Gaming', 'Music', 'Sports'];

export default function EditProfilePage() {
  const { user, userRole, creatorProfile, loading } = useAuth();

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [customBio, setCustomBio] = useState('');
  const [website, setWebsite] = useState('');
  const [availabilityStatus, setAvailabilityStatus] = useState('open');
  const [availabilityNote, setAvailabilityNote] = useState('');
  const [preferredCategories, setPreferredCategories] = useState<string[]>([]);
  const [minBudget, setMinBudget] = useState('');

  // Populate form from creatorProfile once loaded
  useEffect(() => {
    if (!creatorProfile) return;
    setDisplayName(creatorProfile.display_name ?? '');
    setCustomBio(creatorProfile.custom_bio ?? '');
    setWebsite(creatorProfile.website ?? '');    
    setAvailabilityStatus(creatorProfile.availability_status ?? 'open');
    setAvailabilityNote(creatorProfile.availability_note ?? '');
    setPreferredCategories(creatorProfile.preferred_categories ?? []);
    setAvailabilityNote(creatorProfile.availability_note ?? '');
  }, [creatorProfile]);

  // Auth guard — after all hooks
  if (loading) return <div style={{ padding: '80px', textAlign: 'center', color: '#9CA3AF' }}>Loading...</div>;
  if (!user || userRole !== 'creator') { window.location.href = '/login'; return null; }

  console.log('creatorProfile:', creatorProfile);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const updates = {
      display_name: displayName || null,
      custom_bio: customBio || null,
      website: website || null,
      availability_status: availabilityStatus,
      availability_note: availabilityNote || null,
      preferred_categories: preferredCategories.length > 0 ? preferredCategories : null,
      min_budget: minBudget ? parseFloat(minBudget) : null,
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from('creator_profiles')
      .update(updates)
      .eq('id', user!.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  }

  const toggleCategory = (cat: string) => {
    setPreferredCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px',
    border: '1px solid #E5E7EB', borderRadius: '8px',
    fontSize: '14px', color: '#111827', backgroundColor: 'white', outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '13px', fontWeight: 600,
    color: '#374151', marginBottom: '6px',
  };

  const sectionTitle = (title: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '24px 0 16px 0' }}>
      <div style={{ height: '1px', flex: 1, backgroundColor: '#E5E7EB' }} />
      <p style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0, whiteSpace: 'nowrap' }}>{title}</p>
      <div style={{ height: '1px', flex: 1, backgroundColor: '#E5E7EB' }} />
    </div>
  );

  return (
    <div style={{ backgroundColor: '#FAFAFA', minHeight: '100vh' }}>
      <div className="max-w-2xl mx-auto px-6" style={{ paddingTop: '40px', paddingBottom: '80px' }}>

        <Link href="/creator-dashboard" style={{ textDecoration: 'none', fontSize: '14px', fontWeight: 500, marginBottom: '24px', display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#6B7280' }}>
          ← Back to Dashboard
        </Link>

        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: '16px 0 24px 0', letterSpacing: '-0.02em' }}>
          Edit Your Profile
        </h1>

        <form onSubmit={handleSave}>
          <div className="card" style={{ padding: '28px' }}>

            {/* ── Basic Info ─────────────────────────────────────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Display Name</label>
                <input style={inputStyle} value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name or brand name" />
              </div>
              <div>
                <label style={labelStyle}>Bio <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(replaces AI summary on your public profile)</span></label>
                <textarea
                  value={customBio}
                  onChange={(e) => setCustomBio(e.target.value)}
                  rows={4}
                  placeholder="Tell brands about yourself, your audience, and what makes you unique..."
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.6' }}
                />
              </div>
              <div>
                <label style={labelStyle}>Website</label>
                <input style={inputStyle} value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://yourwebsite.com" type="url" />
              </div>
            </div>

            {/* ── Availability ──────────────────────────────────────── */}
            {sectionTitle('Availability')}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
              {[
                { value: 'open', label: '🟢 Open', desc: 'Open to collaborations' },
                { value: 'limited', label: '🟡 Limited', desc: 'Limited availability' },
                { value: 'booked', label: '🔴 Booked', desc: 'Currently booked' },
                { value: 'not_available', label: '⚫ Closed', desc: 'Not available' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAvailabilityStatus(opt.value)}
                  style={{
                    padding: '8px 16px', borderRadius: '8px',
                    border: availabilityStatus === opt.value ? '2px solid #7C3AED' : '2px solid #E5E7EB',
                    backgroundColor: availabilityStatus === opt.value ? '#F5F3FF' : 'white',
                    fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                    color: '#111827',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div>
              <label style={labelStyle}>Availability Note</label>
              <input style={inputStyle} value={availabilityNote} onChange={(e) => setAvailabilityNote(e.target.value)} placeholder="e.g. Available from March, Booked until April" />
            </div>

            {/* ── Preferences ──────────────────────────────────────── */}
            {sectionTitle('Preferences')}
            <div>
              <label style={{ ...labelStyle, marginBottom: '10px' }}>Industries I work with</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                {INDUSTRIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    style={{
                      padding: '6px 14px', borderRadius: '999px',
                      border: preferredCategories.includes(cat) ? '2px solid #7C3AED' : '2px solid #E5E7EB',
                      backgroundColor: preferredCategories.includes(cat) ? '#EDE9FE' : 'white',
                      color: preferredCategories.includes(cat) ? '#7C3AED' : '#374151',
                      fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Minimum Budget</label>
              <div style={{ position: 'relative', maxWidth: '200px' }}>
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', fontSize: '14px' }}>$</span>
                <input style={{ ...inputStyle, paddingLeft: '24px' }} type="number" value={minBudget} onChange={(e) => setMinBudget(e.target.value)} placeholder="500" min="0" />
              </div>
            </div>

            {/* ── Save ─────────────────────────────────────────────── */}
            <div style={{ marginTop: '28px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="submit"
                disabled={saving}
                style={{ padding: '11px 28px', borderRadius: '8px', border: 'none', backgroundColor: '#7C3AED', color: 'white', fontSize: '15px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              {saved && <span style={{ fontSize: '14px', color: '#059669', fontWeight: 500 }}>✓ Saved successfully</span>}
              {error && <span style={{ fontSize: '14px', color: '#DC2626' }}>{error}</span>}
            </div>

          </div>
        </form>
      </div>
    </div>
  );
}
