'use client';

import { FIND_ID, HANDLE_INPUT_ID } from './_ids';

/**
 * The "See who's hiring" buttons in the header and the closing section. They
 * scroll to the handle form and put the cursor in the input, so on a phone
 * the keyboard is already up.
 *
 * A real link to #find, so it still jumps to the form before hydration or
 * without JavaScript.
 */
export function ScrollToForm({ className, children }: { className: string; children: React.ReactNode }) {
  function onClick(event: React.MouseEvent<HTMLAnchorElement>) {
    const form = document.getElementById(FIND_ID);
    const input = document.getElementById(HANDLE_INPUT_ID);
    if (!form || !input) return;
    event.preventDefault();
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    form.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    // preventScroll, or focusing jumps straight to the input and cuts the
    // smooth scroll short.
    input.focus({ preventScroll: true });
  }

  return (
    <a href={`#${FIND_ID}`} className={className} onClick={onClick}>
      {children}
    </a>
  );
}
