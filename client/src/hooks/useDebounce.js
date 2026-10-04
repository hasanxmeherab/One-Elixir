import { useState, useEffect } from 'react';

/**
 * Delays updating the returned value until `delay` ms after the last change.
 * Use for search inputs and other expensive handlers to avoid firing on every keystroke.
 *
 * @param {*}      value - The value to debounce (typically a string)
 * @param {number} delay - Debounce delay in milliseconds (default 350ms)
 * @returns The debounced value
 */
export function useDebounce(value, delay = 350) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
