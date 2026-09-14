import { Resend } from 'resend';
import { render } from '@react-email/components';
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

/**
 * Canonical origin for absolute links in email. NEXT_PUBLIC_SITE_URL is the
 * name the checkout routes already read (app/api/checkout/*), unset locally on
 * purpose so those fall back to the request origin; mail has no request to
 * fall back to, so it falls back to production.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://influenceit.app').replace(/\/+$/, '');

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
    // Resend SDK dynamic-import @react-email/render itself, and npm nests that
    // package under @react-email/components where the SDK cannot resolve it —
    // the smoke test failed with "Failed to render React component" on
    // 2026-09-14. Rendering here removes the dependency on hoisting.
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
