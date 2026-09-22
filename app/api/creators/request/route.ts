import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { createElement } from 'react';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { withNoStore } from '@/lib/http/no-store';
import { sendEmail, SITE_URL, maskEmail } from '@/lib/email/client';
import { RequestReceived, requestReceivedSubject } from '@/lib/email/templates/RequestReceived';
import { CreatorRequestNotice, creatorRequestNoticeSubject } from '@/lib/email/templates/CreatorRequestNotice';
import {
  NOTE_MAX_LENGTH,
  isValidRequestEmail,
  isValidRequestHandle,
  normalizeRequestEmail,
  normalizeRequestHandle,
  normalizeRequestNote,
  normalizeSource,
} from '@/lib/creator-requests/shared';

/**
 * "Add me to the database" — public, no session.
 *
 * The counterpart to /api/creators/claim: that route serves a creator we have
 * already scraped, this one serves a creator we have not. Until now the second
 * case dead-ended in a form that said "we'll add you and notify you when your
 * profile is ready", which was not true in either half.
 *
 * ── SHAPE ──────────────────────────────────────────────────────────────────
 *
 *   { platform, handle, email, note?, source?, website? }
 *
 * `website` is the honeypot — a field no human sees. Anything in it is
 * answered 200 with nothing written, so a bot gets the same response a person
 * gets. Same trick app/contact/page.tsx already uses.
 *
 * Every response carries a machine-readable `reason`, and the client keys off
 * that rather than the prose (CLAUDE.md, "Localization"): the bodies here are
 * English and the form is bilingual. Note in particular that "this handle is
 * already in the database" is a 200, not an error — it is a successful check
 * with a useful answer, and the client must not treat it as a failure.
 *
 * ── RATE LIMIT ─────────────────────────────────────────────────────────────
 *
 * Three per hour per client IP, counted from creator_requests.ip_hash rather
 * than held in memory: this runs on Vercel (many lambdas) and on the VPS (one
 * long-lived process), and an in-memory counter would mean something different
 * on each. The IP is hashed, never stored.
 *
 * If there is no forwarding header at all, the limit is SKIPPED for that
 * request and the fact is logged once per process. The alternative — bucketing
 * every headerless request under one shared key — would let a single bot with
 * a stripped header lock out every other creator in that situation.
 */

const RATE_LIMIT_PER_HOUR = 3;
const RATE_WINDOW_MS = 60 * 60 * 1000;

type Reason =
  | 'invalid_platform'
  | 'handle_required'
  | 'handle_invalid'
  | 'email_required'
  | 'email_invalid'
  | 'note_too_long'
  | 'rate_limited'
  | 'already_listed'
  | 'already_requested'
  | 'received'
  | 'insert_failed';

export const POST = withNoStore(handlePOST);

/** Logged once per process, not once per request — see the header. */
let loggedMissingClientIp = false;

/**
 * First entry of x-forwarded-for, else x-real-ip, else null.
 *
 * The FIRST entry, because the header is a chain and every proxy appends: the
 * last entry is our own edge. Both Vercel and Webuzo's nginx set
 * x-forwarded-for; x-real-ip is the nginx fallback.
 */
function clientIpHash(req: NextRequest): string | null {
  const forwarded = req.headers.get('x-forwarded-for');
  const first = forwarded?.split(',')[0]?.trim();
  const ip = first || req.headers.get('x-real-ip')?.trim() || null;

  if (!ip) {
    if (!loggedMissingClientIp) {
      loggedMissingClientIp = true;
      console.error(
        '[creator-request] no x-forwarded-for or x-real-ip on the request — ' +
        'the per-IP submission limit is being SKIPPED. Logged once per process.',
      );
    }
    return null;
  }

  return createHash('sha256').update(ip).digest('hex');
}

