'use client';

// components/creator-dashboard/OutreachSequence.tsx
// The outreach tool's content: the handle picker, the editable identity
// fields, and the three-message sequence.
//
// Pure props-in, like BrandsHiring.tsx and DashboardOverview.tsx — no fetch, no
// auth, no router. Everything it needs arrives as props and everything it does
// leaves through the three callbacks. That keeps the page (which owns the
// session and the network) the only place either concern lives.

import { useEffect, useMemo, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import type { Locale } from '@/app/claim/[handle]/_strings';
import type { BrandHandle, MatchedBrand } from '@/lib/reports/creator-brand-matches';
import { buildOutreachSequence, type OutreachIdentity, type OutreachStep } from '@/lib/outreach/messages';
import { getOutreachUiStrings } from '@/lib/outreach/ui-strings';

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
  /**
   * The page's language, owned by the page rather than by this component. The
   * toggle rendered here reports upward through onLocaleChange instead of
   * holding its own state, because the page header outside this component has
   * to change with it — the toggle drives the whole surface, not just the
   * message bodies.
   */
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  sends: OutreachSend[];
  onCopied: (step: OutreachStep, handle: string | null, locale: Locale) => void;
  onMarkSent: (step: OutreachStep, handle: string | null, locale: Locale) => Promise<void>;
}

function labelForHandle(h: BrandHandle): string {
  return h.isRegionMatch && h.region ? `@${h.handle} · ${h.region}` : `@${h.handle}`;
}

/**
 * Short: this sits next to a "Marked as sent" line, not in a report. Formatted
 * for the page's locale rather than the browser's, so the date agrees with the
 * sentence around it — an es page reading "Marcado como enviado · Jul 29" would
 * be the same half-and-half problem the toggle exists to prevent.
 */
