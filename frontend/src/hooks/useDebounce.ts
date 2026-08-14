import { useEffect, useState } from "react";

/**
 * Debounce a rapidly-changing value.
 *
 * @param value   The value to debounce.
 * @param delay   Milliseconds to wait after the last change. Default 300ms.
 * @returns       The debounced value, updated only after `delay` ms of quiet.
 *
 * @example
 * const debouncedSearch = useDebounce(searchInput, 400);
 * useEffect(() => { fetchResults(debouncedSearch); }, [debouncedSearch]);
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
