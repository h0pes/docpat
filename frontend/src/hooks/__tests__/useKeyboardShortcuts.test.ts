/**
 * useKeyboardShortcuts Hook Tests
 *
 * Tests for keyboard shortcut handling including modifier keys,
 * callback execution, and utility functions.
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  useKeyboardShortcuts,
  getShortcutDisplay,
  getVisitFormShortcuts,
  type KeyboardShortcut,
} from '../useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Helper to simulate keydown event
   */
  function simulateKeyDown(options: {
    key: string;
    ctrlKey?: boolean;
    metaKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
  }) {
    const event = new KeyboardEvent('keydown', {
      key: options.key,
      ctrlKey: options.ctrlKey || false,
      metaKey: options.metaKey || false,
      shiftKey: options.shiftKey || false,
      altKey: options.altKey || false,
      bubbles: true,
    });

    // Mock preventDefault and stopPropagation
    Object.defineProperty(event, 'preventDefault', {
      value: vi.fn(),
    });
    Object.defineProperty(event, 'stopPropagation', {
      value: vi.fn(),
    });

    document.dispatchEvent(event);
    return event;
  }

  describe('basic shortcut handling', () => {
    it('should call callback when matching key is pressed', () => {
      const callback = vi.fn();
      const shortcuts: KeyboardShortcut[] = [
        { key: 'a', callback },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      simulateKeyDown({ key: 'a' });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should handle case-insensitive key matching', () => {
      const callback = vi.fn();
      const shortcuts: KeyboardShortcut[] = [
        { key: 'A', callback },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      simulateKeyDown({ key: 'a' });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should not call callback for non-matching key', () => {
      const callback = vi.fn();
      const shortcuts: KeyboardShortcut[] = [
        { key: 'a', callback },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      simulateKeyDown({ key: 'b' });

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle Escape key', () => {
      const callback = vi.fn();
      const shortcuts: KeyboardShortcut[] = [
        { key: 'Escape', callback },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      simulateKeyDown({ key: 'Escape' });

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('modifier keys', () => {
    it('should call callback when Ctrl modifier matches', () => {
      const callback = vi.fn();
      const shortcuts: KeyboardShortcut[] = [
        { key: 's', ctrlKey: true, callback },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      simulateKeyDown({ key: 's', ctrlKey: true });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should call callback when Cmd (metaKey) modifier matches on Mac', () => {
      const callback = vi.fn();
      const shortcuts: KeyboardShortcut[] = [
        { key: 's', ctrlKey: true, callback },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      simulateKeyDown({ key: 's', metaKey: true });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should not call callback when Ctrl is required but not pressed', () => {
      const callback = vi.fn();
      const shortcuts: KeyboardShortcut[] = [
        { key: 's', ctrlKey: true, callback },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      simulateKeyDown({ key: 's' });

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle Shift modifier', () => {
      const callback = vi.fn();
      const shortcuts: KeyboardShortcut[] = [
        { key: 'p', ctrlKey: true, shiftKey: true, callback },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      simulateKeyDown({ key: 'p', ctrlKey: true, shiftKey: true });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should not call callback when Shift is required but not pressed', () => {
      const callback = vi.fn();
      const shortcuts: KeyboardShortcut[] = [
        { key: 'p', ctrlKey: true, shiftKey: true, callback },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      simulateKeyDown({ key: 'p', ctrlKey: true });

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle Alt modifier', () => {
      const callback = vi.fn();
      const shortcuts: KeyboardShortcut[] = [
        { key: 'a', altKey: true, callback },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      simulateKeyDown({ key: 'a', altKey: true });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should not call callback when Alt is required but not pressed', () => {
      const callback = vi.fn();
      const shortcuts: KeyboardShortcut[] = [
        { key: 'a', altKey: true, callback },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      simulateKeyDown({ key: 'a' });

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('enabled/disabled shortcuts', () => {
    it('should not call callback when shortcut is disabled', () => {
      const callback = vi.fn();
      const shortcuts: KeyboardShortcut[] = [
        { key: 'a', callback, enabled: false },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      simulateKeyDown({ key: 'a' });

      expect(callback).not.toHaveBeenCalled();
    });

    it('should call callback when enabled is true', () => {
      const callback = vi.fn();
      const shortcuts: KeyboardShortcut[] = [
        { key: 'a', callback, enabled: true },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      simulateKeyDown({ key: 'a' });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should call callback when enabled is undefined', () => {
      const callback = vi.fn();
      const shortcuts: KeyboardShortcut[] = [
        { key: 'a', callback },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      simulateKeyDown({ key: 'a' });

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('multiple shortcuts', () => {
    it('should handle multiple shortcuts', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const shortcuts: KeyboardShortcut[] = [
        { key: 'a', callback: callback1 },
        { key: 'b', callback: callback2 },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      simulateKeyDown({ key: 'a' });
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).not.toHaveBeenCalled();

      simulateKeyDown({ key: 'b' });
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it('should only trigger first matching shortcut', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const shortcuts: KeyboardShortcut[] = [
        { key: 'a', callback: callback1 },
        { key: 'a', callback: callback2 },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      simulateKeyDown({ key: 'a' });

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should remove event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
      const callback = vi.fn();
      const shortcuts: KeyboardShortcut[] = [
        { key: 'a', callback },
      ];

      const { unmount } = renderHook(() => useKeyboardShortcuts(shortcuts));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      removeEventListenerSpy.mockRestore();
    });
  });
});

describe('getShortcutDisplay', () => {
  describe('non-Mac platform', () => {
    beforeEach(() => {
      Object.defineProperty(navigator, 'platform', {
        value: 'Win32',
        writable: true,
      });
    });

    it('should format Ctrl+key shortcut', () => {
      const shortcut: KeyboardShortcut = {
        key: 's',
        ctrlKey: true,
        callback: vi.fn(),
      };

      expect(getShortcutDisplay(shortcut)).toBe('Ctrl+S');
    });

    it('should format Shift+key shortcut', () => {
      const shortcut: KeyboardShortcut = {
        key: 'p',
        shiftKey: true,
        callback: vi.fn(),
      };

      expect(getShortcutDisplay(shortcut)).toBe('Shift+P');
    });

    it('should format Ctrl+Shift+key shortcut', () => {
      const shortcut: KeyboardShortcut = {
        key: 'p',
        ctrlKey: true,
        shiftKey: true,
        callback: vi.fn(),
      };

      expect(getShortcutDisplay(shortcut)).toBe('Ctrl+Shift+P');
    });

    it('should format Alt+key shortcut', () => {
      const shortcut: KeyboardShortcut = {
        key: 'a',
        altKey: true,
        callback: vi.fn(),
      };

      expect(getShortcutDisplay(shortcut)).toBe('Alt+A');
    });

    it('should format key only shortcut', () => {
      const shortcut: KeyboardShortcut = {
        key: 'Escape',
        callback: vi.fn(),
      };

      expect(getShortcutDisplay(shortcut)).toBe('Escape');
    });

    it('should capitalize first letter of key', () => {
      const shortcut: KeyboardShortcut = {
        key: 'enter',
        callback: vi.fn(),
      };

      expect(getShortcutDisplay(shortcut)).toBe('Enter');
    });
  });

  describe('Mac platform', () => {
    beforeEach(() => {
      Object.defineProperty(navigator, 'platform', {
        value: 'MacIntel',
        writable: true,
      });
    });

    it('should use Mac symbols for Ctrl', () => {
      const shortcut: KeyboardShortcut = {
        key: 's',
        ctrlKey: true,
        callback: vi.fn(),
      };

      expect(getShortcutDisplay(shortcut)).toBe('\u2318S');
    });

    it('should use Mac symbols for Shift', () => {
      const shortcut: KeyboardShortcut = {
        key: 'p',
        shiftKey: true,
        callback: vi.fn(),
      };

      expect(getShortcutDisplay(shortcut)).toBe('\u21E7P');
    });

    it('should use Mac symbols for Alt', () => {
      const shortcut: KeyboardShortcut = {
        key: 'a',
        altKey: true,
        callback: vi.fn(),
      };

      expect(getShortcutDisplay(shortcut)).toBe('\u2325A');
    });
  });
});

describe('getVisitFormShortcuts', () => {
  it('should create save shortcut when onSave is provided', () => {
    const onSave = vi.fn();
    const shortcuts = getVisitFormShortcuts({ onSave });

    expect(shortcuts).toHaveLength(1);
    expect(shortcuts[0]).toEqual({
      key: 's',
      ctrlKey: true,
      callback: onSave,
      description: 'Save form',
    });
  });

  it('should create cancel shortcut when onCancel is provided', () => {
    const onCancel = vi.fn();
    const shortcuts = getVisitFormShortcuts({ onCancel });

    expect(shortcuts).toHaveLength(1);
    expect(shortcuts[0]).toEqual({
      key: 'Escape',
      callback: onCancel,
      description: 'Cancel',
    });
  });

  it('should create quick text shortcut when onQuickText is provided', () => {
    const onQuickText = vi.fn();
    const shortcuts = getVisitFormShortcuts({ onQuickText });

    expect(shortcuts).toHaveLength(1);
    expect(shortcuts[0]).toEqual({
      key: 'k',
      ctrlKey: true,
      callback: onQuickText,
      description: 'Open quick text',
    });
  });

  it('should create previous visits shortcut when onPreviousVisits is provided', () => {
    const onPreviousVisits = vi.fn();
    const shortcuts = getVisitFormShortcuts({ onPreviousVisits });

    expect(shortcuts).toHaveLength(1);
    expect(shortcuts[0]).toEqual({
      key: 'p',
      ctrlKey: true,
      shiftKey: true,
      callback: onPreviousVisits,
      description: 'View previous visits',
    });
  });

  it('should create dosage calculator shortcut when onDosageCalculator is provided', () => {
    const onDosageCalculator = vi.fn();
    const shortcuts = getVisitFormShortcuts({ onDosageCalculator });

    expect(shortcuts).toHaveLength(1);
    expect(shortcuts[0]).toEqual({
      key: 'd',
      ctrlKey: true,
      callback: onDosageCalculator,
      description: 'Open dosage calculator',
    });
  });

  it('should create multiple shortcuts when multiple handlers provided', () => {
    const handlers = {
      onSave: vi.fn(),
      onCancel: vi.fn(),
      onQuickText: vi.fn(),
      onPreviousVisits: vi.fn(),
      onDosageCalculator: vi.fn(),
    };

    const shortcuts = getVisitFormShortcuts(handlers);

    expect(shortcuts).toHaveLength(5);
  });

  it('should return empty array when no handlers provided', () => {
    const shortcuts = getVisitFormShortcuts({});

    expect(shortcuts).toHaveLength(0);
  });
});
