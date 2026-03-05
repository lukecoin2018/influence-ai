import { createSupabaseServerClient } from './supabase-server';

// ─── Token costs (single source of truth) ────────────────────────────────────
export const TOKEN_COSTS = {
  directory_page_view:    5,
  creator_profile_view:   3,
  ai_match:              20,
  budget_calculator:     10,
  campaign_brief:        25,
  negotiation_assistant: 20,
  contract_builder:      15,
  send_inquiry:           5,
  compare:                3,  // counts as a profile view
} as const;

export type TokenAction = keyof typeof TOKEN_COSTS;

// ─── Free allowances (lifetime, not monthly) ──────────────────────────────────
export const FREE_ALLOWANCES = {
  directory_pages: 10,
  profile_views:    5,
} as const;

// ─── Get current token balance ────────────────────────────────────────────────
export async function getTokenBalance(userId: string): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('brand_profiles')
    .select('token_balance')
    .eq('id', userId)
    .single();

  return data?.token_balance ?? 0;
}

// ─── Check if user has enough tokens ─────────────────────────────────────────
export async function hasTokens(userId: string, required: number): Promise<boolean> {
  const balance = await getTokenBalance(userId);
  return balance >= required;
}

// ─── Deduct tokens and log the transaction ────────────────────────────────────
export async function spendTokens(
  userId: string,
  action: TokenAction,
  metadata?: Record<string, unknown>
): Promise<{ success: boolean; balance: number; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const amount = TOKEN_COSTS[action];

  // Get current balance
  const { data: profile } = await supabase
    .from('brand_profiles')
    .select('token_balance')
    .eq('id', userId)
    .single();

  const currentBalance = profile?.token_balance ?? 0;

  if (currentBalance < amount) {
    return {
      success: false,
      balance: currentBalance,
      error: 'Insufficient tokens',
    };
  }

  const newBalance = currentBalance - amount;

  // Deduct tokens
  const { error: updateError } = await supabase
    .from('brand_profiles')
    .update({ token_balance: newBalance })
    .eq('id', userId);

  if (updateError) {
    return { success: false, balance: currentBalance, error: updateError.message };
  }

  // Log transaction
  await supabase.from('token_transactions').insert({
    user_id: userId,
    action,
    tokens_delta: -amount,
    balance_after: newBalance,
    metadata: metadata ?? {},
  });

  return { success: true, balance: newBalance };
}

// ─── Check free allowance and increment counter ───────────────────────────────
// Returns withinFree: true if this usage was covered by the free allowance
// Returns withinFree: false if the user has exhausted their free allowance
export async function checkFreeAllowance(
  userId: string,
  type: 'directory_pages' | 'profile_views'
): Promise<{ withinFree: boolean; used: number; limit: number }> {
  const supabase = await createSupabaseServerClient();
  const column = type === 'directory_pages' ? 'directory_pages_used' : 'profile_views_used';
  const limit = FREE_ALLOWANCES[type];

  const { data } = await supabase
    .from('brand_profiles')
    .select(column)
    .eq('id', userId)
    .single();

  const used = (data as Record<string, number> | null)?.[column] ?? 0;

  if (used < limit) {
    // Still within free allowance — increment counter
    await supabase
      .from('brand_profiles')
      .update({ [column]: used + 1 })
      .eq('id', userId);

    return { withinFree: true, used: used + 1, limit };
  }

  return { withinFree: false, used, limit };
}

// ─── Combined helper: check free allowance, then spend tokens if needed ───────
// Use this for directory pages and profile views.
// Returns: { allowed, withinFree, balance, error }
export async function checkAndChargeAccess(
  userId: string,
  type: 'directory_pages' | 'profile_views'
): Promise<{
  allowed: boolean;
  withinFree: boolean;
  balance: number;
  used: number;
  limit: number;
  error?: string;
}> {
  const allowance = await checkFreeAllowance(userId, type);

  if (allowance.withinFree) {
    const balance = await getTokenBalance(userId);
    return { allowed: true, balance, ...allowance };
  }

  // Past free allowance — spend tokens
  const action: TokenAction =
    type === 'directory_pages' ? 'directory_page_view' : 'creator_profile_view';

  const result = await spendTokens(userId, action);

  return {
    allowed: result.success,
    withinFree: false,
    balance: result.balance,
    used: allowance.used,
    limit: allowance.limit,
    error: result.error,
  };
}
