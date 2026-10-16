'use client';

import { useId, useState } from 'react';
import type { RichText } from './_strings';
import { Rich } from './_Rich';
import s from './for-creators.module.css';

/**
 * The FAQ as an accordion: each question is a button inside an h3 with
 * aria-expanded and aria-controls, and each answer a labelled region that is
 * hidden when closed (the WAI-ARIA accordion pattern). The first answer starts
 * open. Each item opens and closes on its own.
 *
 * Hidden answers are still in the server-rendered HTML, so they stay readable
 * to search engines and to find-in-page once opened.
 */
export function Faq({ items }: { items: ReadonlyArray<{ q: string; a: RichText }> }) {
  const baseId = useId();
  const [open, setOpen] = useState<ReadonlySet<number>>(() => new Set([0]));

  function toggle(index: number) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  return (
    <div className={s.faqList}>
      {items.map((item, i) => {
        const isOpen = open.has(i);
        const buttonId = `${baseId}-q${i}`;
        const panelId = `${baseId}-a${i}`;
        return (
          <div key={item.q} className={s.faqItem}>
            <h3>
              <button
                type="button"
                id={buttonId}
                className={s.faqButton}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(i)}
              >
                <span>{item.q}</span>
                <span aria-hidden="true" className={s.faqIcon}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                    <path d="M6 1v10M1 6h10" />
                  </svg>
                </span>
              </button>
            </h3>
            <div id={panelId} role="region" aria-labelledby={buttonId} hidden={!isOpen}>
              <p className={s.faqAnswer}>
                <Rich text={item.a} />
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
