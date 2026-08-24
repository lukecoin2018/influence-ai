import 'server-only';

/**
 * The hook that will one day tell a brand its application was approved.
 *
 * ── IT DOES NOT SEND ANYTHING. ─────────────────────────────────────────────
 *
 * That is deliberate and agreed, not an oversight. The only mail transport in
 * this codebase is nodemailer over Gmail SMTP (app/api/inquiries/route.ts),
 * pointed at ADMIN_EMAIL — it sends to us, internally. Approval mail goes to an
 * external stranger, which is a different proposition: an app password caps out
 * around 500 a day and lands in spam far more readily than a real transactional
 * sender. Proper sending from a real address is its own piece of work, with a
 * verified domain and DNS records behind it.
 *
 * So this records the intent, in one place, with one caller, and returns. When
 * a transactional sender exists, this function body is where it goes — nothing
 * else has to change.
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
