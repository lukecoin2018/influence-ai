import 'server-only';

/**
 * The hook that will one day tell a brand its application was approved.
 *
 * ── IT DOES NOT SEND ANYTHING. ─────────────────────────────────────────────
 *
 * That is deliberate and agreed, not an oversight. A transactional sender now
 * exists — lib/email/client.ts over Resend, used by the creator approval mail
 * in app/api/admin/creators/status/route.ts and the inquiry mails in
 * app/api/inquiries/route.ts — so the old reason (the only transport was a
 * Gmail app password that caps out around 500 a day) no longer applies. What
 * remains undecided is the brand-side copy and whether brand approval should
 * email at all; that is its own item and has not been picked up. Until it is,
 * this stays a logged no-op.
 *
 * So this records the intent, in one place, with one caller, and returns. When
 * the brand approval email is designed, this function body is where the
 * sendEmail() call goes — nothing else has to change.
 *
 * ── WHY IT EXISTS AT ALL RATHER THAN A TODO ────────────────────────────────
 *
 * Because the copy the brand sees depends on it. The holding screen at
 * app/dashboard/_BrandGateScreen.tsx deliberately does NOT say "we'll email
 * you", because today that would be a promise the product cannot keep. Having
 * the seam here, named and logged, is what makes the eventual change a
 * one-file change and keeps the two facts — "we do not send" and "we do not
 * claim to send" — next to each other.
 *
 * Until then, approving a brand is a silent act and someone has to tell them by
 * hand. The log line below is the reminder that they are waiting.
 */
export async function notifyBrandApproved(params: {
  brandId: string;
  email: string | null;
  companyName: string | null;
}): Promise<void> {
  // Not an error — this is the designed behaviour. Logged at info level so the
  // approval leaves a trace that a human still owes this brand a message.
  console.info(
    `[brand-approval] ${params.companyName ?? 'unknown company'} (${params.email ?? 'no email on file'}) ` +
    `was approved. NO EMAIL WAS SENT — no transactional sender is configured. ` +
    `Contact them by hand. brandId=${params.brandId}`,
  );
}
