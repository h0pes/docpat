/**
 * useDraftRecovery Hook
 *
 * Provides draft recovery functionality using LocalStorage.
 * Automatically saves form data to LocalStorage and provides methods
 * to recover or clear drafts.
 */

import { useEffect, useCallback, useState } from 'react';
import { useDebounce } from './useDebounce';

interface DraftData {
  data: unknown;
  timestamp: number;
  expiresAt: number;
}

interface UseDraftRecoveryOptions {
  /** Unique key for this draft (e.g., 'visit-draft-new' or 'visit-draft-{id}') */
  key: string;
  /** How long to keep drafts in ms (default: 7 days) */
  ttl?: number;
  /** Debounce delay in ms (default: 2000ms) */
  debounceMs?: number;
  /** Whether to enable draft recovery */
  enabled?: boolean;
}

interface UseDraftRecoveryReturn<T> {
  /** Whether a draft exists */
  hasDraft: boolean;
  /** The recovered draft data */
  draftData: T | null;
  /** Save current data as draft */
  saveDraft: (data: T) => void;
  /** Clear the draft */
  clearDraft: () => void;
  /** Get draft age in milliseconds */
  getDraftAge: () => number | null;
}

const DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
const DEFAULT_DEBOUNCE = 2000; // 2 seconds

/**
 * Hook for managing draft recovery with LocalStorage
 */
export function useDraftRecovery<T = unknown>(
  options: UseDraftRecoveryOptions
): UseDraftRecoveryReturn<T> {
  const {
    key,
    ttl = DEFAULT_TTL,
    debounceMs = DEFAULT_DEBOUNCE,
    enabled = true,
  } = options;

  const [draftData, setDraftData] = useState<T | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [pendingData, setPendingData] = useState<T | null>(null);

  // Debounce the pending data
  const debouncedData = useDebounce(pendingData, debounceMs);

  /**
   * Load draft from LocalStorage on mount
   */
  useEffect(() => {
    if (!enabled) return;

    try {
      const stored = localStorage.getItem(key);
      if (!stored) {
        setHasDraft(false);
        setDraftData(null);
        return;
      }

      const draft: DraftData = JSON.parse(stored);

      // Check if draft has expired
      if (Date.now() > draft.expiresAt) {
        localStorage.removeItem(key);
        setHasDraft(false);
        setDraftData(null);
        return;
      }

      setHasDraft(true);
      setDraftData(draft.data as T);
    } catch (error) {
      console.error('Failed to load draft:', error);
      setHasDraft(false);
      setDraftData(null);
    }
  }, [key, enabled]);

  /**
   * Save debounced data to LocalStorage
   */
  useEffect(() => {
    if (!enabled || !debouncedData) return;

    try {
      const draft: DraftData = {
        data: debouncedData,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttl,
      };

      localStorage.setItem(key, JSON.stringify(draft));
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  }, [debouncedData, key, ttl, enabled]);

  /**
   * Save data as draft (will be debounced)
   */
  const saveDraft = useCallback((data: T) => {
    if (!enabled) return;
    setPendingData(data);
  }, [enabled]);

  /**
   * Clear the draft from LocalStorage
   */
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(key);
      setHasDraft(false);
      setDraftData(null);
      setPendingData(null);
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
  }, [key]);

  /**
   * Get draft age in milliseconds
   */
  const getDraftAge = useCallback((): number | null => {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      const draft: DraftData = JSON.parse(stored);
      return Date.now() - draft.timestamp;
    } catch (error) {
      console.error('Failed to get draft age:', error);
      return null;
    }
  }, [key]);

  return {
    hasDraft,
    draftData,
    saveDraft,
    clearDraft,
    getDraftAge,
  };
}