function formatSentAt(iso: string, locale: Locale): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(locale === 'es' ? 'es' : 'en', { month: 'short', day: 'numeric', year: 'numeric' });
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
  step, body, isEdited, sends, selectedHandle, locale, onChange, onReset, onCopied, onMarkSent,
}: {
  step: OutreachStep;
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
  const ui = getOutreachUiStrings(locale);

  // Only markings for the handle currently selected. The same message sent to a
  // brand's global account and to its regional one are two different sends, and
  // the history has to say which.
  const sendsForThisStep = sends.filter((s) => s.sequenceStep === step && s.brandHandle === selectedHandle);
  const lastSend = sendsForThisStep[0] ?? null;

  // Same write-then-flag shape as app/creator-dashboard/verify/page.tsx's
  // copyCode(), with one deliberate difference: no 2-second timer.
  //
  // There, "Copied!" is pure acknowledgement and nothing follows it. Here the
  // copied state carries the DM link — the whole point of putting it there is
  // that the creator has the message on their clipboard before they leave — and
  // a control that vanishes two seconds after appearing cannot be clicked
  // deliberately. It resets on the two events that actually invalidate a copy
  // instead: editing the message, or switching destination handle.
  async function handleCopy() {
    await navigator.clipboard.writeText(body);
    setCopied(true);
    onCopied(step, selectedHandle, locale);
  }

  useEffect(() => {
    setCopied(false);
  }, [body, selectedHandle]);

  async function handleMarkSent() {
    setMarking(true);
    setMarkError('');
    try {
      await onMarkSent(step, selectedHandle, locale);
    } catch {
      setMarkError(ui.markError);
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
            {ui.messageTitle(step)}
          </span>
          <span style={{ fontSize: '12px', color: '#9CA3AF' }}>{ui.timing[step]}</span>
        </div>
        {isEdited && (
          <button
            onClick={onReset}
            style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {ui.resetToGenerated}
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
        {copied && selectedHandle ? (
          // Only reachable AFTER a copy, and that ordering is the point: the DM
          // thread opens with an empty message box, so a creator who clicks
          // through first arrives with nothing to paste.
          //
          // ig.me/m/<handle> over an instagram:// scheme deliberately. The web
          // link resolves on desktop and on mobile web and lands in the thread
          // with the box focused; the app scheme fails silently on desktop and
          // on any device without the app installed, which is the worst
          // possible failure for a control the creator only sees once.
          <a
            href={`https://ig.me/m/${encodeURIComponent(selectedHandle)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '9px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 700,
              textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px',
              backgroundColor: '#ECFDF5', color: '#10B981', border: '1.5px solid #10B981',
            }}
          >
            {ui.copiedOpen(selectedHandle)} <ExternalLink size={13} aria-hidden="true" />
          </a>
        ) : (
          <button
            onClick={handleCopy}
            style={{
              padding: '9px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
              backgroundColor: copied ? '#ECFDF5' : GREY,
              color: copied ? '#10B981' : '#fff',
              border: `1.5px solid ${copied ? '#10B981' : GREY}`,
            }}
          >
            {/* No handle to open — the brand has no verified alias, so this
                stays a plain acknowledgement rather than a dead link. */}
            {copied ? ui.copied : ui.copyMessage}
          </button>
        )}
        <button
          onClick={handleMarkSent}
          disabled={marking}
          style={{
            padding: '9px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 700,
            cursor: marking ? 'not-allowed' : 'pointer',
            backgroundColor: '#fff', color: GREY, border: '1.5px solid #E5E7EB',
          }}
        >
          {marking ? ui.marking : ui.markAsSent}
        </button>
      </div>

      {markError && (
        <p style={{ fontSize: '12px', color: '#DC2626', margin: '10px 0 0 0' }}>{markError}</p>
      )}

      {lastSend && (
        <p style={{ fontSize: '12px', color: '#6B7280', margin: '10px 0 0 0' }}>
          {ui.markedSentAt(formatSentAt(lastSend.markedSentAt, locale))}
          {sendsForThisStep.length > 1 && ui.markedTimes(sendsForThisStep.length)}
        </p>
      )}
    </div>
  );
}

export function OutreachSequence({ match, identity, locale, onLocaleChange, sends, onCopied, onMarkSent }: OutreachSequenceProps) {
  const ui = getOutreachUiStrings(locale);
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
        <span style={labelStyle}>{ui.sendTo}</span>
        {match.handles.length === 0 ? (
          <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>
            {ui.noHandleDetected(match.canonicalName)}
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
                {ui.multipleHandles(match.handles.length)}
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
          <span style={{ ...labelStyle, marginBottom: 0 }}>{ui.yourDetails}</span>
          {/* Language names stay in their own language in both locales — that is
              how a language picker is read, and translating them would make the
              option you cannot currently read the one you have to find. */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['en', 'es'] as const).map((l) => (
              <button
                key={l}
                onClick={() => onLocaleChange(l)}
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
            <label style={labelStyle} htmlFor="outreach-name">{ui.fieldName}</label>
            <input id="outreach-name" style={fieldStyle} value={fields.name} onChange={(e) => setField('name', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle} htmlFor="outreach-handle">{ui.fieldHandle}</label>
            <input id="outreach-handle" style={fieldStyle} value={fields.handle} onChange={(e) => setField('handle', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle} htmlFor="outreach-followers">{ui.fieldFollowers}</label>
            <input id="outreach-followers" style={fieldStyle} value={fields.followers} onChange={(e) => setField('followers', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle} htmlFor="outreach-engagement">{ui.fieldEngagement}</label>
            <input id="outreach-engagement" style={fieldStyle} value={fields.engagement} onChange={(e) => setField('engagement', e.target.value)} />
          </div>
        </div>

        <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '12px 0 0 0' }}>
          {ui.detailsHint}
        </p>
      </div>

      {/* ── The sequence ────────────────────────────────────────────── */}
      <p style={{ fontSize: '13px', color: '#6B7280', margin: '4px 0 0 0' }}>
        {ui.sequenceIntro}
      </p>

      {generated.map((message) => (
        <MessageCard
          key={message.step}
          step={message.step}
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
        {ui.markedDisclaimer}
      </p>
    </div>
  );
}
