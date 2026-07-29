'use client';

// components/creator-dashboard/OutreachSequence.tsx
// The outreach tool's content: the handle picker, the editable identity
// fields, and the three-message sequence.
//
// Pure props-in, like BrandsHiring.tsx and DashboardOverview.tsx — no fetch, no
// auth, no router. Everything it needs arrives as props and everything it does
// leaves through the three callbacks. That keeps the page (which owns the
// session and the network) the only place either concern lives.

import { useMemo, useState } from 'react';
import type { Locale } from '@/app/claim/[handle]/_strings';
import type { BrandHandle, MatchedBrand } from '@/lib/reports/creator-brand-matches';
import { buildOutreachSequence, type OutreachIdentity, type OutreachStep } from '@/lib/outreach/messages';

const GREY = '#3A3A3A';
const PINK = '#FF4D94';

/** One recorded marking, as returned by GET /api/creator/outreach. */
export type OutreachSend = {
  sequenceStep: number;
  brandHandle: string | null;
  locale: string | null;
  markedSentAt: string;
};

interface OutreachSequenceProps {
  match: MatchedBrand;
  identity: OutreachIdentity;
  /** From creator_profiles.locale, already resolved to a real locale by the caller. */
  defaultLocale: Locale;
  sends: OutreachSend[];
  onCopied: (step: OutreachStep, handle: string | null, locale: Locale) => void;
  onMarkSent: (step: OutreachStep, handle: string | null, locale: Locale) => Promise<void>;
}

function labelForHandle(h: BrandHandle): string {
  return h.isRegionMatch && h.region ? `@${h.handle} · ${h.region}` : `@${h.handle}`;
}

/** Locale-independent, and short: this sits next to a "Marked as sent" line, not in a report. */
function formatSentAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

const fieldStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1.5px solid #E5E7EB',
  backgroundColor: '#F9FAFB', color: GREY, fontSize: '14px', outline: 'none', boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontWeight: 600, color: '#9CA3AF',
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px',
};

