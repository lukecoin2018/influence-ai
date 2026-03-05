'use client';

import { useState } from 'react';

interface TokenGateResult {
  checking: boolean;
  blocked: boolean;        // true = out of tokens, show modal
  balance: number;
  needed: number;
  charged: boolean;        // true = already charged this session
  checkAndCharge: (action: string) => Promise<boolean>; // returns true if allowed
  dismiss: () => void;
}

export function useTokenGate(): TokenGateResult {
  const [checking, setChecking] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [balance, setBalance] = useState(0);
  const [needed, setNeeded] = useState(0);
  const [charged, setCharged] = useState(false);

  const checkAndCharge = async (action: string): Promise<boolean> => {
    // Already charged this session — allow through
    if (charged) return true;

    setChecking(true);
    try {
      const res = await fetch('/api/tokens/spend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();

      if (res.status === 402) {
        // Out of tokens
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

      // Any other error — allow through silently (don't block the user)
      return true;
    } catch {
      // Network error — allow through silently
      return true;
    } finally {
      setChecking(false);
    }
  };

  const dismiss = () => setBlocked(false);

  return { checking, blocked, balance, needed, charged, checkAndCharge, dismiss };
}
