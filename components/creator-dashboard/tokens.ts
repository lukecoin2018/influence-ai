"use client";

// components/creator-dashboard/tokens.ts
//
// The creator's token balance and plan, read ONCE per dashboard shell and
// handed to both the desktop sidebar token box and the mobile top-bar pill /
// Profile sheet as props. It used to live inside Sidebar.tsx; it moved here
// so that the mobile chrome could show the same number without opening a
// second realtime channel — the two are mounted at the same time (the
// stylesheet decides which one is visible), so a hook called from each would
// have doubled the subscription.

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export interface CreatorTokens {
  /** null until the first fetch resolves — or forever, when the signed-in user has no creator_profiles row (the admin preview). */
  tokenBalance: number | null;
  subscriptionTier: string;
}

/**
 * English in both locales, along with the rest of the token/plan chrome.
 * Tokens exist to gate the five English tools, so the token chrome belongs with
 * them. That is also why `TIER_LABELS[tier] + " Plan"` needs no string key: the
 * concatenation's baked-in English word order never has to survive a
 * translation, because it is never translated.
 */
export const TIER_LABELS: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  active: "Active",
};

export function isPaidTier(tier: string): boolean {
  return Boolean(tier) && tier !== "free";
}

export function useCreatorTokens(user: User | null): CreatorTokens {
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [subscriptionTier, setSubscriptionTier] = useState<string>("free");

  // Fetch creator token balance + subscription tier + realtime subscription
  useEffect(() => {
    if (!user) return;

    // Initial fetch
    supabase
      .from("creator_profiles")
      .select("token_balance, subscription_tier")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setTokenBalance(data.token_balance ?? 0);
          setSubscriptionTier(data.subscription_tier || "free");
        }
      });

    // Realtime — updates instantly when any tool deducts tokens
    const channel = supabase
      .channel("creator_token_balance")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "creator_profiles",
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const newData = payload.new as any;
          setTokenBalance(newData.token_balance ?? 0);
          if (newData.subscription_tier) {
            setSubscriptionTier(newData.subscription_tier);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return { tokenBalance, subscriptionTier };
}

/** Opens the Stripe billing portal for a paid creator. Shared by the sidebar's "Manage" and the Profile sheet's. */
export async function openSubscriptionPortal(): Promise<void> {
  try {
    const res = await fetch("/api/subscription/manage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountType: "creator" }),
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    }
  } catch (err) {
    console.error("Portal error:", err);
  }
}
