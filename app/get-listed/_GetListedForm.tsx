'use client';

// app/get-listed/_GetListedForm.tsx
//
// The "add me to the database" form. One component, taking `source` as a prop,
// so a new entry point costs one link (or one embed) and nothing else.
//
// Props-in only: no useSearchParams, no useLocale, no auth. The route's server
// component reads the query string and hands over `initialHandle`, `source`
// and `locale` — which is what keeps this file free of the Suspense boundary
// useSearchParams() would require, and lets the form be dropped into any page
// later without dragging a locale resolver with it.

import { useState } from 'react';
import Link from 'next/link';
import type { Locale } from '@/app/claim/[handle]/_strings';
import { HtmlLangSync } from '@/app/claim/[handle]/_HtmlLangSync';
import { NOTE_MAX_LENGTH, type RequestSource } from '@/lib/creator-requests/shared';
import { getGetListedStrings, requestErrorMessage } from './_strings';

const GREY = '#3A3A3A';
const GOLD = '#FFD700';

/**
 * 'exists' and 'requested' are OUTCOMES, not errors — both arrive as a 200
 * with a reason code, and both are better news for the creator than the happy
 * path they were aiming for.
 */
type Outcome =
  | { kind: 'idle' }
  | { kind: 'sent' }
  | { kind: 'requested' }
  | { kind: 'exists'; claimUrl: string; handle: string };

/**
 * The page frame the three states share. Declared at module scope, not inside
 * the component: a component created during render is a NEW component type on
 * every render, so React unmounts and remounts its whole subtree and every
 * input in it loses its value as you type. `locale` comes in as a prop for the
 * same reason — it can no longer close over the one in scope.
 */
function Shell({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '60vh', backgroundColor: '#FAFAFA', padding: '48px 20px' }}>
      {locale === 'es' && <HtmlLangSync lang="es" />}
      <div style={{ maxWidth: '520px', margin: '0 auto' }}>{children}</div>
    </div>
  );
}

export type GetListedFormProps = {
  initialHandle: string;
  source: RequestSource;
  locale: Locale;
};

