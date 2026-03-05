'use client';

import { useState } from 'react';

interface TokenGateResult {
  checking: boolean;
  blocked: boolean;
  balance: number;
  needed: number;
  charged: boolean;
  checkAndCharge: (action: string) => Promise<boolean>;
  dismiss: () => void;
}

interface TokenGateOptions {
  chargeEveryTime?: boolean; // true = charge on every call, false = once per session (default)
}

export function useTokenGate(options: TokenGateOptions = {}): TokenGateResult {
  const { chargeEveryTime = false } = options;

  const [checking, setChecking] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [balance, setBalance] = useState(0);
  const [needed, setNeeded] = useState(0);
  const [charged, setCharged] = useState(false);

  const checkAndCharge = async (action: string): Promise<boolean> => {
    // Already charged this session — allow through (unless chargeEveryTime is set)
    if (charged && !chargeEveryTime) return true;

    setChecking(true);
    try {
      const res = await fetch('/api/tokens/spend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();

      if (res.status === 402) {
        setBalance(data.balance ?? 0);
        setNeeded(data.needed ?? 0);
        setBlocked(true);
        return false;
      }

      if (res.ok) {
        setCharged(true);
        setBlocked(false);
        return true;
      }

      // Any other error — allow through silently
      return true;
    } catch {
      return true;
    } finally {
      setChecking(false);
    }
  };

  const dismiss = () => setBlocked(false);

  return { checking, blocked, balance, needed, charged, checkAndCharge, dismiss };
}
