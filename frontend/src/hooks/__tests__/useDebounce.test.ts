/**
 * useDebounce Hook Tests
 *
 * Tests for the debounce functionality including timing,
 * value updates, and cleanup behavior.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useDebounce } from '../useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial behavior', () => {
    it('should return the initial value immediately', () => {
      const { result } = renderHook(() => useDebounce('initial', 500));
      expect(result.current).toBe('initial');
    });

    it('should handle undefined initial value', () => {
      const { result } = renderHook(() => useDebounce(undefined, 500));
      expect(result.current).toBeUndefined();
    });

    it('should handle null initial value', () => {
      const { result } = renderHook(() => useDebounce(null, 500));
      expect(result.current).toBeNull();
    });

    it('should handle number values', () => {
      const { result } = renderHook(() => useDebounce(42, 500));
      expect(result.current).toBe(42);
    });

    it('should handle object values', () => {
      const obj = { foo: 'bar' };
      const { result } = renderHook(() => useDebounce(obj, 500));
      expect(result.current).toEqual(obj);
    });
  });

  describe('debounce timing', () => {
    it('should not update value before delay expires', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 500),
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: 'updated' });

      // Advance time but not enough for debounce
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current).toBe('initial');
    });

    it('should update value after delay expires', async () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 500),
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: 'updated' });

      // Advance time past the debounce delay
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(result.current).toBe('updated');
    });

    it('should use default delay of 500ms', async () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value),
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: 'updated' });

      act(() => {
        vi.advanceTimersByTime(499);
      });
      expect(result.current).toBe('initial');

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(result.current).toBe('updated');
    });

    it('should respect custom delay', async () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 1000),
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: 'updated' });

      act(() => {
        vi.advanceTimersByTime(999);
      });
      expect(result.current).toBe('initial');

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(result.current).toBe('updated');
    });
  });

  describe('multiple rapid updates', () => {
    it('should only use the last value after multiple rapid changes', async () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 500),
        { initialProps: { value: 'initial' } }
      );

      // Rapid changes
      rerender({ value: 'change1' });
      act(() => {
        vi.advanceTimersByTime(100);
      });

      rerender({ value: 'change2' });
      act(() => {
        vi.advanceTimersByTime(100);
      });

      rerender({ value: 'change3' });
      act(() => {
        vi.advanceTimersByTime(100);
      });

      rerender({ value: 'final' });

      // Value should still be initial
      expect(result.current).toBe('initial');

      // Advance to complete debounce for final value
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(result.current).toBe('final');
    });

    it('should cancel previous timer when value changes', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 500),
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: 'first' });
      act(() => {
        vi.advanceTimersByTime(400);
      });

      // Change value again before first debounce completes
      rerender({ value: 'second' });

      // First value timer would have completed here
      act(() => {
        vi.advanceTimersByTime(150);
      });

      // Should still be initial because second timer hasn't completed
      expect(result.current).toBe('initial');

      // Complete second timer
      act(() => {
        vi.advanceTimersByTime(350);
      });

      expect(result.current).toBe('second');
    });
  });

  describe('delay changes', () => {
    it('should reset timer when delay changes', async () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: 500 } }
      );

      rerender({ value: 'updated', delay: 500 });
      act(() => {
        vi.advanceTimersByTime(400);
      });

      // Change delay
      rerender({ value: 'updated', delay: 1000 });

      // Original timer would have completed
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current).toBe('initial');

      // Wait for new delay
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(result.current).toBe('updated');
    });
  });

  describe('edge cases', () => {
    it('should handle zero delay', async () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 0),
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: 'updated' });

      act(() => {
        vi.advanceTimersByTime(0);
      });

      expect(result.current).toBe('updated');
    });

    it('should handle empty string value', async () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 500),
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: '' });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(result.current).toBe('');
    });

    it('should handle boolean values', async () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 500),
        { initialProps: { value: true } }
      );

      rerender({ value: false });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(result.current).toBe(false);
    });

    it('should handle array values', async () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 500),
        { initialProps: { value: [1, 2, 3] } }
      );

      rerender({ value: [4, 5, 6] });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(result.current).toEqual([4, 5, 6]);
    });
  });

  describe('cleanup', () => {
    it('should clear timeout on unmount', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      const { unmount, rerender } = renderHook(
        ({ value }) => useDebounce(value, 500),
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: 'updated' });
      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });
});
