/**
 * useDraftRecovery Hook Tests
 *
 * Tests for draft recovery functionality using localStorage.
 * Includes save, load, clear, expiration, and debounce behavior.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useDraftRecovery } from '../useDraftRecovery';

describe('useDraftRecovery', () => {
  const TEST_KEY = 'test-draft-key';
  const mockLocalStorage: Record<string, string> = {};

  beforeEach(() => {
    vi.useFakeTimers();

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          mockLocalStorage[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete mockLocalStorage[key];
        }),
        clear: vi.fn(() => {
          Object.keys(mockLocalStorage).forEach((key) => {
            delete mockLocalStorage[key];
          });
        }),
      },
      writable: true,
    });

    // Clear mock storage
    Object.keys(mockLocalStorage).forEach((key) => {
      delete mockLocalStorage[key];
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should return hasDraft false when no draft exists', () => {
      const { result } = renderHook(() =>
        useDraftRecovery({ key: TEST_KEY })
      );

      expect(result.current.hasDraft).toBe(false);
      expect(result.current.draftData).toBeNull();
    });

    it('should return hasDraft true when draft exists', () => {
      const existingDraft = {
        data: { name: 'Test' },
        timestamp: Date.now(),
        expiresAt: Date.now() + 86400000, // 1 day
      };
      mockLocalStorage[TEST_KEY] = JSON.stringify(existingDraft);

      const { result } = renderHook(() =>
        useDraftRecovery<{ name: string }>({ key: TEST_KEY })
      );

      expect(result.current.hasDraft).toBe(true);
      expect(result.current.draftData).toEqual({ name: 'Test' });
    });

    it('should handle expired draft', () => {
      const expiredDraft = {
        data: { name: 'Expired' },
        timestamp: Date.now() - 86400000, // 1 day ago
        expiresAt: Date.now() - 1, // Already expired
      };
      mockLocalStorage[TEST_KEY] = JSON.stringify(expiredDraft);

      const { result } = renderHook(() =>
        useDraftRecovery<{ name: string }>({ key: TEST_KEY })
      );

      expect(result.current.hasDraft).toBe(false);
      expect(result.current.draftData).toBeNull();
      expect(localStorage.removeItem).toHaveBeenCalledWith(TEST_KEY);
    });

    it('should handle invalid JSON in localStorage', () => {
      mockLocalStorage[TEST_KEY] = 'invalid-json';
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() =>
        useDraftRecovery({ key: TEST_KEY })
      );

      expect(result.current.hasDraft).toBe(false);
      expect(result.current.draftData).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('saveDraft', () => {
    it('should save draft after debounce delay', async () => {
      const { result } = renderHook(() =>
        useDraftRecovery<{ name: string }>({
          key: TEST_KEY,
          debounceMs: 1000,
        })
      );

      act(() => {
        result.current.saveDraft({ name: 'Test Data' });
      });

      // Before debounce
      expect(localStorage.setItem).not.toHaveBeenCalled();

      // After debounce
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(localStorage.setItem).toHaveBeenCalledWith(
        TEST_KEY,
        expect.stringContaining('"name":"Test Data"')
      );
    });

    it('should use default debounce of 2000ms', async () => {
      const { result } = renderHook(() =>
        useDraftRecovery<{ name: string }>({ key: TEST_KEY })
      );

      act(() => {
        result.current.saveDraft({ name: 'Test' });
      });

      act(() => {
        vi.advanceTimersByTime(1999);
      });
      expect(localStorage.setItem).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(localStorage.setItem).toHaveBeenCalled();
    });

    it('should include timestamp and expiresAt in saved draft', async () => {
      const { result } = renderHook(() =>
        useDraftRecovery<{ name: string }>({
          key: TEST_KEY,
          debounceMs: 100,
          ttl: 3600000, // 1 hour
        })
      );

      act(() => {
        result.current.saveDraft({ name: 'Test' });
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      const savedData = JSON.parse(mockLocalStorage[TEST_KEY]);
      expect(savedData.timestamp).toBeDefined();
      expect(savedData.expiresAt).toBeDefined();
      // Verify TTL is approximately 1 hour (allow some timing variance)
      expect(savedData.expiresAt - savedData.timestamp).toBeCloseTo(3600000, -2);
    });

    it('should not save when enabled is false', () => {
      const { result } = renderHook(() =>
        useDraftRecovery<{ name: string }>({
          key: TEST_KEY,
          enabled: false,
        })
      );

      act(() => {
        result.current.saveDraft({ name: 'Test' });
      });

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(localStorage.setItem).not.toHaveBeenCalled();
    });

    it('should debounce multiple rapid saves', async () => {
      const { result } = renderHook(() =>
        useDraftRecovery<{ name: string }>({
          key: TEST_KEY,
          debounceMs: 1000,
        })
      );

      act(() => {
        result.current.saveDraft({ name: 'First' });
      });
      act(() => {
        vi.advanceTimersByTime(500);
      });

      act(() => {
        result.current.saveDraft({ name: 'Second' });
      });
      act(() => {
        vi.advanceTimersByTime(500);
      });

      act(() => {
        result.current.saveDraft({ name: 'Final' });
      });
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Only the last value should be saved
      const savedData = JSON.parse(mockLocalStorage[TEST_KEY]);
      expect(savedData.data.name).toBe('Final');
    });
  });

  describe('clearDraft', () => {
    it('should clear draft from localStorage', () => {
      const existingDraft = {
        data: { name: 'Test' },
        timestamp: Date.now(),
        expiresAt: Date.now() + 86400000,
      };
      mockLocalStorage[TEST_KEY] = JSON.stringify(existingDraft);

      const { result } = renderHook(() =>
        useDraftRecovery<{ name: string }>({ key: TEST_KEY })
      );

      expect(result.current.hasDraft).toBe(true);

      act(() => {
        result.current.clearDraft();
      });

      expect(localStorage.removeItem).toHaveBeenCalledWith(TEST_KEY);
      expect(result.current.hasDraft).toBe(false);
      expect(result.current.draftData).toBeNull();
    });

    it('should handle clear errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(localStorage.removeItem).mockImplementation(() => {
        throw new Error('Storage error');
      });

      const { result } = renderHook(() =>
        useDraftRecovery({ key: TEST_KEY })
      );

      act(() => {
        result.current.clearDraft();
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('getDraftAge', () => {
    it('should return draft age in milliseconds', () => {
      const timestamp = Date.now() - 60000; // 1 minute ago
      const existingDraft = {
        data: { name: 'Test' },
        timestamp,
        expiresAt: Date.now() + 86400000,
      };
      mockLocalStorage[TEST_KEY] = JSON.stringify(existingDraft);

      const { result } = renderHook(() =>
        useDraftRecovery<{ name: string }>({ key: TEST_KEY })
      );

      const age = result.current.getDraftAge();
      expect(age).toBeGreaterThanOrEqual(60000);
    });

    it('should return null when no draft exists', () => {
      const { result } = renderHook(() =>
        useDraftRecovery({ key: TEST_KEY })
      );

      expect(result.current.getDraftAge()).toBeNull();
    });

    it('should handle errors gracefully', () => {
      mockLocalStorage[TEST_KEY] = 'invalid-json';
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() =>
        useDraftRecovery({ key: TEST_KEY })
      );

      expect(result.current.getDraftAge()).toBeNull();
      consoleSpy.mockRestore();
    });
  });

  describe('TTL configuration', () => {
    it('should use default TTL of 7 days', async () => {
      const { result } = renderHook(() =>
        useDraftRecovery<{ name: string }>({
          key: TEST_KEY,
          debounceMs: 100,
        })
      );

      act(() => {
        result.current.saveDraft({ name: 'Test' });
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      const savedData = JSON.parse(mockLocalStorage[TEST_KEY]);
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      // Verify TTL is approximately 7 days (allow some timing variance)
      expect(savedData.expiresAt - savedData.timestamp).toBeCloseTo(sevenDays, -2);
    });

    it('should use custom TTL', async () => {
      const customTtl = 3600000; // 1 hour

      const { result } = renderHook(() =>
        useDraftRecovery<{ name: string }>({
          key: TEST_KEY,
          debounceMs: 100,
          ttl: customTtl,
        })
      );

      act(() => {
        result.current.saveDraft({ name: 'Test' });
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      const savedData = JSON.parse(mockLocalStorage[TEST_KEY]);
      // Verify TTL is approximately 1 hour (allow some timing variance)
      expect(savedData.expiresAt - savedData.timestamp).toBeCloseTo(customTtl, -2);
    });
  });

  describe('different data types', () => {
    it('should handle string data', async () => {
      const existingDraft = {
        data: 'simple string',
        timestamp: Date.now(),
        expiresAt: Date.now() + 86400000,
      };
      mockLocalStorage[TEST_KEY] = JSON.stringify(existingDraft);

      const { result } = renderHook(() =>
        useDraftRecovery<string>({ key: TEST_KEY })
      );

      expect(result.current.draftData).toBe('simple string');
    });

    it('should handle array data', async () => {
      const existingDraft = {
        data: [1, 2, 3],
        timestamp: Date.now(),
        expiresAt: Date.now() + 86400000,
      };
      mockLocalStorage[TEST_KEY] = JSON.stringify(existingDraft);

      const { result } = renderHook(() =>
        useDraftRecovery<number[]>({ key: TEST_KEY })
      );

      expect(result.current.draftData).toEqual([1, 2, 3]);
    });

    it('should handle complex nested objects', async () => {
      const complexData = {
        patient: {
          name: 'John Doe',
          vitals: {
            bp: '120/80',
            hr: 72,
          },
        },
        notes: ['Note 1', 'Note 2'],
      };

      const existingDraft = {
        data: complexData,
        timestamp: Date.now(),
        expiresAt: Date.now() + 86400000,
      };
      mockLocalStorage[TEST_KEY] = JSON.stringify(existingDraft);

      const { result } = renderHook(() =>
        useDraftRecovery<typeof complexData>({ key: TEST_KEY })
      );

      expect(result.current.draftData).toEqual(complexData);
    });
  });

  describe('key changes', () => {
    it('should reload draft when key changes', () => {
      const draft1 = {
        data: { name: 'Draft 1' },
        timestamp: Date.now(),
        expiresAt: Date.now() + 86400000,
      };
      const draft2 = {
        data: { name: 'Draft 2' },
        timestamp: Date.now(),
        expiresAt: Date.now() + 86400000,
      };
      mockLocalStorage['key1'] = JSON.stringify(draft1);
      mockLocalStorage['key2'] = JSON.stringify(draft2);

      const { result, rerender } = renderHook(
        ({ key }) => useDraftRecovery<{ name: string }>({ key }),
        { initialProps: { key: 'key1' } }
      );

      expect(result.current.draftData?.name).toBe('Draft 1');

      rerender({ key: 'key2' });

      expect(result.current.draftData?.name).toBe('Draft 2');
    });
  });
});