export function GetListedForm({ initialHandle, source, locale }: GetListedFormProps) {
  const t = getGetListedStrings(locale);

  const [handle, setHandle] = useState(initialHandle);
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  // The honeypot. Never shown, never labelled, never autofilled (see the
  // input's attributes below). A value here means a bot.
  const [website, setWebsite] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [outcome, setOutcome] = useState<Outcome>({ kind: 'idle' });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/creators/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // The handle is sent as typed. The route normalizes it — and is the
        // only place that may, since it is what writes the row; normalizing
        // twice in two places is how the two drift apart.
        body: JSON.stringify({ platform: 'instagram', handle, email, note, source, website }),
      });
      const body = await res.json().catch(() => null);

      // Keyed off the reason code regardless of status: "already listed" is a
      // 200 that is not the success path.
      if (body?.reason === 'already_listed' && typeof body?.claimUrl === 'string') {
        setOutcome({ kind: 'exists', claimUrl: body.claimUrl, handle: body.handle ?? handle.replace(/^@/, '').trim().toLowerCase() });
        return;
      }
      if (body?.reason === 'already_requested') {
        setOutcome({ kind: 'requested' });
        return;
      }
      if (res.ok && body?.reason === 'received') {
        setOutcome({ kind: 'sent' });
        return;
      }
      setError(requestErrorMessage(locale, body?.reason));
    } catch {
      setError(requestErrorMessage(locale, null));
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: '8px',
    border: '1px solid #E5E7EB', fontSize: '14px', color: GREY,
    outline: 'none', boxSizing: 'border-box', backgroundColor: 'white',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px',
  };

  if (outcome.kind === 'exists') {
    return (
      <Shell locale={locale}>
        <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '32px 28px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: GREY, margin: '0 0 8px 0' }}>{t.existsTitle}</h1>
          <p style={{ fontSize: '15px', color: '#6B7280', margin: '0 0 20px 0', lineHeight: 1.6 }}>
            {t.existsBody(outcome.handle)}
          </p>
          <Link
            href={outcome.claimUrl}
            style={{
              display: 'inline-flex', padding: '10px 20px', borderRadius: '8px',
              backgroundColor: GOLD, color: GREY, fontSize: '14px', fontWeight: 600, textDecoration: 'none',
            }}
          >
            {t.existsCta}
          </Link>
        </div>
      </Shell>
    );
  }

  if (outcome.kind === 'sent' || outcome.kind === 'requested') {
    const done = outcome.kind === 'sent'
      ? { title: t.successTitle, body: t.successBody }
      : { title: t.alreadyRequestedTitle, body: t.alreadyRequestedBody };
    return (
      <Shell locale={locale}>
        <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '32px 28px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: GREY, margin: '0 0 8px 0' }}>{done.title}</h1>
          <p style={{ fontSize: '15px', color: '#6B7280', margin: 0, lineHeight: 1.6 }}>{done.body}</p>
        </div>
      </Shell>
    );
  }

  const remaining = NOTE_MAX_LENGTH - note.length;

  return (
    <Shell locale={locale}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, color: GREY, margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
        {t.title}
      </h1>
      <p style={{ fontSize: '15px', color: '#6B7280', margin: '0 0 24px 0', lineHeight: 1.6 }}>{t.subtitle}</p>

      <form
        onSubmit={handleSubmit}
        style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}
      >
        <div>
          <label style={labelStyle} htmlFor="platform">{t.platformLabel}</label>
          {/* Instagram is the only value the route accepts. TikTok is present
              and disabled rather than absent, because "not yet" is a different
              and more useful answer than silence — and because TikTok
              verification has never run successfully (CLAUDE.md, "Known open
              items"), so inviting TikTok creators in would fill the queue with
              people we cannot finish serving. */}
          <select id="platform" value="instagram" disabled style={{ ...inputStyle, cursor: 'not-allowed', backgroundColor: '#F9FAFB' }} onChange={() => {}}>
            <option value="instagram">{t.platformInstagram}</option>
            <option value="tiktok" disabled>{t.platformTikTokSoon}</option>
          </select>
        </div>

        <div>
          <label style={labelStyle} htmlFor="handle">{t.handleLabel}</label>
          <input
            id="handle"
            style={inputStyle}
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            required
            autoComplete="off"
            placeholder={t.handlePlaceholder}
          />
          <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '4px 0 0 0' }}>{t.handleHelp}</p>
        </div>

        <div>
          <label style={labelStyle} htmlFor="email">{t.emailLabel}</label>
          <input
            id="email"
            style={inputStyle}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder={t.emailPlaceholder}
          />
          <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '4px 0 0 0' }}>{t.emailHelp}</p>
        </div>

        <div>
          <label style={labelStyle} htmlFor="note">
            {t.noteLabel} <span style={{ fontWeight: 400, color: '#9CA3AF' }}>({t.noteOptional})</span>
          </label>
          <textarea
            id="note"
            style={{ ...inputStyle, minHeight: '84px', resize: 'vertical', fontFamily: 'inherit' }}
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX_LENGTH))}
            maxLength={NOTE_MAX_LENGTH}
            placeholder={t.notePlaceholder}
          />
          <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '4px 0 0 0' }}>{t.noteCounter(remaining)}</p>
        </div>

        {/* ── Honeypot ──────────────────────────────────────────────────────
            Off-screen rather than display:none, and tabIndex -1 with
            aria-hidden, so it is unreachable by keyboard and invisible to a
            screen reader while still being a real, fillable input to a bot
            that reads the DOM. Same trick app/contact/page.tsx uses. */}
        <input
          type="text"
          name="website"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', opacity: 0 }}
        />

        {error && <p style={{ fontSize: '13px', color: '#DC2626', margin: 0 }}>{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: '11px 20px', borderRadius: '8px', border: 'none',
            backgroundColor: GOLD, color: GREY, fontSize: '14px', fontWeight: 600,
            cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.6 : 1,
          }}
        >
          {submitting ? t.submitting : t.submit}
        </button>
      </form>
    </Shell>
  );
}

export default GetListedForm;
