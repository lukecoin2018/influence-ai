import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function formatNumber(n: number | null): string {
  if (!n) return 'N/A';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toString();
}

function buildCreatorSummary(creator: any, index: number): string {
  const parts: string[] = [];
  parts.push(`Creator #${index + 1}`);
  parts.push(`Handle: @${creator.instagram_handle || creator.tiktok_handle}`);
  parts.push(`Name: ${creator.name || 'Unknown'}`);

  if (creator.instagram_handle) {
    parts.push(`Instagram: ${formatNumber(creator.instagram_followers)} followers, ${creator.instagram_engagement || 'N/A'}% engagement`);
  }
  if (creator.tiktok_handle) {
    parts.push(`TikTok: ${formatNumber(creator.tiktok_followers)} followers, ${creator.tiktok_engagement || 'N/A'}% engagement`);
  }

  const enrichment = creator.instagram_enrichment || creator.tiktok_enrichment;
  if (enrichment) {
    if (enrichment.calculated_engagement_rate) {
      parts.push(`Calculated engagement: ${enrichment.calculated_engagement_rate}%`);
    }
    if (enrichment.posting_frequency_per_week) {
      parts.push(`Posts ${enrichment.posting_frequency_per_week} times per week`);
    }
    if (enrichment.content_mix) {
      const mix = Object.entries(enrichment.content_mix)
        .map(([type, pct]) => `${type}: ${pct}%`)
        .join(', ');
      parts.push(`Content mix: ${mix}`);
    }
    if (enrichment.top_hashtags?.length > 0) {
      parts.push(`Top topics: ${enrichment.top_hashtags.slice(0, 8).join(', ')}`);
    }
    if (enrichment.detected_brands?.length > 0) {
      parts.push(`Has worked with: ${enrichment.detected_brands.join(', ')}`);
    }
    if (enrichment.days_since_last_post !== undefined) {
      parts.push(`Last posted: ${enrichment.days_since_last_post} days ago`);
    }
    if (enrichment.sponsored_posts_count > 0) {
      parts.push(`${enrichment.sponsored_posts_count} sponsored posts detected`);
    }
  }

  const bio = creator.instagram_data?.bio || creator.tiktok_data?.bio || '';
  if (bio) parts.push(`Bio: ${bio.slice(0, 200)}`);

  const category = creator.instagram_data?.category_name;
  if (category && category !== 'null' && category !== 'None') {
    parts.push(`Category: ${category}`);
  }

  return parts.join('\n');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { briefText, platform, minFollowers, maxFollowers, minEngagement, contentTypePref, category } = body;

    if (!briefText || briefText.trim().length < 20) {
      return NextResponse.json({ error: 'Brief must be at least 20 characters.' }, { status: 400 });
    }

    // Step 1: Query candidates
    let query = supabase.from('v_creator_summary').select('*');

    if (platform === 'instagram') {
      query = query.not('instagram_handle', 'is', null);
    } else if (platform === 'tiktok') {
      query = query.not('tiktok_handle', 'is', null);
    }
    if (minFollowers) query = query.gte('total_followers', minFollowers);
    if (maxFollowers) query = query.lte('total_followers', maxFollowers);

    query = query.order('total_followers', { ascending: false }).limit(100);

    const { data: rawCandidates, error } = await query;
    if (error) throw error;

    let candidates = rawCandidates ?? [];

    // Filter by engagement
    if (minEngagement) {
      candidates = candidates.filter((c: any) =>
        (c.instagram_engagement && c.instagram_engagement >= minEngagement) ||
        (c.tiktok_engagement && c.tiktok_engagement >= minEngagement)
      );
    }

    // Filter by content type preference
    if (contentTypePref && contentTypePref !== 'any') {
      const enrichedWithPref = candidates.filter((c: any) => {
        const enrichment = c.instagram_enrichment || c.tiktok_enrichment;
        if (!enrichment?.content_mix) return true; // keep if no data
        const mix = enrichment.content_mix;
        if (contentTypePref === 'reels') {
          return (mix.Video || 0) + (mix.Reel || 0) > 50;
        }
        if (contentTypePref === 'photos') {
          return (mix.Image || 0) + (mix.Photo || 0) > 50;
        }
        return true;
      });
      if (enrichedWithPref.length >= 10) candidates = enrichedWithPref;
    }

    // Prioritize enriched creators
    const enriched = candidates.filter((c: any) => c.instagram_enrichment || c.tiktok_enrichment);
    const notEnriched = candidates.filter((c: any) => !c.instagram_enrichment && !c.tiktok_enrichment);
    candidates = [...enriched, ...notEnriched].slice(0, 30);

    if (candidates.length === 0) {
      return NextResponse.json({ error: 'No creators match your filters. Try broadening your search.' }, { status: 404 });
    }

    // Step 2: Build summaries
    const creatorSummaries = candidates.map((c: any, i: number) => buildCreatorSummary(c, i)).join('\n\n---\n\n');

    // Step 3: Call Claude API
    const prompt = `You are a creator matching expert for an influencer marketing platform. A brand has submitted a brief describing their campaign needs. Your job is to evaluate a list of creators and select the top 10 best matches, ranked by fit.

BRAND BRIEF:
${briefText}

CREATOR CANDIDATES (${candidates.length} total):
${creatorSummaries}

Evaluate each creator against the brief. Consider:
- Content style and niche alignment
- Engagement quality (calculated rates when available are more reliable)
- Audience size fit for the campaign
- Previous brand partnerships (shows experience)
- Posting frequency and activity
- Content mix (reels vs photos vs carousels)
- Any signals from hashtags or bio

Return ONLY a valid JSON object in this exact format, no other text:
{
  "summary": "2-3 sentence overall summary of the match results and what you found",
  "matches": [
    {
      "creator_index": 1,
      "score": 94,
      "explanation": "2-4 sentences explaining specifically why this creator is a strong match for this brief. Reference specific data points like their hashtags, engagement rate, content mix, or brand history."
    }
  ]
}

Return exactly 10 matches (or fewer if fewer candidates exist). creator_index is the number shown in the creator summary (1-based). Score is 0-100.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const claudeData = await response.json();
    const resultText = claudeData.content[0].text;

    let matchResults;
    try {
      matchResults = JSON.parse(resultText);
    } catch {
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        matchResults = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse Claude response as JSON');
      }
    }

    // Step 4: Map back to creators
    const rankedResults = matchResults.matches.map((match: any) => {
      const creator = candidates[match.creator_index - 1];
      if (!creator) return null;
      return {
        creator_id: creator.creator_id,
        handle: creator.instagram_handle || creator.tiktok_handle,
        name: creator.name,
        instagram_handle: creator.instagram_handle,
        tiktok_handle: creator.tiktok_handle,
        instagram_followers: creator.instagram_followers,
        tiktok_followers: creator.tiktok_followers,
        total_followers: creator.total_followers,
        instagram_engagement: creator.instagram_engagement,
        tiktok_engagement: creator.tiktok_engagement,
        score: match.score,
        explanation: match.explanation,
        enrichment: creator.instagram_enrichment || creator.tiktok_enrichment,
      };
    }).filter(Boolean);

    // Step 5: Save brief
    await supabase.from('campaign_briefs').insert({
      brief_text: briefText,
      platform: platform || null,
      min_followers: minFollowers || null,
      max_followers: maxFollowers || null,
      min_engagement: minEngagement || null,
      content_type_pref: contentTypePref || null,
      category: category || null,
      matched_creators: rankedResults,
      candidates_count: candidates.length,
    });

    return NextResponse.json({
      matches: rankedResults,
      summary: matchResults.summary,
      candidatesEvaluated: candidates.length,
    });

  } catch (err: any) {
    console.error('Match API error:', err);
    return NextResponse.json({ error: err.message || 'Matching failed. Please try again.' }, { status: 500 });
  }
}