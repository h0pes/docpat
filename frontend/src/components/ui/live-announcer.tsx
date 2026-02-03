/**
 * Live Region Announcer for screen readers
 *
 * Provides an accessible mechanism for announcing dynamic content changes
 * to assistive technologies via ARIA live regions (WCAG SC 4.1.3 - Status Messages).
 *
 * Mount the `LiveAnnouncer` component once at the app root level.
 * Use the `useAnnouncer` hook from any component to trigger announcements.
 */

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

/**
 * Priority levels for live region announcements
 * - polite: announced when the user is idle (default)
 * - assertive: announced immediately, interrupting current speech
 */
type AnnouncePriority = 'polite' | 'assertive';

interface AnnouncerContextValue {
  /** Announce a message to screen readers */
  announce: (message: string, priority?: AnnouncePriority) => void;
}

const AnnouncerContext = createContext<AnnouncerContextValue | null>(null);

interface LiveAnnouncerProps {
  children: ReactNode;
}

/**
 * Provider component that renders visually-hidden ARIA live regions.
 *
 * Place this component once near the root of your component tree
 * (e.g., in App.tsx) to enable screen reader announcements throughout
 * the application.
 *
 * @example
 * ```tsx
 * <LiveAnnouncer>
 *   <App />
 * </LiveAnnouncer>
 * ```
 */
export function LiveAnnouncer({ children }: LiveAnnouncerProps) {
  const [politeMessage, setPoliteMessage] = useState('');
  const [assertiveMessage, setAssertiveMessage] = useState('');
  const clearTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const announce = useCallback((message: string, priority: AnnouncePriority = 'polite') => {
    // Clear the region first so repeated identical messages are re-announced
    if (clearTimeoutRef.current) {
      clearTimeout(clearTimeoutRef.current);
    }

    if (priority === 'assertive') {
      setAssertiveMessage('');
      // Use a microtask delay to ensure the DOM clears before setting new text
      requestAnimationFrame(() => setAssertiveMessage(message));
    } else {
      setPoliteMessage('');
      requestAnimationFrame(() => setPoliteMessage(message));
    }

    // Clear messages after a delay to prevent stale announcements
    clearTimeoutRef.current = setTimeout(() => {
      setPoliteMessage('');
      setAssertiveMessage('');
    }, 7000);
  }, []);

  return (
    <AnnouncerContext.Provider value={{ announce }}>
      {children}
      {/* Visually hidden live regions for screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeMessage}
      </div>
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertiveMessage}
      </div>
    </AnnouncerContext.Provider>
  );
}

/**
 * Hook to access the live region announcer.
 *
 * @returns Object with an `announce` function
 * @throws Error if used outside of `LiveAnnouncer` provider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { announce } = useAnnouncer();
 *
 *   const handleSave = () => {
 *     saveData();
 *     announce('Record saved successfully');
 *   };
 * }
 * ```
 */
export function useAnnouncer(): AnnouncerContextValue {
  const context = useContext(AnnouncerContext);
  if (!context) {
    throw new Error('useAnnouncer must be used within a LiveAnnouncer provider');
  }
  return context;
}
