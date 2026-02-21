import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function POST(req: NextRequest) {
  try {
    const { creatorId, message, campaignType, budgetRange, timeline, brandId } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
    }

    // Save to database
    const { error } = await supabaseAdmin.from('inquiries').insert({
      brand_id: brandId,
      creator_id: creatorId,
      message: message.trim(),
      campaign_type: campaignType || null,
      budget_range: budgetRange || null,
      timeline: timeline || null,
      status: 'pending',
    });

    if (error) throw error;

    // Get brand profile
    const { data: brandProfile } = await supabaseAdmin
      .from('brand_profiles')
      .select('company_name, contact_name, email, industry')
      .eq('id', brandId)
      .single();

    // Get creator info
    const { data: creatorSummary } = await supabaseAdmin
      .from('v_creator_summary')
      .select('*')
      .eq('creator_id', creatorId)
      .single();

    const creatorHandle = creatorSummary?.instagram_handle ?? creatorSummary?.tiktok_handle ?? 'unknown';
    const creatorName = creatorSummary?.name ?? 'Unknown';
    const creatorFollowers = creatorSummary?.total_followers ?? 0;
    const creatorPlatform = creatorSummary?.instagram_handle ? 'Instagram' : 'TikTok';

    // Send admin notification
    try {
      await transporter.sendMail({
        from: `InfluenceAI <${process.env.GMAIL_USER}>`,
        to: process.env.ADMIN_EMAIL,
        subject: `New Inquiry: ${brandProfile?.company_name} → @${creatorHandle}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #FFD700; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 20px;">New Creator Inquiry</h1>
            </div>
            <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb;">
              <h2 style="color: #FFD700; margin-top: 0;">Brand</h2>
              <p><strong>Company:</strong> ${brandProfile?.company_name}</p>
              <p><strong>Contact:</strong> ${brandProfile?.contact_name || 'Not provided'}</p>
              <p><strong>Email:</strong> ${brandProfile?.email}</p>
              <p><strong>Industry:</strong> ${brandProfile?.industry || 'Not specified'}</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;">
              <h2 style="color: #FFD700;">Creator</h2>
              <p><strong>Handle:</strong> @${creatorHandle}</p>
              <p><strong>Name:</strong> ${creatorName}</p>
              <p><strong>Followers:</strong> ${creatorFollowers.toLocaleString()}</p>
              <p><strong>Platform:</strong> ${creatorPlatform}</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;">
              <h2 style="color: #FFD700;">Inquiry Details</h2>
              <p><strong>Campaign Type:</strong> ${campaignType || 'Not specified'}</p>
              <p><strong>Budget Range:</strong> ${budgetRange || 'Not specified'}</p>
              <p><strong>Timeline:</strong> ${timeline || 'Not specified'}</p>
              <div style="background: white; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb; margin-top: 12px;">
                <p style="margin: 0; color: #374151;">${message}</p>
              </div>
            </div>
            <div style="background: #f3f4f6; padding: 16px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; text-align: center; color: #6b7280; font-size: 14px;">
              <p style="margin: 0;">InfluenceAI Platform</p>
            </div>
          </div>
        `,
      });
    } catch (emailError) {
      console.error('Failed to send admin notification:', emailError);
    }

    // Send confirmation to brand
    try {
      await transporter.sendMail({
        from: `InfluenceAI <${process.env.GMAIL_USER}>`,
        to: brandProfile?.email,
        subject: `Inquiry Confirmed: @${creatorHandle}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #FFD700; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 20px;">Inquiry Received</h1>
            </div>
            <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <p>Hi ${brandProfile?.contact_name || brandProfile?.company_name},</p>
              <p>We've received your inquiry about working with <strong>@${creatorHandle}</strong>.</p>
              <p>Our team will review the details and get back to you within 24 hours.</p>
              <p style="margin-top: 20px;">
                <strong>Campaign Type:</strong> ${campaignType || 'Not specified'}<br>
                <strong>Budget:</strong> ${budgetRange || 'Not specified'}<br>
                <strong>Timeline:</strong> ${timeline || 'Not specified'}
              </p>
              <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
                You can view your inquiries anytime in your 
                <a href="https://influenceai.vercel.app/dashboard" style="color: #FFD700;">dashboard</a>.
              </p>
            </div>
          </div>
        `,
      });
    } catch (emailError) {
      console.error('Failed to send brand confirmation:', emailError);
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('Inquiry API error:', err);
    return NextResponse.json({ error: err.message || 'Failed to submit inquiry.' }, { status: 500 });
  }
}