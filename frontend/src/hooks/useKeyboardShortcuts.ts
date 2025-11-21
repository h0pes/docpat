/**
 * useKeyboardShortcuts Hook
 *
 * Provides keyboard shortcut functionality for common visit documentation actions.
 * Supports platform-specific key combinations (Ctrl/Cmd).
 *
 * Shortcuts:
 * - Ctrl/Cmd + S: Save/Submit form
 * - Ctrl/Cmd + K: Open quick text selector
 * - Escape: Cancel/Close dialog
 * - Ctrl/Cmd + Shift + P: Open previous visits
 * - Ctrl/Cmd + D: Open dosage calculator
 */

import { useEffect } from 'react';

/**
 * Keyboard shortcut configuration
 */
export interface KeyboardShortcut {
  /**
   * Keyboard key (e.g., 's', 'k', 'Escape')
   */
  key: string;

  /**
   * Requires Ctrl (Windows/Linux) or Cmd (Mac)
   */
  ctrlKey?: boolean;

  /**
   * Requires Shift key
   */
  shiftKey?: boolean;

  /**
   * Requires Alt key
   */
  altKey?: boolean;

  /**
   * Callback function to execute
   */
  callback: () => void;

  /**
   * Description of what the shortcut does (for help/documentation)
   */
  description?: string;

  /**
   * Whether the shortcut is enabled
   */
  enabled?: boolean;
}

/**
 * Hook for registering keyboard shortcuts
 *
 * @param shortcuts - Array of keyboard shortcut configurations
 * @param deps - Optional dependencies array (like useEffect)
 *
 * @example
 * ```tsx
 * useKeyboardShortcuts([
 *   {
 *     key: 's',
 *     ctrlKey: true,
 *     callback: handleSave,
 *     description: 'Save form'
 *   },
 *   {
 *     key: 'Escape',
 *     callback: handleCancel,
 *     description: 'Cancel'
 *   }
 * ]);
 * ```
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  deps: React.DependencyList = []
) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check each shortcut
      for (const shortcut of shortcuts) {
        // Skip if disabled
        if (shortcut.enabled === false) {
          continue;
        }

        // Check if key matches
        if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) {
          continue;
        }

        // Check modifiers
        const ctrlOrCmd = event.ctrlKey || event.metaKey; // metaKey is Cmd on Mac
        const matchesCtrl = shortcut.ctrlKey === ctrlOrCmd;
        const matchesShift = (shortcut.shiftKey || false) === event.shiftKey;
        const matchesAlt = (shortcut.altKey || false) === event.altKey;

        // If ctrl/cmd is required, check it matches
        if (shortcut.ctrlKey !== undefined && !matchesCtrl) {
          continue;
        }

        // If shift is specified, check it matches
        if (shortcut.shiftKey !== undefined && !matchesShift) {
          continue;
        }

        // If alt is specified, check it matches
        if (shortcut.altKey !== undefined && !matchesAlt) {
          continue;
        }

        // Prevent default browser behavior
        event.preventDefault();
        event.stopPropagation();

        // Execute callback
        shortcut.callback();
        break;
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * Get platform-specific shortcut display string
 *
 * @param shortcut - Keyboard shortcut configuration
 * @returns Formatted shortcut string for display (e.g., "Ctrl+S" or "⌘S")
 */
export function getShortcutDisplay(shortcut: KeyboardShortcut): string {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC');
  const parts: string[] = [];

  if (shortcut.ctrlKey) {
    parts.push(isMac ? '⌘' : 'Ctrl');
  }
  if (shortcut.shiftKey) {
    parts.push(isMac ? '⇧' : 'Shift');
  }
  if (shortcut.altKey) {
    parts.push(isMac ? '⌥' : 'Alt');
  }

  // Capitalize first letter of key
  const key = shortcut.key.charAt(0).toUpperCase() + shortcut.key.slice(1);
  parts.push(key);

  return parts.join(isMac ? '' : '+');
}

/**
 * Common visit form keyboard shortcuts preset
 *
 * @param handlers - Object containing callback functions
 * @returns Array of keyboard shortcut configurations
 */
export function getVisitFormShortcuts(handlers: {
  onSave?: () => void;
  onCancel?: () => void;
  onQuickText?: () => void;
  onPreviousVisits?: () => void;
  onDosageCalculator?: () => void;
}): KeyboardShortcut[] {
  const shortcuts: KeyboardShortcut[] = [];

  if (handlers.onSave) {
    shortcuts.push({
      key: 's',
      ctrlKey: true,
      callback: handlers.onSave,
      description: 'Save form',
    });
  }

  if (handlers.onCancel) {
    shortcuts.push({
      key: 'Escape',
      callback: handlers.onCancel,
      description: 'Cancel',
    });
  }

  if (handlers.onQuickText) {
    shortcuts.push({
      key: 'k',
      ctrlKey: true,
      callback: handlers.onQuickText,
      description: 'Open quick text',
    });
  }

  if (handlers.onPreviousVisits) {
    shortcuts.push({
      key: 'p',
      ctrlKey: true,
      shiftKey: true,
      callback: handlers.onPreviousVisits,
      description: 'View previous visits',
    });
  }

  if (handlers.onDosageCalculator) {
    shortcuts.push({
      key: 'd',
      ctrlKey: true,
      callback: handlers.onDosageCalculator,
      description: 'Open dosage calculator',
    });
  }

  return shortcuts;
}
