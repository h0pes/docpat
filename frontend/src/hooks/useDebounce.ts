/**
 * useDebounce Hook
 *
 * Debounces a value by delaying its update until after a specified delay.
 * Useful for optimizing expensive operations like API calls during user input.
 */

import { useState, useEffect } from 'react';

/**
 * Debounce a value
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 500ms)
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set a timeout to update the debounced value
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup function to cancel the timeout if value changes
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
