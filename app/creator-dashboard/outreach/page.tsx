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
import { getOutreachUiStrings } from '@/lib/outreach/ui-strings';

const GREY = '#3A3A3A';

/** creator_profiles.locale is nullable — NULL is "unknown", which reads as 'en'. Same rule as the verify page. */
function localeFromRecord(raw: string | null | undefined): Locale {
  return raw === 'es' ? 'es' : 'en';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function instagramProfileOf(profiles: any[]): any | null {
  return profiles.find((p) => p.platform === 'instagram') ?? null;
}

/**
 * The creator's first name, resolved through the SAME chain the Overview page
 * uses — creator_profiles.display_name, then v_creator_summary.name
 * (components/creator-dashboard/DashboardOverview.tsx:92) — so the two screens
 * can never disagree about who the creator is. display_name is null for plenty
 * of claimed creators, which is why the second source is not optional.
 *
 * First name only, by the same `.split()` Overview's "Welcome back, Andrea"
 * greeting uses. A DM that opens with a full legal name reads like a form
 * letter.
 *
 * Returns '' — never the handle — when nothing resolves. The handle is already
 * the other half of the identify line, so falling back to it there is what
 * produced "I'm @andreasolarteoficial (@andreasolarteoficial)". The message
 * layer drops the parenthetical instead.
 */
function resolveFirstName(displayName: string | null | undefined, summaryName: string | null | undefined): string {
  // `||` rather than `??`: an empty or whitespace-only display_name has to fall
  // through to the summary, and `??` would stop at ''.
  const full = (displayName?.trim() || summaryName?.trim() || '');
  return full ? full.split(/\s+/)[0] : '';
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      {children}
    </div>
  );
}

function EmptyState({ title, body, backLabel }: { title: string; body: string; backLabel: string }) {
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
        {backLabel}
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
  // v_creator_summary, for its `name` — the second link in Overview's name
  // chain, and the only one populated for a creator whose display_name is null.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [creatorSummary, setCreatorSummary] = useState<any>(null);
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
        const [matchesRes, profilesRes, summaryRes, sendsRes] = await Promise.all([
          fetch('/api/creator/brand-matches').then((r) => (r.ok ? r.json() : null)),
          supabase.from('social_profiles').select('*').eq('creator_id', creatorId),
          // maybeSingle(), where Overview uses single() — the one deliberate
          // deviation. single() turns "this creator has no summary row" into an
          // error object, and a missing name must degrade quietly here, not
          // look like a failed load.
          supabase.from('v_creator_summary').select('*').eq('creator_id', creatorId).maybeSingle(),
          fetch(`/api/creator/outreach?brand=${encodeURIComponent(brandParam!)}`).then((r) => (r.ok ? r.json() : null)),
        ]);

        if (cancelled) return;

        if (!matchesRes) { setLoadFailed(true); return; }

        const data = matchesRes as CreatorBrandMatches;
        setMatch(data.matches.find((m) => m.canonicalName === brandParam) ?? null);
        setSocialProfiles(profilesRes.data ?? []);
        setCreatorSummary(summaryRes.data ?? null);
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

  // The toggle owns the whole page's language, so its state lives here rather
  // than inside OutreachSequence — the header sits outside that component and
  // has to move with it. A header in one language above a message in another is
  // worse than either language on its own.
  //
  // Derived-with-override rather than useState(initialLocale): creatorProfile
  // arrives asynchronously, so a state seeded on the first render would latch
  // 'en' before the stored locale ever loaded. Until the creator touches the
  // toggle, the page follows creator_profiles.locale and updates when it lands.
  const storedLocale = localeFromRecord(creatorProfile?.locale);
  const [localeOverride, setLocaleOverride] = useState<Locale | null>(null);
  const locale = localeOverride ?? storedLocale;

  const identity: OutreachIdentity | null = useMemo(() => {
    if (!instagramProfile) return null;

    // calculated_engagement_rate, matching the dashboard's own stat card
    // (components/creator-dashboard/DashboardOverview.tsx). Deliberately NOT
    // social_profiles.engagement_rate — that column is uncapped and has been
    // observed above 100%. Null stays null: an unknown engagement drops the
    // clause rather than getting a placeholder number.
    const engagement = instagramProfile.enrichment_data?.calculated_engagement_rate;

    return {
      name: resolveFirstName(creatorProfile?.display_name, creatorSummary?.name),
      handle: instagramProfile.handle ?? '',
      followers: instagramProfile.follower_count != null ? formatCount(instagramProfile.follower_count) : '',
      engagement: engagement != null ? Number(engagement).toFixed(1) : '',
    };
  }, [instagramProfile, creatorProfile?.display_name, creatorSummary?.name]);

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

  const ui = getOutreachUiStrings(locale);

  if (loading || dataLoading) return <Centered><p style={{ color: '#9CA3AF' }}>{ui.loading}</p></Centered>;
  if (!user) return null;

  // Titled for the brand once we know which one. Before that — no ?brand=, or a
  // brand that isn't in the creator's matches — there is no name to title it
  // with, so it falls back to the generic form rather than printing "Contact
  // undefined" or echoing an unvalidated query param back at the creator.
  const headerTitle = match ? ui.title(match.canonicalName) : ui.titleNoBrand;

  const header = (
    <ToolHeader
      icon="✉️"
      title={headerTitle}
      description={ui.subtitle}
      // The first two crumbs stay English in both locales: they name other
      // dashboard screens, which are English, and a breadcrumb that disagrees
      // with its own destination's title is worse than an untranslated one.
      crumbs={[
        { label: 'Dashboard', href: '/creator-dashboard' },
        { label: 'Brands Hiring', href: '/creator-dashboard/brands-hiring' },
        { label: match?.canonicalName ?? headerTitle },
      ]}
    />
  );

  if (!brandParam) {
    return (
      <div style={{ maxWidth: '760px' }}>
        {header}
        <EmptyState title={ui.pickBrandTitle} body={ui.pickBrandBody} backLabel={ui.backToBrandsHiring} />
      </div>
    );
  }

  if (loadFailed) {
    return (
      <div style={{ maxWidth: '760px' }}>
        {header}
        <EmptyState title={ui.loadFailedTitle} body={ui.loadFailedBody} backLabel={ui.backToBrandsHiring} />
      </div>
    );
  }

  if (!match) {
    return (
      <div style={{ maxWidth: '760px' }}>
        {header}
        <EmptyState title={ui.notMatchedTitle(brandParam)} body={ui.notMatchedBody} backLabel={ui.backToBrandsHiring} />
      </div>
    );
  }

  if (!identity) {
    return (
      <div style={{ maxWidth: '760px' }}>
        {header}
        <EmptyState title={ui.instagramOnlyTitle} body={ui.instagramOnlyBody} backLabel={ui.backToBrandsHiring} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '760px' }}>
      {header}
      <OutreachSequence
        match={match}
        identity={identity}
        locale={locale}
        onLocaleChange={setLocaleOverride}
        sends={sends}
        onCopied={handleCopied}
        onMarkSent={handleMarkSent}
      />
    </div>
  );
}

export default function OutreachPage() {
  return (
    // English: this renders before creator_profiles.locale has loaded, so there
    // is no locale to resolve yet — the same reason the shared nav resolves 'en'
    // first on a prerendered route.
    <Suspense fallback={<Centered><p style={{ color: '#9CA3AF' }}>Loading…</p></Centered>}>
      <OutreachPageInner />
    </Suspense>
  );
}
