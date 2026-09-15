'use client';

// app/creator-dashboard/edit/page.tsx
// Creator edit profile — bio, availability, preferences

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { AccountLoadError } from '@/components/creator-dashboard/AccountLoadError';
import { track } from '@/lib/dashboard/track';

const INDUSTRIES = ['Fashion', 'Beauty', 'Travel', 'Food & Beverage', 'Tech', 'Fitness', 'Lifestyle', 'Gaming', 'Music', 'Sports'];

/** The seven columns the form writes, normalized exactly as handleSave writes them. */
type ProfileFields = {
  display_name: string | null;
  custom_bio: string | null;
  website: string | null;
  availability_status: string;
  availability_note: string | null;
  preferred_categories: string[] | null;
  min_budget: number | null;
};

function toProfileFields(v: { displayName: string; customBio: string; website: string; availabilityStatus: string; availabilityNote: string; preferredCategories: string[]; minBudget: string }): ProfileFields {
  return {
    display_name: v.displayName || null,
    custom_bio: v.customBio || null,
    website: v.website || null,
    availability_status: v.availabilityStatus,
    availability_note: v.availabilityNote || null,
    preferred_categories: v.preferredCategories.length > 0 ? v.preferredCategories : null,
    min_budget: v.minBudget ? parseFloat(v.minBudget) : null,
  };
}

export default function EditProfilePage() {
  const { user, userRole, creatorProfile, loading, authError } = useAuth();

  // What the form held when it finished loading — including the scraped/AI
  // fallbacks below, which are NOT in creator_profiles. profile_edited's
  // fields_changed is diffed against this, not against creatorProfile:
  // diffing against the row would report display_name and custom_bio as
  // changed on every first save even when the creator touched nothing.
  const initialFields = useRef<ProfileFields | null>(null);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [dataLoading, setDataLoading] = useState(true);

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [customBio, setCustomBio] = useState('');
  const [website, setWebsite] = useState('');
  const [availabilityStatus, setAvailabilityStatus] = useState('open');
  const [availabilityNote, setAvailabilityNote] = useState('');
  const [preferredCategories, setPreferredCategories] = useState<string[]>([]);
  const [minBudget, setMinBudget] = useState('');

  // Populate form — use creatorProfile fields, fall back to v_creator_summary / social_profiles
  useEffect(() => {
    if (!creatorProfile) return;

    async function loadFallbackData() {
      const creatorId = creatorProfile!.creator_id;

      // Fetch summary and social profiles for fallback values
      const [summaryRes, socialRes] = await Promise.all([
        supabase.from('v_creator_summary').select('*').eq('creator_id', creatorId).single(),
        supabase.from('social_profiles').select('ai_summary, bio').eq('creator_id', creatorId),
      ]);

      const summary = summaryRes.data;
      const socialProfiles = socialRes.data ?? [];
      const aiSummary = socialProfiles.find((p: any) => p.ai_summary)?.ai_summary ?? null;
      const socialBio = socialProfiles[0]?.bio ?? null;

      // Use saved value if set, otherwise fall back to scraped/AI data
      const loaded = {
        displayName: creatorProfile!.display_name ?? summary?.name ?? '',
        customBio: creatorProfile!.custom_bio ?? aiSummary ?? socialBio ?? '',
        website: creatorProfile!.website ?? '',
        availabilityStatus: creatorProfile!.availability_status ?? 'open',
        availabilityNote: creatorProfile!.availability_note ?? '',
        preferredCategories: creatorProfile!.preferred_categories ?? [],
        minBudget: creatorProfile!.min_budget ? String(creatorProfile!.min_budget) : '',
      };
      setDisplayName(loaded.displayName);
      setCustomBio(loaded.customBio);
      setWebsite(loaded.website);
      setAvailabilityStatus(loaded.availabilityStatus);
      setAvailabilityNote(loaded.availabilityNote);
      setPreferredCategories(loaded.preferredCategories);
      setMinBudget(loaded.minBudget);
      initialFields.current = toProfileFields(loaded);
      setDataLoading(false);
    }

    loadFallbackData();
  }, [creatorProfile]);

  // Auth guard — after all hooks
  if (loading || dataLoading) return <div style={{ padding: '80px', textAlign: 'center', color: '#9CA3AF' }}>Loading...</div>;
  // Same rule as app/creator-dashboard/page.tsx: never redirect on a failed
  // lookup. This tool is English by design, so the retry state is 'en'.
  // A signed-out visitor (no user, no error) falls through to the existing
  // /login redirect below; a failed check renders the retry state instead.
  if (authError || (user && userRole === undefined)) return <AccountLoadError locale="en" />;
  if (!user || userRole !== 'creator') { window.location.href = '/login'; return null; }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const fields = toProfileFields({ displayName, customBio, website, availabilityStatus, availabilityNote, preferredCategories, minBudget });
    const updates = { ...fields, updated_at: new Date().toISOString() };

    const { error: updateError } = await supabase
      .from('creator_profiles')
      .update(updates)
      .eq('id', user!.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      // Column names only, never the values. Diffed against the post-load
      // snapshot; then the snapshot moves forward so a second save reports
      // only what changed since the first.
      const before = initialFields.current;
      const fieldsChanged = (Object.keys(fields) as (keyof ProfileFields)[])
        .filter((k) => !before || JSON.stringify(before[k]) !== JSON.stringify(fields[k]));
      initialFields.current = fields;
      track('profile_edited', { fields_changed: fieldsChanged });
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
    fontSize: '14px', color: '#3A3A3A', backgroundColor: 'white', outline: 'none',
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

        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#3A3A3A', margin: '16px 0 24px 0', letterSpacing: '-0.02em' }}>
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
                  rows={6}
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
                { value: 'open', label: '🟢 Open' },
                { value: 'limited', label: '🟡 Limited' },
                { value: 'booked', label: '🔴 Booked' },
                { value: 'not_available', label: '⚫ Closed' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAvailabilityStatus(opt.value)}
                  style={{
                    padding: '8px 16px', borderRadius: '8px',
                    border: availabilityStatus === opt.value ? '2px solid #FF4D94' : '2px solid #E5E7EB',
                    backgroundColor: availabilityStatus === opt.value ? '#FFF0F5' : 'white',
                    fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                    color: '#3A3A3A',
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
                      border: preferredCategories.includes(cat) ? '2px solid #FF4D94' : '2px solid #E5E7EB',
                      backgroundColor: preferredCategories.includes(cat) ? '#FFF0F5' : 'white',
                      color: preferredCategories.includes(cat) ? '#FF4D94' : '#374151',
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
                style={{ padding: '11px 28px', borderRadius: '8px', border: 'none', backgroundColor: '#FFD700', color: '#3A3A3A', fontSize: '15px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
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