function MessageCard({
  step, timing, body, isEdited, sends, selectedHandle, locale, onChange, onReset, onCopied, onMarkSent,
}: {
  step: OutreachStep;
  timing: string;
  body: string;
  isEdited: boolean;
  sends: OutreachSend[];
  selectedHandle: string | null;
  locale: Locale;
  onChange: (next: string) => void;
  onReset: () => void;
  onCopied: (step: OutreachStep, handle: string | null, locale: Locale) => void;
  onMarkSent: (step: OutreachStep, handle: string | null, locale: Locale) => Promise<void>;
}) {
  const [copied, setCopied] = useState(false);
  const [marking, setMarking] = useState(false);
  const [markError, setMarkError] = useState('');

  // Only markings for the handle currently selected. The same message sent to a
  // brand's global account and to its regional one are two different sends, and
  // the history has to say which.
  const sendsForThisStep = sends.filter((s) => s.sequenceStep === step && s.brandHandle === selectedHandle);
  const lastSend = sendsForThisStep[0] ?? null;

  // Same shape as app/creator-dashboard/verify/page.tsx's copyCode(): write,
  // flag, clear after a beat.
  async function handleCopy() {
    await navigator.clipboard.writeText(body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopied(step, selectedHandle, locale);
  }

  async function handleMarkSent() {
    setMarking(true);
    setMarkError('');
    try {
      await onMarkSent(step, selectedHandle, locale);
    } catch {
      setMarkError('Could not save that — try again.');
    } finally {
      setMarking(false);
    }
  }

  return (
    <div style={{
      backgroundColor: '#fff', borderRadius: '16px', padding: '20px',
      border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
          <span style={{ fontSize: '13px', fontWeight: 800, color: PINK }}>{step}</span>
          <span style={{ fontSize: '14px', fontWeight: 700, color: GREY }}>
            {step === 1 ? 'First contact' : `Follow-up ${step - 1}`}
          </span>
          <span style={{ fontSize: '12px', color: '#9CA3AF' }}>{timing}</span>
        </div>
        {isEdited && (
          <button
            onClick={onReset}
            style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            Reset to generated
          </button>
        )}
      </div>

      <textarea
        value={body}
        onChange={(e) => onChange(e.target.value)}
        rows={step === 1 ? 13 : 8}
        style={{ ...fieldStyle, fontFamily: 'inherit', lineHeight: 1.55, resize: 'vertical' }}
      />

      <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
        <button
          onClick={handleCopy}
          style={{
            padding: '9px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
            backgroundColor: copied ? '#ECFDF5' : GREY,
            color: copied ? '#10B981' : '#fff',
            border: `1.5px solid ${copied ? '#10B981' : GREY}`,
          }}
        >
          {copied ? '✓ Copied!' : 'Copy message'}
        </button>
        <button
          onClick={handleMarkSent}
          disabled={marking}
          style={{
            padding: '9px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 700,
            cursor: marking ? 'not-allowed' : 'pointer',
            backgroundColor: '#fff', color: GREY, border: '1.5px solid #E5E7EB',
          }}
        >
          {marking ? 'Saving…' : 'Mark as sent'}
        </button>
      </div>

      {markError && (
        <p style={{ fontSize: '12px', color: '#DC2626', margin: '10px 0 0 0' }}>{markError}</p>
      )}

      {lastSend && (
        <p style={{ fontSize: '12px', color: '#6B7280', margin: '10px 0 0 0' }}>
          Marked as sent · {formatSentAt(lastSend.markedSentAt)}
          {sendsForThisStep.length > 1 && ` · ${sendsForThisStep.length} times`}
        </p>
      )}
    </div>
  );
}

export function OutreachSequence({ match, identity, defaultLocale, sends, onCopied, onMarkSent }: OutreachSequenceProps) {
  const [locale, setLocale] = useState<Locale>(defaultLocale);
  const [fields, setFields] = useState<OutreachIdentity>(identity);
  const [selectedHandle, setSelectedHandle] = useState<string | null>(match.handles[0]?.handle ?? null);

  // Creator edits, keyed by step. A step present here has been typed in, and is
  // never silently regenerated underneath the creator — switching language or
  // changing a detail rewrites only the messages they have not touched. The
  // per-message Reset button is the way back.
  const [edits, setEdits] = useState<Partial<Record<OutreachStep, string>>>({});

  const generated = useMemo(
    () =>
      buildOutreachSequence(locale, fields, {
        brandName: match.canonicalName,
        recentlyActive: match.recencyBucket === 'active',
        regionLabel: match.regionMatch?.label ?? null,
      }),
    [locale, fields, match.canonicalName, match.recencyBucket, match.regionMatch],
  );

  function setField(key: keyof OutreachIdentity, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* ── Destination ─────────────────────────────────────────────── */}
      <div style={{
        backgroundColor: '#fff', borderRadius: '16px', padding: '20px',
        border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <span style={labelStyle}>Send to</span>
        {match.handles.length === 0 ? (
          <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>
            We haven&apos;t detected an Instagram account for {match.canonicalName}. You can still draft and
            mark these messages — we just won&apos;t record which account you sent them to.
          </p>
        ) : (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {match.handles.map((h) => {
                const active = selectedHandle === h.handle;
                return (
                  <button
                    key={h.handle}
                    onClick={() => setSelectedHandle(h.handle)}
                    style={{
                      padding: '7px 14px', borderRadius: '999px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                      border: active ? 'none' : '1px solid #E5E7EB',
                      backgroundColor: active ? GREY : '#fff',
                      color: active ? '#fff' : GREY,
                    }}
                  >
                    {labelForHandle(h)}
                  </button>
                );
              })}
            </div>
            {match.handles.length > 1 && (
              <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '10px 0 0 0' }}>
                We detected {match.handles.length} accounts for this brand. Accounts in your region are listed first.
              </p>
            )}
          </>
        )}
      </div>

      {/* ── Your details ────────────────────────────────────────────── */}
      <div style={{
        backgroundColor: '#fff', borderRadius: '16px', padding: '20px',
        border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
          <span style={{ ...labelStyle, marginBottom: 0 }}>Your details</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['en', 'es'] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLocale(l)}
                style={{
                  padding: '5px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  border: locale === l ? 'none' : '1px solid #E5E7EB',
                  backgroundColor: locale === l ? GREY : '#fff',
                  color: locale === l ? '#fff' : GREY,
                }}
              >
                {l === 'en' ? 'English' : 'Español'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
          <div>
            <label style={labelStyle} htmlFor="outreach-name">Name</label>
            <input id="outreach-name" style={fieldStyle} value={fields.name} onChange={(e) => setField('name', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle} htmlFor="outreach-handle">Handle</label>
            <input id="outreach-handle" style={fieldStyle} value={fields.handle} onChange={(e) => setField('handle', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle} htmlFor="outreach-followers">Followers</label>
            <input id="outreach-followers" style={fieldStyle} value={fields.followers} onChange={(e) => setField('followers', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle} htmlFor="outreach-engagement">Engagement %</label>
            <input id="outreach-engagement" style={fieldStyle} value={fields.engagement} onChange={(e) => setField('engagement', e.target.value)} />
          </div>
        </div>

        <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '12px 0 0 0' }}>
          Detected from your profile. Change anything here and the messages you haven&apos;t edited update with it.
          Clear a field to leave it out of the message entirely.
        </p>
      </div>

      {/* ── The sequence ────────────────────────────────────────────── */}
      <p style={{ fontSize: '13px', color: '#6B7280', margin: '4px 0 0 0' }}>
        Three messages, spaced out. Send the first one now — the follow-ups are already written, so you can see
        where this goes before you start.
      </p>

      {generated.map((message) => (
        <MessageCard
          key={message.step}
          step={message.step}
          timing={message.timing}
          body={edits[message.step] ?? message.body}
          isEdited={edits[message.step] != null}
          sends={sends}
          selectedHandle={selectedHandle}
          locale={locale}
          onChange={(next) => setEdits((prev) => ({ ...prev, [message.step]: next }))}
          onReset={() => setEdits((prev) => {
            const next = { ...prev };
            delete next[message.step];
            return next;
          })}
          onCopied={onCopied}
          onMarkSent={onMarkSent}
        />
      ))}

      <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0 }}>
        &ldquo;Marked as sent&rdquo; is your own record — we can&apos;t detect whether a message was actually sent,
        so nothing here is tracked for you automatically.
      </p>
    </div>
  );
}