async function handlePOST(req: NextRequest) {
  const body = await req.json().catch(() => ({}) as Record<string, unknown>);

  // ── Honeypot ────────────────────────────────────────────────────────────
  // Before validation, so a bot learns nothing from which field it got wrong.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return NextResponse.json({ received: true, reason: 'received' satisfies Reason }, { status: 201 });
  }

  // ── Validation ──────────────────────────────────────────────────────────
  // Instagram only. The form's TikTok option is disabled; this is what makes
  // that a rule rather than a suggestion, since the form is not the only thing
  // that can POST here.
  const platform = typeof body.platform === 'string' ? body.platform : 'instagram';
  if (platform !== 'instagram') {
    return NextResponse.json(
      { error: 'Instagram only for now', reason: 'invalid_platform' satisfies Reason },
      { status: 400 },
    );
  }

  const handle = normalizeRequestHandle(body.handle);
  if (!handle) {
    return NextResponse.json({ error: 'Handle is required', reason: 'handle_required' satisfies Reason }, { status: 400 });
  }
  if (!isValidRequestHandle(handle)) {
    return NextResponse.json({ error: 'Handle is not valid', reason: 'handle_invalid' satisfies Reason }, { status: 400 });
  }

  const email = normalizeRequestEmail(body.email);
  if (!email) {
    return NextResponse.json({ error: 'Email is required', reason: 'email_required' satisfies Reason }, { status: 400 });
  }
  if (!isValidRequestEmail(email)) {
    return NextResponse.json({ error: 'Email is not valid', reason: 'email_invalid' satisfies Reason }, { status: 400 });
  }

  // Rejected rather than silently truncated: the creator wrote it and should
  // know it did not all arrive. normalizeRequestNote() caps as a second line
  // of defence for any other caller.
  if (typeof body.note === 'string' && body.note.trim().length > NOTE_MAX_LENGTH) {
    return NextResponse.json({ error: 'Note is too long', reason: 'note_too_long' satisfies Reason }, { status: 400 });
  }
  const note = normalizeRequestNote(body.note);
  const source = normalizeSource(typeof body.source === 'string' ? body.source : null);

  const admin = createSupabaseAdminClient();

  // ── Already in the database? ────────────────────────────────────────────
  // Checked BEFORE the rate limit and before any write: a creator who is
  // already listed should be sent to their claim page, not counted against a
  // quota or added to a queue that has nothing to do.
  //
  // RLS is bypassed by the service-role client, and social_profiles' policy
  // filters to status = 'active' (CLAUDE.md, "Database"). Not replicated here
  // on purpose: a creator whose scraped record is inactive IS in the database,
  // and telling them "we don't have you" would invite a duplicate scrape. The
  // claim page they are sent to does its own resolution.
  const { data: existing } = await admin
    .from('social_profiles')
    .select('creator_id')
    .eq('handle', handle)
    .eq('platform', platform)
    .limit(1)
    .maybeSingle();

  if (existing?.creator_id) {
    return NextResponse.json(
      {
        exists: true,
        reason: 'already_listed' satisfies Reason,
        // The NORMALIZED handle, so the page can say "@thishandle is already
        // here" using the form the database actually holds rather than
        // re-deriving it from what was typed.
        handle,
        claimUrl: `${SITE_URL}/claim/${encodeURIComponent(handle)}`,
      },
      { status: 200 },
    );
  }

  // ── Rate limit ──────────────────────────────────────────────────────────
  const ipHash = clientIpHash(req);
  if (ipHash) {
    const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
    const { count, error: countError } = await admin
      .from('creator_requests')
      .select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .gt('created_at', since);

    // Fail OPEN on a counting error. The limit is abuse control, not a
    // security boundary, and a database hiccup must not stop a real creator
    // from asking to be listed.
    if (countError) {
      console.error(`[creator-request] rate-limit count failed, allowing: ${countError.message}`);
    } else if ((count ?? 0) >= RATE_LIMIT_PER_HOUR) {
      return NextResponse.json(
        { error: 'Too many requests', reason: 'rate_limited' satisfies Reason },
        { status: 429 },
      );
    }
  }

  // ── Insert ──────────────────────────────────────────────────────────────
  const { data: inserted, error: insertError } = await admin
    .from('creator_requests')
    .insert({ platform, handle, email, note, source, ip_hash: ipHash })
    .select('id')
    .maybeSingle();

  if (insertError) {
    // 23505 = the partial unique index on (platform, handle) WHERE status =
    // 'new'. Someone already has an open request for this handle — possibly
    // this same creator, possibly not. Answered as success with its own
    // reason, and NO email: it is the one branch that could otherwise be
    // driven to mail an address repeatedly.
    if (insertError.code === '23505') {
      return NextResponse.json(
        { received: true, alreadyRequested: true, reason: 'already_requested' satisfies Reason },
        { status: 200 },
      );
    }
    console.error(`[creator-request] insert failed for @${handle}: ${insertError.message}`);
    return NextResponse.json({ error: 'Could not save the request', reason: 'insert_failed' satisfies Reason }, { status: 500 });
  }

  // ── Mail, after the write has committed ─────────────────────────────────
  // Neither send can fail the request: the row is what matters and it is
  // already saved (CLAUDE.md, "Email"). sendEmail() never throws; the outcomes
  // are logged and reported back for the smoke test, never surfaced to the
  // creator as an error.
  const toCreator = await sendEmail({
    to: email,
    subject: requestReceivedSubject(handle),
    react: createElement(RequestReceived, { handle }),
    replyTo: process.env.ADMIN_EMAIL,
    tags: [{ name: 'type', value: 'request_received' }],
  });

  const adminTo = process.env.ADMIN_EMAIL;
  let toAdmin: { ok: true; id: string } | { ok: false; error: string };
  if (!adminTo) {
    console.error('[creator-request] ADMIN_EMAIL unset; no notification sent');
    toAdmin = { ok: false, error: 'admin_email_unset' };
  } else {
    toAdmin = await sendEmail({
      to: adminTo,
      subject: creatorRequestNoticeSubject(handle),
      react: createElement(CreatorRequestNotice, { handle, email, source, note }),
      // Answering the notification from the admin inbox reaches the creator,
      // the same arrangement /api/inquiries uses.
      replyTo: email,
      tags: [{ name: 'type', value: 'creator_request_notice' }],
    });
  }

  console.log(
    `[creator-request] @${handle} from ${source} to ${maskEmail(email)} — ` +
    `creator=${toCreator.ok ? 'sent' : `failed:${toCreator.error}`} admin=${toAdmin.ok ? 'sent' : `failed:${toAdmin.error}`}`,
  );

  return NextResponse.json(
    {
      received: true,
      reason: 'received' satisfies Reason,
      id: inserted?.id,
      email: {
        creator: toCreator.ok ? 'sent' : 'failed',
        ...(toCreator.ok ? { creatorId: toCreator.id } : {}),
        admin: toAdmin.ok ? 'sent' : 'failed',
        ...(toAdmin.ok ? { adminId: toAdmin.id } : {}),
      },
    },
    { status: 201 },
  );
}
