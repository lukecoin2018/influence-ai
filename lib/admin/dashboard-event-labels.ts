/**
 * Pure formatting for the admin's view of creator_dashboard_events — the
 * per-type count line under "Last active" on /admin/creators and the one-line
 * description of each event in the expandable activity list.
 *
 * Kept out of the page so it can be run against real rows from a script and
 * so the wording lives in one place. No I/O, no React.
 *
 * Two different sources, two different failure modes:
 *
 *   countLine() reads the n_<type> columns of v_creator_engagement, which
 *   exist only once migration 0021 is applied. Every column is read as
 *   "undefined means 0", so before 0021 the line is simply empty (and the page
 *   hides it) while "Last active" keeps working off the 0020 columns.
 *
 *   describeEvent() reads the table directly, so it sees every event type the
 *   union in lib/dashboard/events.ts will ever gain. A type it has no wording
 *   for renders as the raw event_type rather than crashing the admin page.
 *   That is the rule recorded in CLAUDE.md: a new event needs a view update
 *   for the count line and nothing for the activity list.
 */

export type EngagementCounts = Partial<Record<
  | 'n_dashboard_opened'
  | 'n_brands_hiring_opened'
  | 'n_brand_card_action'
  | 'n_tool_opened'
  | 'n_tool_used'
  | 'n_media_kit_opened'
  | 'n_media_kit_uploaded'
  | 'n_profile_edited',
  number | null
>>;

export type DashboardEventRow = {
  event_type: string;
  details: unknown;
  created_at: string;
};

const n = (v: number | null | undefined): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/** "3 opened / 1 used" — only the non-zero halves; '' when both are 0. */
function pair(a: number, aLabel: string, b: number, bLabel: string): string {
  const parts: string[] = [];
  if (a > 0) parts.push(`${a} ${aLabel}`);
  if (b > 0) parts.push(`${b} ${bLabel}`);
  return parts.join(' / ');
}

/**
 * `Dashboard 3 · Brands hiring 1 · Contacted 1 · Tools 3 opened / 1 used ·
 *  Media kit 1 opened / 1 uploaded · Profile edits 1`
 *
 * Only the non-zero parts, in this order. Returns '' when there is nothing to
 * say — the caller omits the line.
 */
export function countLine(c: EngagementCounts): string {
  const parts: string[] = [];
  if (n(c.n_dashboard_opened) > 0) parts.push(`Dashboard ${n(c.n_dashboard_opened)}`);
  if (n(c.n_brands_hiring_opened) > 0) parts.push(`Brands hiring ${n(c.n_brands_hiring_opened)}`);
  if (n(c.n_brand_card_action) > 0) parts.push(`Contacted ${n(c.n_brand_card_action)}`);
  const tools = pair(n(c.n_tool_opened), 'opened', n(c.n_tool_used), 'used');
  if (tools) parts.push(`Tools ${tools}`);
  const mediaKit = pair(n(c.n_media_kit_opened), 'opened', n(c.n_media_kit_uploaded), 'uploaded');
  if (mediaKit) parts.push(`Media kit ${mediaKit}`);
  if (n(c.n_profile_edited) > 0) parts.push(`Profile edits ${n(c.n_profile_edited)}`);
  return parts.join(' · ');
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/**
 * One line per event, without the timestamp (the page prefixes that in the
 * admin's local time). Details keys are the ones documented in CLAUDE.md,
 * "Dashboard events"; every read tolerates a missing or malformed value.
 */
export function describeEvent(row: DashboardEventRow): string {
  const d: Record<string, unknown> = row.details && typeof row.details === 'object' && !Array.isArray(row.details)
    ? (row.details as Record<string, unknown>)
    : {};

  switch (row.event_type) {
    case 'dashboard_opened':
      return 'Dashboard opened';
    case 'brands_hiring_opened':
      return 'Brands hiring opened';
    case 'brand_card_action': {
      const brand = str(d.canonical_name);
      const platform = str(d.platform);
      if (!brand) return 'Contacted brand';
      return platform ? `Contacted ${brand} (${platform})` : `Contacted ${brand}`;
    }
    case 'tool_opened':
      return `Opened ${str(d.tool) ?? 'tool'}`;
    case 'tool_used': {
      const tool = str(d.tool);
      const facts: string[] = [];
      if (tool === 'calculator') {
        if (str(d.niche)) facts.push(str(d.niche)!);
        if (num(d.deliverable_count) !== null) facts.push(`${num(d.deliverable_count)} deliverables`);
      } else if (tool === 'negotiate') {
        if (str(d.stage)) facts.push(str(d.stage)!);
        if (str(d.objection_type)) facts.push(str(d.objection_type)!);
      } else if (tool === 'contract') {
        if (str(d.deal_type)) facts.push(str(d.deal_type)!);
        if (num(d.section_count) !== null) facts.push(`${num(d.section_count)} sections`);
      }
      const head = `Used ${tool ?? 'tool'}`;
      return facts.length ? `${head} · ${facts.join(', ')}` : head;
    }
    case 'media_kit_opened':
      return 'Media kit opened';
    case 'media_kit_uploaded': {
      const kb = num(d.size_kb);
      return kb !== null ? `Media kit uploaded (${kb} KB)` : 'Media kit uploaded';
    }
    case 'profile_edited': {
      const fields = Array.isArray(d.fields_changed) ? d.fields_changed.filter((f): f is string => typeof f === 'string') : [];
      return fields.length ? `Profile edited · ${fields.join(', ')}` : 'Profile saved, no changes';
    }
    default:
      // A type added to the union after this file was written. Raw, never a crash.
      return row.event_type;
  }
}
