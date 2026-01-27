/**
 * use-toast Hook Tests
 *
 * Tests for the toast notification system including
 * adding, updating, dismissing, and removing toasts.
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useToast, toast, reducer } from '../use-toast';

describe('use-toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('useToast hook', () => {
    it('should return initial empty toasts array', () => {
      const { result } = renderHook(() => useToast());

      expect(result.current.toasts).toEqual([]);
    });

    it('should provide toast function', () => {
      const { result } = renderHook(() => useToast());

      expect(typeof result.current.toast).toBe('function');
    });

    it('should provide dismiss function', () => {
      const { result } = renderHook(() => useToast());

      expect(typeof result.current.dismiss).toBe('function');
    });
  });

  describe('toast function', () => {
    it('should add toast to state', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({
          title: 'Test Toast',
          description: 'Test description',
        });
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].title).toBe('Test Toast');
      expect(result.current.toasts[0].description).toBe('Test description');
    });

    it('should return toast id', () => {
      const { result } = renderHook(() => useToast());

      let toastResult: { id: string; dismiss: () => void; update: (props: unknown) => void };
      act(() => {
        toastResult = result.current.toast({
          title: 'Test',
        });
      });

      expect(toastResult!.id).toBeDefined();
      expect(typeof toastResult!.id).toBe('string');
    });

    it('should return dismiss function for toast', () => {
      const { result } = renderHook(() => useToast());

      let toastResult: { id: string; dismiss: () => void; update: (props: unknown) => void };
      act(() => {
        toastResult = result.current.toast({
          title: 'Test',
        });
      });

      expect(typeof toastResult!.dismiss).toBe('function');
    });

    it('should return update function for toast', () => {
      const { result } = renderHook(() => useToast());

      let toastResult: { id: string; dismiss: () => void; update: (props: unknown) => void };
      act(() => {
        toastResult = result.current.toast({
          title: 'Test',
        });
      });

      expect(typeof toastResult!.update).toBe('function');
    });

    it('should set open to true by default', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({
          title: 'Test',
        });
      });

      expect(result.current.toasts[0].open).toBe(true);
    });

    it('should limit toasts to TOAST_LIMIT', () => {
      const { result } = renderHook(() => useToast());

      // Add multiple toasts
      act(() => {
        result.current.toast({ title: 'Toast 1' });
      });
      act(() => {
        result.current.toast({ title: 'Toast 2' });
      });
      act(() => {
        result.current.toast({ title: 'Toast 3' });
      });

      // Only 1 toast should be visible (TOAST_LIMIT = 1)
      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].title).toBe('Toast 3');
    });

    it('should generate unique ids for each toast', () => {
      const { result } = renderHook(() => useToast());

      const ids: string[] = [];
      for (let i = 0; i < 5; i++) {
        act(() => {
          const t = result.current.toast({ title: `Toast ${i}` });
          ids.push(t.id);
        });
      }

      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(5);
    });
  });

  describe('dismiss function', () => {
    it('should dismiss specific toast by id', () => {
      const { result } = renderHook(() => useToast());

      let toastId: string;
      act(() => {
        const t = result.current.toast({ title: 'Test' });
        toastId = t.id;
      });

      expect(result.current.toasts[0].open).toBe(true);

      act(() => {
        result.current.dismiss(toastId);
      });

      expect(result.current.toasts[0].open).toBe(false);
    });

    it('should dismiss all toasts when no id provided', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({ title: 'Test' });
      });

      act(() => {
        result.current.dismiss();
      });

      expect(result.current.toasts[0].open).toBe(false);
    });

    it('should call onOpenChange with false when dismissed', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({ title: 'Test' });
      });

      // Trigger onOpenChange
      act(() => {
        result.current.toasts[0].onOpenChange?.(false);
      });

      expect(result.current.toasts[0].open).toBe(false);
    });
  });

  describe('update function', () => {
    it('should update toast properties', () => {
      const { result } = renderHook(() => useToast());

      let toastResult: { id: string; dismiss: () => void; update: (props: unknown) => void };
      act(() => {
        toastResult = result.current.toast({
          title: 'Original Title',
          description: 'Original description',
        });
      });

      act(() => {
        toastResult.update({
          id: toastResult.id,
          title: 'Updated Title',
        });
      });

      expect(result.current.toasts[0].title).toBe('Updated Title');
      // Description should remain unchanged
      expect(result.current.toasts[0].description).toBe('Original description');
    });
  });
});

describe('reducer', () => {
  describe('ADD_TOAST', () => {
    it('should add toast to beginning of array', () => {
      const initialState = { toasts: [] };
      const newToast = {
        id: '1',
        title: 'Test',
        open: true,
      };

      const result = reducer(initialState, {
        type: 'ADD_TOAST',
        toast: newToast,
      });

      expect(result.toasts).toHaveLength(1);
      expect(result.toasts[0]).toEqual(newToast);
    });

    it('should prepend new toast to existing toasts', () => {
      const existingToast = { id: '1', title: 'Existing', open: true };
      const initialState = { toasts: [existingToast] };
      const newToast = { id: '2', title: 'New', open: true };

      const result = reducer(initialState, {
        type: 'ADD_TOAST',
        toast: newToast,
      });

      expect(result.toasts[0]).toEqual(newToast);
    });
  });

  describe('UPDATE_TOAST', () => {
    it('should update matching toast', () => {
      const existingToast = { id: '1', title: 'Original', open: true };
      const initialState = { toasts: [existingToast] };

      const result = reducer(initialState, {
        type: 'UPDATE_TOAST',
        toast: { id: '1', title: 'Updated' },
      });

      expect(result.toasts[0].title).toBe('Updated');
      expect(result.toasts[0].open).toBe(true);
    });

    it('should not update non-matching toasts', () => {
      const toast1 = { id: '1', title: 'Toast 1', open: true };
      const toast2 = { id: '2', title: 'Toast 2', open: true };
      const initialState = { toasts: [toast1, toast2] };

      const result = reducer(initialState, {
        type: 'UPDATE_TOAST',
        toast: { id: '1', title: 'Updated' },
      });

      expect(result.toasts[1].title).toBe('Toast 2');
    });
  });

  describe('DISMISS_TOAST', () => {
    it('should set open to false for specific toast', () => {
      const existingToast = { id: '1', title: 'Test', open: true };
      const initialState = { toasts: [existingToast] };

      const result = reducer(initialState, {
        type: 'DISMISS_TOAST',
        toastId: '1',
      });

      expect(result.toasts[0].open).toBe(false);
    });

    it('should set open to false for all toasts when no id', () => {
      const toast1 = { id: '1', title: 'Toast 1', open: true };
      const toast2 = { id: '2', title: 'Toast 2', open: true };
      const initialState = { toasts: [toast1, toast2] };

      const result = reducer(initialState, {
        type: 'DISMISS_TOAST',
      });

      expect(result.toasts[0].open).toBe(false);
      expect(result.toasts[1].open).toBe(false);
    });
  });

  describe('REMOVE_TOAST', () => {
    it('should remove specific toast', () => {
      const toast1 = { id: '1', title: 'Toast 1', open: true };
      const toast2 = { id: '2', title: 'Toast 2', open: true };
      const initialState = { toasts: [toast1, toast2] };

      const result = reducer(initialState, {
        type: 'REMOVE_TOAST',
        toastId: '1',
      });

      expect(result.toasts).toHaveLength(1);
      expect(result.toasts[0].id).toBe('2');
    });

    it('should remove all toasts when no id', () => {
      const toast1 = { id: '1', title: 'Toast 1', open: true };
      const toast2 = { id: '2', title: 'Toast 2', open: true };
      const initialState = { toasts: [toast1, toast2] };

      const result = reducer(initialState, {
        type: 'REMOVE_TOAST',
      });

      expect(result.toasts).toHaveLength(0);
    });
  });
});
