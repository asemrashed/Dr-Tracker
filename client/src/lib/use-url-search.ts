'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useUrlParams } from './use-url-params';

/**
 * Search box state that is mirrored to a URL param, debounced.
 * - Typing updates the input immediately and the URL after `delay` ms (one request per pause, not per key).
 * - External URL changes (back button, "clear filters") flow back into the input.
 * - Our own URL updates are recognised, so a slow round trip never overwrites newer typing.
 */
export function useUrlSearch(key = 'search', delay = 300) {
  const { searchParams, update } = useUrlParams();
  const urlValue = searchParams.get(key) ?? '';
  const [text, setText] = useState(urlValue);
  const timer = useRef<number | undefined>(undefined);
  const lastSent = useRef(urlValue);
  // The debounced callback must always call the latest `update` (it closes over the current URL params).
  const updateRef = useRef(update);
  useEffect(() => {
    updateRef.current = update;
  }, [update]);

  useEffect(() => {
    if (urlValue !== lastSent.current) {
      lastSent.current = urlValue;
      setText(urlValue);
    }
  }, [urlValue]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onChange = useCallback(
    (value: string) => {
      setText(value);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        const trimmed = value.trim();
        lastSent.current = trimmed;
        updateRef.current({ [key]: trimmed || undefined });
      }, delay);
    },
    [key, delay],
  );

  /** Empty the box and cancel any pending debounced update (the caller changes the URL itself). */
  const reset = useCallback(() => {
    window.clearTimeout(timer.current);
    lastSent.current = '';
    setText('');
  }, []);

  return { text, onChange, reset, value: urlValue };
}
