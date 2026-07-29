'use client';

// app/creator-dashboard/outreach/page.tsx
// Cold first contact with a brand from Brands Hiring.
//
// A NEW surface rather than a mode of the Negotiation tool: that tool's first
// step asks what stage you're at, and all four of its answers
// (components/tools/negotiate/Step1Stage.tsx) presuppose the brand already made
// contact. Nothing here has happened yet.
//
// Suspense wrapper is not optional — useSearchParams() outside one bails the
// whole route out of static prerendering at build time, silently. Same shape as
// app/creator-dashboard/negotiate/page.tsx and .../contract/page.tsx.

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatCount } from '@/lib/formatters';
import { ToolHeader } from '@/components/tools/shared/ToolHeader';
import { OutreachSequence, type OutreachSend } from '@/components/creator-dashboard/OutreachSequence';
import type { Locale } from '@/app/claim/[handle]/_strings';
import type { CreatorBrandMatches, MatchedBrand } from '@/lib/reports/creator-brand-matches';
import type { OutreachIdentity, OutreachStep } from '@/lib/outreach/messages';

const GREY = '#3A3A3A';

/** creator_profiles.locale is nullable — NULL is "unknown", which reads as 'en'. Same rule as the verify page. */
function localeFromRecord(raw: string | null | undefined): Locale {
  return raw === 'es' ? 'es' : 'en';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function instagramProfileOf(profiles: any[]): any | null {
  return profiles.find((p) => p.platform === 'instagram') ?? null;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      {children}
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div style={{
      backgroundColor: '#fff', borderRadius: '16px', padding: '48px 24px',
      border: '1px solid #E5E7EB', textAlign: 'center', maxWidth: '560px',
    }}>
      <h2 style={{ fontSize: '18px', fontWeight: 700, color: GREY, margin: '0 0 8px 0' }}>{title}</h2>
      <p style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 20px 0', lineHeight: 1.6 }}>{body}</p>
      <Link
        href="/creator-dashboard/brands-hiring"
        style={{ fontSize: '13px', fontWeight: 700, color: '#FF4D94', textDecoration: 'none' }}
      >
        ← Back to Brands Hiring
      </Link>
    </div>
  );
}

