"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface PollResult<T> {
  /** The latest value, or null before the first answer. */
  data: T | null;
  /** True until a final value, the last retry or a failed fetch. */
  loading: boolean;
  /** Polls again from the start, with the spinner showing. */
  refresh: () => void;
}

export interface PollOptions {
  /** How many more times to fetch after the first. Defaults to 8. */
  retries?: number | undefined;
  /** Milliseconds between fetches. Defaults to 4000. */
  delayMs?: number | undefined;
}

/**
 * Fetches until the value is final, such as an order a payment provider has not confirmed yet when
 * the user comes back from it. Stops after the retries, on a failed fetch and on unmount. Each fetch
 * uses the latest `fetcher` and `isFinal` given.
 */
export function usePollUntilFinal<T>(
  fetcher: () => Promise<T | null>,
  isFinal: (value: T | null) => boolean,
  { retries = 8, delayMs = 4000 }: PollOptions = {},
): PollResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const latest = useRef({ fetcher, isFinal });
  useEffect(() => {
    latest.current = { fetcher, isFinal };
  }, [fetcher, isFinal]);
  const run = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const start = useCallback(() => {
    const id = ++run.current;
    let attempt = 0;
    const tick = async () => {
      try {
        const value = await latest.current.fetcher();
        if (id !== run.current) return;
        setData(value);
        if (latest.current.isFinal(value) || attempt >= retries) {
          setLoading(false);
          return;
        }
        attempt += 1;
        timer.current = setTimeout(tick, delayMs);
      } catch {
        if (id === run.current) setLoading(false);
      }
    };
    void tick();
  }, [retries, delayMs]);

  // `loading` starts true, so the first poll needs no flag of its own.
  useEffect(() => {
    start();
    return () => {
      // A new run number cancels whichever run is current, including one a refresh started.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      run.current++;
      clearTimeout(timer.current);
    };
  }, [start]);

  const refresh = useCallback(() => {
    clearTimeout(timer.current);
    setLoading(true);
    start();
  }, [start]);

  return { data, loading, refresh };
}
