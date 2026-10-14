import { Fragment } from 'react';
import type { RichText } from './_strings';
import s from './for-creators.module.css';

/** Renders a RichText from ./_strings.ts: plain text, with email links. */
export function Rich({ text }: { text: RichText }) {
  return (
    <>
      {text.map((part, i) =>
        typeof part === 'string' ? (
          <Fragment key={i}>{part}</Fragment>
        ) : (
          <a key={i} href={`mailto:${part.email}`} className={s.emailLink}>
            {part.email}
          </a>
        )
      )}
    </>
  );
}
