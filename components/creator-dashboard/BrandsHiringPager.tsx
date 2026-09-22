'use client';

// components/creator-dashboard/BrandsHiringPager.tsx
//
// Previous / page numbers / Next, under the Brands Hiring grid. Presentational:
// it owns no state and reads no strings table — the page it serves resolves the
// locale once and passes the four labels in, the same props-in discipline
// BrandsHiring.tsx keeps.

const GREY = '#3A3A3A';

/** A gap in the number run. Never rendered as a page, never clickable. */
const ELLIPSIS = 'ellipsis' as const;

type Slot = number | typeof ELLIPSIS;

/**
 * Up to seven slots, so the control's width does not move as the creator pages
 * through the list:
 *
 *   ≤ 7 pages        1 2 3 4 5 6 7
 *   near the start   1 2 3 4 5 … 20
 *   in the middle    1 … 9 10 11 … 20
 *   near the end     1 … 16 17 18 19 20
 *
 * First and last are always present, so "jump to the end" is always one click.
 */
export function pageSlots(current: number, total: number): Slot[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, ELLIPSIS, total];
  if (current >= total - 3) return [1, ELLIPSIS, total - 4, total - 3, total - 2, total - 1, total];
  return [1, ELLIPSIS, current - 1, current, current + 1, ELLIPSIS, total];
}

export type BrandsHiringPagerProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  labels: {
    previous: string;
    next: string;
    /** aria-label for a numbered button — the digit alone is not a description. */
    pageLabel: (n: number) => string;
    /** aria-label for the <nav> itself, so a screen reader can tell it from the category filter. */
    navLabel: string;
  };
};

export function BrandsHiringPager({ page, totalPages, onPageChange, labels }: BrandsHiringPagerProps) {
  // One page is not a pager. Rendering "Previous 1 Next", both disabled, is
  // noise on the common case of a creator with a short list.
  if (totalPages <= 1) return null;

  const stepStyle = (disabled: boolean): React.CSSProperties => ({
    padding: '7px 14px',
    borderRadius: '999px',
    border: '1px solid #E5E7EB',
    backgroundColor: '#fff',
    color: disabled ? '#D1D5DB' : GREY,
    fontSize: '13px',
    fontWeight: 600,
    cursor: disabled ? 'default' : 'pointer',
  });

  return (
    <nav
      aria-label={labels.navLabel}
      style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '24px' }}
    >
      <button type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1} style={stepStyle(page <= 1)}>
        {labels.previous}
      </button>

      {pageSlots(page, totalPages).map((slot, i) =>
        slot === ELLIPSIS ? (
          // aria-hidden: the gap is a visual convenience, and "…" read aloud
          // between two page numbers says nothing a screen reader user needs.
          <span key={`gap-${i}`} aria-hidden="true" style={{ color: '#9CA3AF', fontSize: '13px', padding: '0 2px' }}>
            …
          </span>
        ) : (
          <button
            key={slot}
            type="button"
            onClick={() => onPageChange(slot)}
            aria-label={labels.pageLabel(slot)}
            aria-current={slot === page ? 'page' : undefined}
            style={{
              minWidth: '36px',
              padding: '7px 10px',
              borderRadius: '999px',
              border: slot === page ? 'none' : '1px solid #E5E7EB',
              backgroundColor: slot === page ? GREY : '#fff',
              color: slot === page ? '#fff' : GREY,
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {slot}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        style={stepStyle(page >= totalPages)}
      >
        {labels.next}
      </button>
    </nav>
  );
}
