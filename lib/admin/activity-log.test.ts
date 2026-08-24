import { describe, it, expect } from 'vitest';
import { describeActivity, targetTableFor, type ActivityRow } from './activity-log';

const row = (over: Partial<ActivityRow> = {}): ActivityRow => ({
  id: 'r1',
  event_type: 'brand_approved',
  user_id: null,
  target_id: 'b1',
  details: null,
  created_at: '2026-08-24T19:48:00Z',
  ...over,
});

const names = (map: Record<string, string>) => (id: string) => map[id];
const noNames = () => undefined;

describe('targetTableFor', () => {
  it('routes by prefix', () => {
    expect(targetTableFor('brand_approved')).toBe('brand');
    expect(targetTableFor('brand_pending')).toBe('brand');
    expect(targetTableFor('creator_verified')).toBe('creator');
  });

  it('has no target for contact_form, unknown types, or null', () => {
    expect(targetTableFor('contact_form')).toBeNull();
    expect(targetTableFor('something_else')).toBeNull();
    expect(targetTableFor(null)).toBeNull();
  });
});

describe('describeActivity', () => {
  it('names the subject when it can be resolved', () => {
    expect(describeActivity(row(), names({ b1: 'LMG Media' })).title).toBe('Approved LMG Media');
    expect(describeActivity(row({ event_type: 'brand_suspended' }), names({ b1: 'LMG Media' })).title)
      .toBe('Suspended LMG Media');
    expect(describeActivity(row({ event_type: 'brand_pending' }), names({ b1: 'LMG Media' })).title)
      .toBe('Moved LMG Media back to pending');
    expect(describeActivity(row({ event_type: 'creator_verified' }), names({ b1: 'Vicky' })).title)
      .toBe('Verified Vicky');
  });

  // A deleted brand, or a lookup that failed, must not render "Approved undefined".
  it('falls back to a subject-less form when the name cannot be resolved', () => {
    expect(describeActivity(row(), noNames).title).toBe('Brand approved');
    expect(describeActivity(row({ event_type: 'creator_rejected' }), noNames).title).toBe('Creator rejected');
  });

  it('never returns raw JSON as the detail for a status change', () => {
    const d = describeActivity(
      row({ details: { by: 'ed64026a-6cc3-4903-be88-19c6aa1c1817', action: 'approved' } }),
      names({ b1: 'LMG Media' }),
    );
    expect(d.detail).toBeNull();
  });

  it('summarises a contact form from named fields', () => {
    const d = describeActivity(
      row({
        event_type: 'contact_form',
        target_id: null,
        details: { name: 'Luke', type: 'General Inquiry', email: 'creators@lmg.media', subject: 'please approve' },
      }),
      noNames,
    );
    expect(d.title).toBe('Contact form submitted');
    expect(d.detail).toBe('“please approve” from Luke · General Inquiry');
    // The address is in the row but deliberately not in the summary line.
    expect(d.detail).not.toContain('creators@lmg.media');
  });

  it('handles details arriving as a JSON string', () => {
    const d = describeActivity(
      row({ event_type: 'contact_form', target_id: null, details: '{"subject":"hi","name":"Ana"}' }),
      noNames,
    );
    expect(d.detail).toBe('“hi” from Ana');
  });

  it('survives malformed or partial details', () => {
    expect(describeActivity(row({ event_type: 'contact_form', details: 'not json' }), noNames).detail).toBeNull();
    expect(describeActivity(row({ event_type: 'contact_form', details: {} }), noNames).detail).toBeNull();
    expect(describeActivity(row({ event_type: 'contact_form', details: { subject: '   ' } }), noNames).detail).toBeNull();
  });

  // The oldest rows predate the actor being recorded at all.
  it('reads a legacy row with only an action in details', () => {
    const d = describeActivity(row({ details: { action: 'approved' } }), names({ b1: 'LMG Media' }));
    expect(d).toEqual({ title: 'Approved LMG Media', detail: null });
  });

  it('degrades an unrecognised event type rather than rendering nothing', () => {
    expect(describeActivity(row({ event_type: 'brand_archived' }), noNames).title).toBe('Brand archived');
    expect(describeActivity(row({ event_type: null }), noNames).title).toBe('Activity');
  });
});
