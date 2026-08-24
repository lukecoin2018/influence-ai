/**
 * Turns an activity_log row into something a person can read.
 *
 * ── WHY ────────────────────────────────────────────────────────────────────
 *
 * The admin overview rendered `item.action`, and activity_log has no `action`
 * column — its columns are id, event_type, user_id, target_id, details,
 * created_at. So the headline was `undefined` on every row and rendered as
 * nothing, leaving the raw JSON of `details` (a secondary line, meant to be a
 * hint) as the only visible content:
 *
 *     {"by":"ed64026a-6cc3-4903-be88-19c6aa1c1817","action":"approved"}
 *
 * `event_type` was already being fetched by the page's `select('*')`. It was
 * simply never read.
 *
 * ── DESIGN ─────────────────────────────────────────────────────────────────
 *
 * Pure and side-effect free, so the wording is testable without a database.
 * Name resolution is passed in as a lookup rather than done here: the caller
 * batches one query per target table, and this stays a function of its inputs.
 *
 * Unknown event types must degrade to something sensible rather than vanish.
 * The set is small today (seven), but the constraint on this table is not
 * enforced in the app, and a log that silently drops rows it does not
 * recognise is worse than one that prints an ugly label.
 */

export interface ActivityRow {
  id: string;
  event_type: string | null;
  user_id: string | null;
  target_id: string | null;
  details: unknown;
  created_at: string;
}

export interface ActivityDescription {
  /** The headline. Always non-empty. */
  title: string;
  /** Secondary line, or null when there is nothing worth adding. Never raw JSON. */
  detail: string | null;
}

/**
 * Which table `target_id` points at, inferred from the event type prefix.
 * Returns null when the event has no target (contact_form) or is unrecognised.
 */
export function targetTableFor(eventType: string | null): 'brand' | 'creator' | null {
  if (!eventType) return null;
  if (eventType.startsWith('brand_')) return 'brand';
  if (eventType.startsWith('creator_')) return 'creator';
  return null;
}

/** Parses `details`, which may arrive as an object, a JSON string, or null. */
function detailsObject(details: unknown): Record<string, unknown> | null {
  if (!details) return null;
  if (typeof details === 'object') return details as Record<string, unknown>;
  if (typeof details === 'string') {
    try {
      const parsed = JSON.parse(details);
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  return null;
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/** `brand_approved` -> `Brand approved`, for an event type we have no wording for. */
function humanise(eventType: string): string {
  const spaced = eventType.replace(/_/g, ' ').trim();
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : 'Activity';
}

/**
 * @param nameFor resolves a target_id to a display name, or undefined when it
 *                cannot be resolved — a deleted brand, or a row whose lookup
 *                failed. The wording falls back to the subject-less form.
 */
export function describeActivity(
  row: ActivityRow,
  nameFor: (targetId: string) => string | undefined,
): ActivityDescription {
  const details = detailsObject(row.details);
  const name = row.target_id ? nameFor(row.target_id) : undefined;

  switch (row.event_type) {
    case 'brand_approved':
      return { title: name ? `Approved ${name}` : 'Brand approved', detail: null };
    case 'brand_rejected':
      return { title: name ? `Rejected ${name}` : 'Brand rejected', detail: null };
    case 'brand_suspended':
      return { title: name ? `Suspended ${name}` : 'Brand suspended', detail: null };
    case 'brand_pending':
      return {
        title: name ? `Moved ${name} back to pending` : 'Brand moved back to pending',
        detail: null,
      };
    case 'creator_verified':
      return { title: name ? `Verified ${name}` : 'Creator verified', detail: null };
    case 'creator_rejected':
      return { title: name ? `Rejected ${name}` : 'Creator rejected', detail: null };

    case 'contact_form': {
      // The one event where `details` is the whole point — it is the only
      // record of what was sent. Named fields, not a JSON dump; the email
      // address is deliberately left out of the summary line, since it adds
      // length without helping scanning and the Contact page shows it in full.
      const subject = str(details?.subject);
      const from = str(details?.name);
      const kind = str(details?.type);
      const parts = [
        subject ? `“${subject}”` : null,
        from ? `from ${from}` : null,
        kind ? `· ${kind}` : null,
      ].filter(Boolean);
      return {
        title: 'Contact form submitted',
        detail: parts.length ? parts.join(' ') : null,
      };
    }

    default:
      return {
        title: row.event_type ? humanise(row.event_type) : 'Activity',
        detail: null,
      };
  }
}
