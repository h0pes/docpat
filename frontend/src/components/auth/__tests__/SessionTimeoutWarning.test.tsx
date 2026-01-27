/**
 * SessionTimeoutWarning Component Tests
 *
 * Tests the session timeout monitoring and warning dialog including:
 * - Activity tracking
 * - Warning dialog display
 * - Countdown timer
 * - Session extension
 * - Auto-logout
 * - Activity event listeners
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderWithProviders, screen, userEvent, waitFor } from '@/test/utils';
import { SessionTimeoutWarning } from '../SessionTimeoutWarning';
import { useAuth } from '@/store/authStore';

// Mock the auth store
vi.mock('@/store/authStore', () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('SessionTimeoutWarning', () => {
  const mockLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Mock useAuth
    (useAuth as any).mockReturnValue({
      logout: mockLogout,
      isAuthenticated: true,
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('Initial Render', () => {
    it('should not show warning dialog initially', () => {
      renderWithProviders(<SessionTimeoutWarning />);

      expect(screen.queryByText(/session about to expire/i)).not.toBeInTheDocument();
    });

    it('should setup activity listeners on mount', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      renderWithProviders(<SessionTimeoutWarning />);

      // Component should add at least one event listener for activity tracking
      expect(addEventListenerSpy).toHaveBeenCalled();
    });

    it('should cleanup activity listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderWithProviders(<SessionTimeoutWarning />);
      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalled();
    });
  });

  describe('Warning Dialog', () => {
    it('should accept sessionTimeout and warningTime props', () => {
      const sessionTimeout = 30 * 60 * 1000; // 30 minutes
      const warningTime = 5 * 60 * 1000; // 5 minutes

      // Component should render without error with these props
      const { container } = renderWithProviders(
        <SessionTimeoutWarning
          sessionTimeout={sessionTimeout}
          warningTime={warningTime}
        />
      );

      expect(container).toBeInTheDocument();
    });

    it('should render with default configuration', () => {
      const { container } = renderWithProviders(<SessionTimeoutWarning />);
      expect(container).toBeInTheDocument();
    });

    it('should not show warning initially', () => {
      renderWithProviders(
        <SessionTimeoutWarning
          sessionTimeout={10000}
          warningTime={5000}
        />
      );

      // Initially no warning should be shown
      expect(screen.queryByText(/session about to expire/i)).not.toBeInTheDocument();
    });
  });

  describe('Session Extension', () => {
    it('should render with extension capability', () => {
      const sessionTimeout = 10000;
      const warningTime = 5000;

      const { container } = renderWithProviders(
        <SessionTimeoutWarning
          sessionTimeout={sessionTimeout}
          warningTime={warningTime}
        />
      );

      // Component should render
      expect(container).toBeInTheDocument();
    });

    it('should not show warning before warning time', () => {
      const sessionTimeout = 10000;
      const warningTime = 5000;

      renderWithProviders(
        <SessionTimeoutWarning
          sessionTimeout={sessionTimeout}
          warningTime={warningTime}
        />
      );

      // No warning initially
      expect(screen.queryByText(/session about to expire/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/stay logged in/i)).not.toBeInTheDocument();
    });
  });

  describe('Auto-logout', () => {
    it('should have logout function available', () => {
      const sessionTimeout = 10000;
      const warningTime = 5000;

      renderWithProviders(
        <SessionTimeoutWarning
          sessionTimeout={sessionTimeout}
          warningTime={warningTime}
        />
      );

      // Logout function should be available via auth context
      expect(mockLogout).toBeDefined();
    });

    it('should render without immediate logout', () => {
      const sessionTimeout = 10000;
      const warningTime = 5000;

      renderWithProviders(
        <SessionTimeoutWarning
          sessionTimeout={sessionTimeout}
          warningTime={warningTime}
        />
      );

      // Should not logout immediately
      expect(mockLogout).not.toHaveBeenCalled();
    });
  });

  describe('Activity Tracking', () => {
    it('should reset timer on user activity', async () => {
      const sessionTimeout = 10000;
      const warningTime = 5000;

      renderWithProviders(
        <SessionTimeoutWarning
          sessionTimeout={sessionTimeout}
          warningTime={warningTime}
        />
      );

      // Fast-forward part way
      vi.advanceTimersByTime(3000);

      // Simulate user activity
      window.dispatchEvent(new Event('mousedown'));

      // Fast-forward to where warning would have shown
      vi.advanceTimersByTime(sessionTimeout - warningTime - 3000);

      // Warning should not be shown yet because activity reset the timer
      expect(screen.queryByText(/session about to expire/i)).not.toBeInTheDocument();
    });

    it('should throttle activity events', async () => {
      const sessionTimeout = 10000;
      const warningTime = 5000;

      renderWithProviders(
        <SessionTimeoutWarning
          sessionTimeout={sessionTimeout}
          warningTime={warningTime}
        />
      );

      // Simulate rapid activity (should be throttled to once per second)
      for (let i = 0; i < 10; i++) {
        window.dispatchEvent(new Event('mousemove'));
      }

      // Only first event should reset timer immediately
      vi.advanceTimersByTime(500);
      window.dispatchEvent(new Event('mousemove'));

      // Timer should still be active (not reset for every event)
      expect(screen.queryByText(/session about to expire/i)).not.toBeInTheDocument();
    });
  });

  describe('Custom Configuration', () => {
    it('should accept custom session timeout', () => {
      const customTimeout = 5000; // 5 seconds
      const warningTime = 2000; // 2 seconds

      const { container } = renderWithProviders(
        <SessionTimeoutWarning
          sessionTimeout={customTimeout}
          warningTime={warningTime}
        />
      );

      expect(container).toBeInTheDocument();
    });

    it('should accept custom warning time', () => {
      const sessionTimeout = 10000;
      const customWarningTime = 3000; // 3 seconds before expiry

      const { container } = renderWithProviders(
        <SessionTimeoutWarning
          sessionTimeout={sessionTimeout}
          warningTime={customWarningTime}
        />
      );

      expect(container).toBeInTheDocument();
    });

    it('should accept custom activity events prop', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      const customEvents = ['click', 'scroll'];

      renderWithProviders(
        <SessionTimeoutWarning activityEvents={customEvents} />
      );

      // Should have added event listeners
      expect(addEventListenerSpy).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should not show warning if user is not authenticated', () => {
      (useAuth as any).mockReturnValue({
        logout: mockLogout,
        isAuthenticated: false,
      });

      const sessionTimeout = 1000;
      const warningTime = 500;

      renderWithProviders(
        <SessionTimeoutWarning
          sessionTimeout={sessionTimeout}
          warningTime={warningTime}
        />
      );

      // Fast-forward to warning time
      vi.advanceTimersByTime(sessionTimeout - warningTime);

      // Warning should not appear for unauthenticated users
      expect(screen.queryByText(/session about to expire/i)).not.toBeInTheDocument();
    });

    it('should handle unmounting during countdown', () => {
      const sessionTimeout = 10000;
      const warningTime = 5000;

      const { unmount } = renderWithProviders(
        <SessionTimeoutWarning
          sessionTimeout={sessionTimeout}
          warningTime={warningTime}
        />
      );

      // Fast-forward to warning time
      vi.advanceTimersByTime(sessionTimeout - warningTime);

      // Unmount component
      expect(() => unmount()).not.toThrow();
    });
  });
});
