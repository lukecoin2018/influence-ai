import { Resend } from 'resend';
import { render } from 'react-email';
import type { ReactElement } from 'react';

/**
 * The one transactional mail sender.
 *
 * Provider is Resend over its HTTP API (domain influenceit.app verified in
 * Resend, eu-west-1, 2026-09-14). Never SMTP: the previous transport was
 * nodemailer over a Gmail app password, which caps around 500 a day and lands
 * in spam for anyone who is not us.
 *
 * Two env vars: RESEND_API_KEY and EMAIL_FROM (`InfluenceIT
 * <noreply@influenceit.app>`). Both are set in .env.local, the VPS .env and
 * Vercel. If either is missing, sendEmail() reports `email_not_configured`
 * rather than throwing — a caller that has just written to the database must
 * never lose that write to a mail problem.
 *
 * Deliberately no `import 'server-only'`: scripts/email-smoke.ts (a throwaway
 * used to prove delivery) runs this under tsx, where that package throws. The
 * secret is read from process.env inside a function, so nothing here leaks
 * into a client bundle unless a 'use client' file imports it, which none does.
 */

const SITE_URL_FALLBACK = 'https://influenceit.app';

/**
 * Canonical origin for absolute links in email. NEXT_PUBLIC_SITE_URL is the
 * name the checkout routes already read (app/api/checkout/*), unset locally on
 * purpose so those fall back to the request origin; mail has no request to
 * fall back to, so it falls back to production.
 *
 * Validated, not trusted. On 2026-09-14 the VPS process carried a malformed
 * value (two .env lines run together) and the approval email linked to
 * `https://influenceit.appadmin_user_id=…/creator-dashboard`. The value is
 * accepted only if it parses, is https, is a bare origin (path `/`, no query
 * or fragment) and its host is influenceit.app or a subdomain of it — the
 * host rule is what actually catches the run-together case, since
 * `https://influenceit.appadmin_user_id=x` is a syntactically valid URL with
 * pathname `/`. Anything else logs once and falls back to production.
 */
export function resolveSiteUrl(raw: string | undefined = process.env.NEXT_PUBLIC_SITE_URL): string {
  if (!raw) return SITE_URL_FALLBACK;
  try {
    const u = new URL(raw);
    const hostOk = u.hostname === 'influenceit.app' || u.hostname.endsWith('.influenceit.app');
    if (u.protocol === 'https:' && u.pathname === '/' && u.search === '' && u.hash === '' && hostOk) {
      return u.origin;
    }
  } catch {
    // fall through: not parseable
  }
  console.error('[email] NEXT_PUBLIC_SITE_URL invalid, using fallback');
  return SITE_URL_FALLBACK;
}

export const SITE_URL = resolveSiteUrl();

let resend: Resend | null = null;

/** Lazily constructs the SDK client once per module scope. Never throws at import. */
export function getResend(): Resend | null {
  if (resend) return resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  resend = new Resend(key);
  return resend;
}

export type SendEmailOptions = {
  to: string;
  subject: string;
  react: ReactElement;
  replyTo?: string;
  tags?: { name: string; value: string }[];
};

export type SendEmailResult = { ok: true; id: string } | { ok: false; error: string };

/**
 * `a***@domain` — enough to recognise a recipient in a log line, not enough to
 * reconstruct the address. Logs on the VPS are world-readable to anyone with a
 * shell on that box.
 */
export function maskEmail(address: string): string {
  const at = address.indexOf('@');
  if (at <= 0) return '***';
  return `${address[0]}***@${address.slice(at + 1)}`;
}

/**
 * Sends one email. Never throws; every failure comes back as `{ ok: false }`
 * with one `[email]` console.error so the caller can record the outcome and
 * carry on.
 */
export async function sendEmail(opts: SendEmailOptions): Promise<SendEmailResult> {
  const from = process.env.EMAIL_FROM;
  const client = getResend();
  const tagSummary = (opts.tags ?? []).map((t) => `${t.name}=${t.value}`).join(' ') || 'untagged';

  if (!client || !from) {
    console.error(`[email] not configured (${!client ? 'RESEND_API_KEY' : 'EMAIL_FROM'} unset); ${tagSummary} to ${maskEmail(opts.to)} not sent`);
    return { ok: false, error: 'email_not_configured' };
  }

  try {
    // Both bodies rendered here, not by the SDK. Passing `react` makes the
    // Resend SDK dynamic-import @react-email/render itself, and when that
    // package was nested under @react-email/components the SDK could not
    // resolve it — the smoke test failed with "Failed to render React
    // component" on 2026-09-14. The components now come from `react-email`
    // (2026-09-16, the @react-email/* packages were deprecated on npm) and
    // `render` is re-exported from it; rendering here still keeps the send
    // independent of how npm happens to hoist that package.
    const [html, text] = await Promise.all([
      render(opts.react),
      render(opts.react, { plainText: true }),
    ]);
    const { data, error } = await client.emails.send({
      from,
      to: opts.to,
      subject: opts.subject,
      html,
      text,
      replyTo: opts.replyTo,
      tags: opts.tags,
    });
    if (error || !data) {
      const message = error?.message ?? 'no id returned';
      console.error(`[email] send failed; ${tagSummary} to ${maskEmail(opts.to)}: ${message}`);
      return { ok: false, error: message };
    }
    return { ok: true, id: data.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[email] send threw; ${tagSummary} to ${maskEmail(opts.to)}: ${message}`);
    return { ok: false, error: message };
  }
}
