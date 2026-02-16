import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

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

async function embedBrief(briefText: string, filters: any): Promise<number[]> {
  let searchText = briefText;
  const extras: string[] = [];
  if (filters.platform) extras.push(`Platform: ${filters.platform}`);
  if (filters.minFollowers) extras.push(`Min followers: ${formatNumber(filters.minFollowers)}`);
  if (filters.maxFollowers) extras.push(`Max followers: ${formatNumber(filters.maxFollowers)}`);
  if (filters.minEngagement) extras.push(`Min engagement: ${filters.minEngagement}%`);
  if (extras.length > 0) searchText += '\n' + extras.join('. ');

  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: searchText,
  });
  return response.data[0].embedding;
}

async function vectorSearch(briefText: string, filters: any, limit: number = 50): Promise<any[]> {
  try {
    const briefEmbedding = await embedBrief(briefText, filters);
    const vectorString = `[${briefEmbedding.join(',')}]`;

    const { data: matches, error } = await supabase.rpc('match_creators', {
      query_embedding: vectorString,
      match_count: limit,
      similarity_threshold: 0.3,
    });

    if (error || !matches?.length) {
      console.log('Vector search failed or no results:', error);
      return [];
    }

    const creatorIds = matches.map((m: any) => m.creator_id);
    const { data: creators } = await supabase
      .from('v_creator_summary')
      .select('*')
      .in('creator_id', creatorIds);

    if (!creators) return [];

    const scoredCreators = creators.map((c: any) => {
      const match = matches.find((m: any) => m.creator_id === c.creator_id);
      return { ...c, similarity_score: match?.similarity || 0 };
    });

    scoredCreators.sort((a: any, b: any) => b.similarity_score - a.similarity_score);
    return scoredCreators;
  } catch (err) {
    console.log('Vector search error:', err);
    return [];
  }
}

async function structuredFilter(filters: any): Promise<any[]> {
  let query = supabase.from('v_creator_summary').select('*');

  if (filters.platform === 'instagram') {
    query = query.not('instagram_handle', 'is', null);
  } else if (filters.platform === 'tiktok') {
    query = query.not('tiktok_handle', 'is', null);
  }
  if (filters.minFollowers) query = query.gte('total_followers', filters.minFollowers);
  if (filters.maxFollowers) query = query.lte('total_followers', filters.maxFollowers);

  query = query.order('total_followers', { ascending: false }).limit(50);
  const { data } = await query;
  return data || [];
}

async function findCandidates(briefText: string, filters: any): Promise<any[]> {
  // Try vector search first
  let candidates = await vectorSearch(briefText, filters, 50);

  // Fall back to structured filtering if not enough results
  if (candidates.length < 10) {
    console.log('Falling back to structured filtering');
    candidates = await structuredFilter(filters);
  }

  // Apply hard filters on top of vector results
  if (filters.platform) {
    candidates = candidates.filter((c: any) => {
      if (filters.platform === 'instagram') return c.instagram_handle;
      if (filters.platform === 'tiktok') return c.tiktok_handle;
      return true;
    });
  }
  if (filters.minFollowers) {
    candidates = candidates.filter((c: any) => c.total_followers >= filters.minFollowers);
  }
  if (filters.maxFollowers) {
    candidates = candidates.filter((c: any) => c.total_followers <= filters.maxFollowers);
  }
  if (filters.minEngagement) {
    candidates = candidates.filter((c: any) => {
      const eng = c.instagram_engagement || c.tiktok_engagement || 0;
      return eng >= filters.minEngagement;
    });
  }

  // Prioritize enriched creators
  const enriched = candidates.filter((c: any) => c.instagram_enrichment || c.tiktok_enrichment);
  const notEnriched = candidates.filter((c: any) => !c.instagram_enrichment && !c.tiktok_enrichment);
  return [...enriched, ...notEnriched].slice(0, 30);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { briefText, platform, minFollowers, maxFollowers, minEngagement, contentTypePref, category, brandId } = body;

    if (!briefText || briefText.trim().length < 20) {
      return NextResponse.json({ error: 'Brief must be at least 20 characters.' }, { status: 400 });
    }

    const filters = { platform, minFollowers, maxFollowers, minEngagement, contentTypePref };

    // Find candidates using vector search + fallback
    const candidates = await findCandidates(briefText, filters);

    if (candidates.length === 0) {
      return NextResponse.json({ error: 'No creators match your filters. Try broadening your search.' }, { status: 404 });
    }

    // Build summaries for Claude
    const creatorSummaries = candidates.map((c: any, i: number) => buildCreatorSummary(c, i)).join('\n\n---\n\n');

    // Call Claude API
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

    if (!response.ok) throw new Error(`Claude API error: ${response.status}`);

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

    // Save brief
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
      brand_id: body.brandId || null,
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