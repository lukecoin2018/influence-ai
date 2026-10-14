'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { normalizeRequestHandle } from '@/lib/creator-requests/shared';
import { FIND_ID, HANDLE_INPUT_ID } from './_ids';
import type { ForCreatorsStrings } from './_strings';
import s from './for-creators.module.css';

const ERROR_ID = 'for-creators-handle-error';

/** Past this the check counts as failed, rather than a button that spins forever. */
const LOOKUP_TIMEOUT_MS = 10_000;

let lookupClient: SupabaseClient | null = null;

/**
 * An anon-key client with no auth session, made on first use.
 *
 * Not the shared client in lib/supabase.ts. That one awaits
 * auth.getSession() before every query, to attach a signed-in user's token.
 * Measured in the Browser pane on 2026-10-14, signed out, dev server: through
 * that client the lookup got no answer before the timeout below aborted it,
 * and the signup's own handle check showed "Checking..." for 7 s and then
 * not-found for a handle that exists. The same query through this client
 * reached the right page all three times, in 2 to 4 s including that page's
 * load. On a production build the shared client answered in 0.1 s, so the
 * stall was the dev server's; but a signed-in visitor's session can also
 * hang there (see the token-refresh note at the top of
 * context/AuthContext.tsx), and an existence check needs no session. With
 * `accessToken` set, supabase-js builds no auth client at all and every
 * request goes out with the anon key, which is also how the signup's query
 * goes out for a visitor who is not signed in.
 */
function getLookupClient(): SupabaseClient {
  lookupClient ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    accessToken: async () => null,
  });
  return lookupClient;
}

/**
 * Is this handle in the database, on either platform?
 *
 * The same query the creator signup runs (app/auth/signup/_SignUpForm.tsx,
 * checkHandle): social_profiles by handle, no platform filter, as the anon
 * role. RLS limits it to active creators, so an account hidden as a
 * non-creator counts as not found, which is how /claim and
 * /api/creators/request treat it too.
 *
 * Case-insensitive because the handle is lowercased before it gets here and
 * stored handles are lowercase: 0 of the 10,856 the anon key can read had an
 * uppercase letter (measured 2026-10-14). Not ilike: `_` is a wildcard there,
 * and it is in many handles.
 *
 * Runs in the browser on submit, so the page itself stays static. Throws when
 * the check could not be made, so the caller never mistakes a failed request
 * for "not found" (the signup's check does: it ignores the error).
 */
async function handleExists(handle: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
  try {
    const { data, error } = await getLookupClient()
      .from('social_profiles')
      .select('creator_id')
      .eq('handle', handle)
      .limit(1)
      .abortSignal(controller.signal)
      .maybeSingle();
    if (error) throw new Error(error.message || 'lookup failed');
    return Boolean(data?.creator_id);
  } finally {
    clearTimeout(timer);
  }
}

/** `from=for_creators` names this page as the entry point on both destinations. */
function claimHref(handle: string): string {
  return `/claim/${encodeURIComponent(handle)}?from=for_creators`;
}

/** The handle goes along, so /get-listed opens with it filled in. */
function getListedHref(handle: string): string {
  return `/get-listed?${new URLSearchParams({ from: 'for_creators', handle }).toString()}`;
}

type FormError = 'empty' | 'failed' | null;

export function HandleForm({ t }: { t: ForCreatorsStrings['hero']['form'] }) {
  const router = useRouter();
  const [error, setError] = useState<FormError>(null);
  const [checking, setChecking] = useState(false);
  const [isPending, startTransition] = useTransition();
  // Busy from the moment the check starts until the next page has arrived.
  const busy = checking || isPending;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const raw = new FormData(event.currentTarget).get('handle');
    // "@Name", "instagram.com/name/?hl=en", "tiktok.com/@name" and " na me "
    // all become "name": the same normaliser /get-listed uses, so both pages
    // agree on what a handle is.
    const handle = normalizeRequestHandle(raw);
    if (!handle) {
      setError('empty');
      return;
    }

    setError(null);
    setChecking(true);
    let exists: boolean;
    try {
      exists = await handleExists(handle);
    } catch (err) {
      // Don't guess a destination from a check that didn't happen.
      console.warn(`[for-creators] handle check failed: ${err instanceof Error ? err.message : String(err)}`);
      setChecking(false);
      setError('failed');
      return;
    }

    // The next page reads the database and can take a few seconds. The
    // transition keeps the button busy until it arrives, so a second tap does
    // not start a second navigation.
    startTransition(() => router.push(exists ? claimHref(handle) : getListedHref(handle)));
    setChecking(false);
  }

  return (
    <form id={FIND_ID} className={s.find} onSubmit={onSubmit} noValidate>
      <label htmlFor={HANDLE_INPUT_ID} className={s.label}>
        {t.label}
      </label>
      <div className={s.fieldRow}>
        <div className={`${s.field} ${error === 'empty' ? s.fieldInvalid : ''}`}>
          <span aria-hidden="true" className={s.at}>
            @
          </span>
          <input
            id={HANDLE_INPUT_ID}
            name="handle"
            type="text"
            className={s.input}
            placeholder={t.placeholder}
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            aria-invalid={error === 'empty' || undefined}
            aria-describedby={error ? ERROR_ID : undefined}
            onChange={() => {
              if (error) setError(null);
            }}
          />
        </div>
        <button type="submit" className={`${s.btn} ${s.submit}`} disabled={busy} aria-busy={busy || undefined}>
          {busy && <span aria-hidden="true" className={s.spinner} />}
          {t.submit}
        </button>
      </div>
      {error ? (
        <p id={ERROR_ID} role="alert" className={s.error}>
          {error === 'empty' ? t.emptyError : t.checkError}
        </p>
      ) : (
        <p className={s.note}>{t.note}</p>
      )}
    </form>
  );
}
