import 'server-only';

/**
 * Bio-verification code minting, shared by the only two routes that issue one:
 * app/api/creators/claim/route.ts (the first code, at signup) and
 * app/api/creators/regenerate-code/route.ts (a replacement code).
 *
 * One definition on purpose, and that includes the TTL. There is no issued_at
 * column on creator_profiles, so the regenerate route works out "when was the
 * current code issued?" by subtracting this TTL from the stored
 * verification_code_expires_at. If the two routes ever wrote different
 * windows, that subtraction would silently produce a wrong issue time and the
 * re-issue throttle would misfire.
 *
 * server-only: a code minted in the browser would be attacker-chosen, which
 * would defeat the whole point of proving control of the account's bio.
 */

/** 24 hours — the expiry the claim route has always written. */
export const VERIFICATION_CODE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * `IIT-` plus six characters. The alphabet omits 0/O/1/I/L on purpose:
 * creators read this off one screen and retype it into the Instagram or TikTok
 * bio editor, so visually ambiguous glyphs cost real verification attempts.
 */
export function generateVerificationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
  let code = 'IIT-';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** ISO timestamp one TTL from `from`, for verification_code_expires_at. */
export function verificationCodeExpiresAt(from: number = Date.now()): string {
  return new Date(from + VERIFICATION_CODE_TTL_MS).toISOString();
}
