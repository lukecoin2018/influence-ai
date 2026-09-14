// Place at: app/api/inquiries/route.ts (replace existing file)

import { NextRequest, NextResponse } from 'next/server';
import { createElement } from 'react';
import { createClient } from '@supabase/supabase-js';
import { grantCreatorTokens } from '@/lib/tokens';
import { requireApprovedBrand } from '@/lib/auth/api-guards';
import { withNoStore } from '@/lib/http/no-store';
import { sendEmail, SITE_URL } from '@/lib/email/client';
import { BrandInquiry, brandInquirySubject } from '@/lib/email/templates/BrandInquiry';
import { BrandInquiryConfirmation, brandInquiryConfirmationSubject } from '@/lib/email/templates/BrandInquiryConfirmation';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Both emails below go through lib/email/client.ts (Resend). They used to go
// over a Gmail app password via nodemailer; that transport and its
// GMAIL_USER / GMAIL_APP_PASSWORD env vars are gone. sendEmail never throws,
// so the try/catch around each send is belt-and-braces, kept so the two
// outcomes stay logged under their original messages.

// Reads a session, so it carries no-store by construction. See
// lib/http/no-store.ts.
export const POST = withNoStore(handlePOST);

/**
 * Brand → creator inquiry.
 *
 * Was unauthenticated, and took `brandId` from the request body and trusted it.
 * So an anonymous caller could file inquiries attributed to any brand, mint 15
 * creator tokens through the earn event below, and send two emails from our
 * Gmail account — per request, unthrottled. It returned no creator data, so
 * this was forgery and abuse rather than exfiltration, but the writes and the
 * mail were real.
 *
 * brandId now comes from the validated session and the body's value is ignored.
 * Same correction the claim route made when it stopped trusting detectedEmail.
 */
async function handlePOST(req: NextRequest) {
  const gate = await requireApprovedBrand();
  if ('error' in gate) return gate.error;

  try {
    const { creatorId, message, campaignType, budgetRange, timeline } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required.', reason: 'message_required' }, { status: 400 });
    }

    // Save inquiry to database
    const { error } = await supabaseAdmin.from('inquiries').insert({
      brand_id: gate.brandId,
      creator_id: creatorId,
      message: message.trim(),
      campaign_type: campaignType || null,
      budget_range: budgetRange || null,
      timeline: timeline || null,
      status: 'pending',
    });

    if (error) throw error;

    // ── Earn event: first inquiry received (15 tokens, one-time) ─────────────
    // creatorId here is the social_profiles.creator_id UUID.
    // We need the creator_profiles.id which equals auth.uid() for the token balance.
    // creator_profiles has a creator_id FK → find the matching row.
    try {
      const { data: creatorProfile } = await supabaseAdmin
        .from('creator_profiles')
        .select('id, earned_first_inquiry, token_balance')
        .eq('creator_id', creatorId)
        .maybeSingle();

      if (creatorProfile && !creatorProfile.earned_first_inquiry) {
        // Mark flag first to prevent race conditions
        await supabaseAdmin
          .from('creator_profiles')
          .update({ earned_first_inquiry: true })
          .eq('id', creatorProfile.id);

        // Grant 15 tokens and log the transaction
        await grantCreatorTokens(
          creatorProfile.id,
          15,
          'earn_first_inquiry',
          { triggered_by: 'inquiry_received', creator_id: creatorId }
        );
      }
    } catch (earnError) {
      // Earn event failed silently — inquiry was already saved successfully
      console.error('Failed to grant first inquiry tokens:', earnError);
    }

    // ── Fetch profiles for email notifications ────────────────────────────────
    const { data: brandProfile } = await supabaseAdmin
      .from('brand_profiles')
      .select('company_name, contact_name, email, industry')
      .eq('id', gate.brandId)
      .single();

    const { data: creatorSummary } = await supabaseAdmin
      .from('v_creator_summary')
      .select('*')
      .eq('creator_id', creatorId)
      .single();

    const creatorHandle = creatorSummary?.instagram_handle ?? creatorSummary?.tiktok_handle ?? 'unknown';
    const creatorName = creatorSummary?.name ?? 'Unknown';
    const creatorFollowers = creatorSummary?.total_followers ?? 0;
    const creatorPlatform = creatorSummary?.instagram_handle ? 'Instagram' : 'TikTok';

    // ── Admin notification email ──────────────────────────────────────────────
    // Reply-To is the inquirer, so answering from the admin inbox reaches the
    // brand directly.
    try {
      const adminTo = process.env.ADMIN_EMAIL;
      if (!adminTo) {
        console.error('Failed to send admin notification: ADMIN_EMAIL unset');
      } else {
        const sent = await sendEmail({
          to: adminTo,
          subject: brandInquirySubject(brandProfile?.company_name, creatorHandle),
          react: createElement(BrandInquiry, {
            companyName: brandProfile?.company_name,
            contactName: brandProfile?.contact_name,
            brandEmail: brandProfile?.email,
            industry: brandProfile?.industry,
            creatorHandle,
            creatorName,
            creatorFollowers,
            creatorPlatform,
            campaignType,
            budgetRange,
            timeline,
            message: message.trim(),
          }),
          replyTo: brandProfile?.email ?? undefined,
          tags: [{ name: 'type', value: 'brand_inquiry' }],
        });
        if (!sent.ok) console.error('Failed to send admin notification:', sent.error);
      }
    } catch (emailError) {
      console.error('Failed to send admin notification:', emailError);
    }

    // ── Brand confirmation email ──────────────────────────────────────────────
    try {
      if (!brandProfile?.email) {
        console.error('Failed to send brand confirmation: no email on brand_profiles row');
      } else {
        const sent = await sendEmail({
          to: brandProfile.email,
          subject: brandInquiryConfirmationSubject(creatorHandle),
          react: createElement(BrandInquiryConfirmation, {
            greetingName: brandProfile.contact_name || brandProfile.company_name,
            creatorHandle,
            campaignType,
            budgetRange,
            timeline,
            dashboardUrl: `${SITE_URL}/dashboard`,
          }),
          tags: [{ name: 'type', value: 'brand_inquiry_confirmation' }],
        });
        if (!sent.ok) console.error('Failed to send brand confirmation:', sent.error);
      }
    } catch (emailError) {
      console.error('Failed to send brand confirmation:', emailError);
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    // The message stays in the server log and out of the response. It used to
    // be returned verbatim, which is how a brand ended up reading
    // "Could not find the 'status' column of 'brand_profiles' in the schema
    // cache" during signup. Database errors describe our schema, and the client
    // keys off `reason` rather than prose in any case.
    console.error('Inquiry API error:', err);
    return NextResponse.json(
      { error: 'Failed to submit inquiry.', reason: 'inquiry_failed' },
      { status: 500 },
    );
  }
}