function OutreachPageInner() {
  const { user, creatorProfile, userRole, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const brandParam = searchParams.get('brand');

  const [match, setMatch] = useState<MatchedBrand | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [socialProfiles, setSocialProfiles] = useState<any[]>([]);
  const [sends, setSends] = useState<OutreachSend[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  // Auth guard. This is the negotiate/contract mechanism — router.push from an
  // effect — rather than brands-hiring's `window.location.href` assignment
  // during render, which is a side effect in the render body and costs a full
  // document reload. The `loading` check is the one thing taken from the
  // brands-hiring guard instead: without it this redirects to /login on the
  // first render, before AuthContext has resolved a session that exists.
  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/login'); return; }
    if (userRole && userRole !== 'creator') router.push('/dashboard');
  }, [loading, user, userRole, router]);

  const creatorId = creatorProfile?.creator_id;

  useEffect(() => {
    if (!creatorId || !brandParam) { setDataLoading(false); return; }

    let cancelled = false;

    async function load() {
      setDataLoading(true);
      setLoadFailed(false);
      try {
        // A MatchedBrand cannot travel in a URL — only its canonical name can,
        // so the match is re-found here from the same endpoint Brands Hiring
        // reads. Refetching rather than passing numbers through the query
        // string also means the message can never quote a figure that has since
        // changed underneath it.
        const [matchesRes, profilesRes, sendsRes] = await Promise.all([
          fetch('/api/creator/brand-matches').then((r) => (r.ok ? r.json() : null)),
          supabase.from('social_profiles').select('*').eq('creator_id', creatorId),
          fetch(`/api/creator/outreach?brand=${encodeURIComponent(brandParam!)}`).then((r) => (r.ok ? r.json() : null)),
        ]);

        if (cancelled) return;

        if (!matchesRes) { setLoadFailed(true); return; }

        const data = matchesRes as CreatorBrandMatches;
        setMatch(data.matches.find((m) => m.canonicalName === brandParam) ?? null);
        setSocialProfiles(profilesRes.data ?? []);
        setSends((sendsRes?.sends ?? []) as OutreachSend[]);
      } catch {
        if (!cancelled) setLoadFailed(true);
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [creatorId, brandParam]);

  const instagramProfile = useMemo(() => instagramProfileOf(socialProfiles), [socialProfiles]);
  const locale = localeFromRecord(creatorProfile?.locale);

  const identity: OutreachIdentity | null = useMemo(() => {
    if (!instagramProfile) return null;

    // calculated_engagement_rate, matching the dashboard's own stat card
    // (components/creator-dashboard/DashboardOverview.tsx). Deliberately NOT
    // social_profiles.engagement_rate — that column is uncapped and has been
    // observed above 100%. Null stays null: an unknown engagement drops the
    // clause rather than getting a placeholder number.
    const engagement = instagramProfile.enrichment_data?.calculated_engagement_rate;

    return {
      name: creatorProfile?.display_name ?? `@${instagramProfile.handle}`,
      handle: instagramProfile.handle ?? '',
      followers: instagramProfile.follower_count != null ? formatCount(instagramProfile.follower_count) : '',
      engagement: engagement != null ? Number(engagement).toFixed(1) : '',
    };
  }, [instagramProfile, creatorProfile?.display_name]);

  // Fired once per brand, not once per render — this is an opened event, and a
  // re-render is not an opening.
  const openedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!match || openedFor.current === match.canonicalName) return;
    openedFor.current = match.canonicalName;
    void fetch('/api/creator/outreach/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'outreach_opened', brand: match.canonicalName, locale }),
    }).catch(() => {});
  }, [match, locale]);

  const handleCopied = useCallback((step: OutreachStep, handle: string | null, messageLocale: Locale) => {
    // Fire-and-forget, and unawaited on purpose: a failed instrumentation write
    // must never be something the creator notices while copying.
    void fetch('/api/creator/outreach/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'message_copied', brand: brandParam, handle, step, locale: messageLocale }),
    }).catch(() => {});
  }, [brandParam]);

  const handleMarkSent = useCallback(async (step: OutreachStep, handle: string | null, messageLocale: Locale) => {
    const res = await fetch('/api/creator/outreach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brand: brandParam, handle, step, locale: messageLocale }),
    });
    if (!res.ok) throw new Error('mark-sent failed');

    // Re-read rather than optimistically appending: marked_sent_at is a
    // Postgres default, so the server's timestamp is the only correct one to
    // display.
    const refreshed = await fetch(`/api/creator/outreach?brand=${encodeURIComponent(brandParam!)}`)
      .then((r) => (r.ok ? r.json() : null));
    if (refreshed) setSends((refreshed.sends ?? []) as OutreachSend[]);
  }, [brandParam]);

  if (loading || dataLoading) return <Centered><p style={{ color: '#9CA3AF' }}>Loading…</p></Centered>;
  if (!user) return null;

  const header = (
    <ToolHeader
      icon="✉️"
      title="Draft outreach"
      description="A first message to a brand we've detected hiring creators your size"
      crumbs={[
        { label: 'Dashboard', href: '/creator-dashboard' },
        { label: 'Brands Hiring', href: '/creator-dashboard/brands-hiring' },
        { label: 'Draft outreach' },
      ]}
    />
  );

  if (!brandParam) {
    return (
      <div style={{ maxWidth: '760px' }}>
        {header}
        <EmptyState
          title="Pick a brand first"
          body="Open this from any brand in Brands Hiring and we'll draft a message for that brand."
        />
      </div>
    );
  }

  if (loadFailed) {
    return (
      <div style={{ maxWidth: '760px' }}>
        {header}
        <EmptyState
          title="We couldn't load your brand matches"
          body="Something went wrong fetching your matches just now. Try again from Brands Hiring."
        />
      </div>
    );
  }

  if (!match) {
    return (
      <div style={{ maxWidth: '760px' }}>
        {header}
        <EmptyState
          title={`${brandParam} isn't in your matches`}
          body="This brand isn't currently detected as hiring creators your size — your matches update as we scan more brands."
        />
      </div>
    );
  }

  if (!identity) {
    return (
      <div style={{ maxWidth: '760px' }}>
        {header}
        <EmptyState
          title="Instagram only, for now"
          body="Outreach drafting uses your Instagram profile, and we haven't detected one on your account yet."
        />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '760px' }}>
      {header}
      <OutreachSequence
        match={match}
        identity={identity}
        defaultLocale={locale}
        sends={sends}
        onCopied={handleCopied}
        onMarkSent={handleMarkSent}
      />
    </div>
  );
}

export default function OutreachPage() {
  return (
    <Suspense fallback={<Centered><p style={{ color: '#9CA3AF' }}>Loading…</p></Centered>}>
      <OutreachPageInner />
    </Suspense>
  );
}
