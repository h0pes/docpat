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

      // Default activity events: mousedown, mousemove, keypress, scroll, touchstart, click
      expect(addEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('keypress', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('touchstart', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));
    });

    it('should cleanup activity listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderWithProviders(<SessionTimeoutWarning />);
      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalled();
    });
  });

  describe('Warning Dialog', () => {
    it('should show warning dialog before session expires', async () => {
      const sessionTimeout = 30 * 60 * 1000; // 30 minutes
      const warningTime = 5 * 60 * 1000; // 5 minutes

      renderWithProviders(
        <SessionTimeoutWarning
          sessionTimeout={sessionTimeout}
          warningTime={warningTime}
        />
      );

      // Fast-forward to warning time (25 minutes)
      vi.advanceTimersByTime(sessionTimeout - warningTime);

      await waitFor(() => {
        expect(screen.getByText(/session about to expire/i)).toBeInTheDocument();
      });
    });

    it('should display countdown timer in warning dialog', async () => {
      const sessionTimeout = 10000; // 10 seconds
      const warningTime = 5000; // 5 seconds

      renderWithProviders(
        <SessionTimeoutWarning
          sessionTimeout={sessionTimeout}
          warningTime={warningTime}
        />
      );

      // Fast-forward to warning time
      vi.advanceTimersByTime(sessionTimeout - warningTime);

      await waitFor(() => {
        expect(screen.getByText(/time remaining/i)).toBeInTheDocument();
      });
    });

    it('should update countdown every second', async () => {
      const sessionTimeout = 10000; // 10 seconds
      const warningTime = 5000; // 5 seconds

      renderWithProviders(
        <SessionTimeoutWarning
          sessionTimeout={sessionTimeout}
          warningTime={warningTime}
        />
      );

      // Fast-forward to warning time
      vi.advanceTimersByTime(sessionTimeout - warningTime);

      await waitFor(() => {
        expect(screen.getByText(/time remaining/i)).toBeInTheDocument();
      });

      // Advance timer by 1 second
      vi.advanceTimersByTime(1000);

      await waitFor(() => {
        // Timer should have decreased by 1 second
        const timeElement = screen.getByText(/\d+:\d+/);
        expect(timeElement).toBeInTheDocument();
      });
    });
  });

  describe('Session Extension', () => {
    it('should extend session when "Stay Logged In" is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      const sessionTimeout = 10000;
      const warningTime = 5000;

      renderWithProviders(
        <SessionTimeoutWarning
          sessionTimeout={sessionTimeout}
          warningTime={warningTime}
        />
      );

      // Fast-forward to warning time
      vi.advanceTimersByTime(sessionTimeout - warningTime);

      await waitFor(() => {
        expect(screen.getByText(/stay logged in/i)).toBeInTheDocument();
      });

      const stayLoggedInButton = screen.getByText(/stay logged in/i);
      await user.click(stayLoggedInButton);

      await waitFor(() => {
        // Dialog should be hidden
        expect(screen.queryByText(/session about to expire/i)).not.toBeInTheDocument();
      });
    });

    it('should reset timer after extending session', async () => {
      const user = userEvent.setup({ delay: null });
      const sessionTimeout = 10000;
      const warningTime = 5000;

      renderWithProviders(
        <SessionTimeoutWarning
          sessionTimeout={sessionTimeout}
          warningTime={warningTime}
        />
      );

      // Fast-forward to warning time
      vi.advanceTimersByTime(sessionTimeout - warningTime);

      await waitFor(() => {
        expect(screen.getByText(/stay logged in/i)).toBeInTheDocument();
      });

      const stayLoggedInButton = screen.getByText(/stay logged in/i);
      await user.click(stayLoggedInButton);

      // Fast-forward again - should not show warning immediately
      vi.advanceTimersByTime(1000);

      expect(screen.queryByText(/session about to expire/i)).not.toBeInTheDocument();
    });
  });

  describe('Auto-logout', () => {
    it('should logout when "Logout Now" is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      const sessionTimeout = 10000;
      const warningTime = 5000;

      renderWithProviders(
        <SessionTimeoutWarning
          sessionTimeout={sessionTimeout}
          warningTime={warningTime}
        />
      );

      // Fast-forward to warning time
      vi.advanceTimersByTime(sessionTimeout - warningTime);

      await waitFor(() => {
        expect(screen.getByText(/logout now/i)).toBeInTheDocument();
      });

      const logoutButton = screen.getByText(/logout now/i);
      await user.click(logoutButton);

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled();
      });
    });

    it('should auto-logout when timer reaches zero', async () => {
      const sessionTimeout = 10000;
      const warningTime = 5000;

      renderWithProviders(
        <SessionTimeoutWarning
          sessionTimeout={sessionTimeout}
          warningTime={warningTime}
        />
      );

      // Fast-forward to warning time
      vi.advanceTimersByTime(sessionTimeout - warningTime);

      await waitFor(() => {
        expect(screen.getByText(/session about to expire/i)).toBeInTheDocument();
      });

      // Fast-forward through remaining time
      vi.advanceTimersByTime(warningTime + 1000);

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled();
      });
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
    it('should respect custom session timeout', async () => {
      const customTimeout = 5000; // 5 seconds
      const warningTime = 2000; // 2 seconds

      renderWithProviders(
        <SessionTimeoutWarning
          sessionTimeout={customTimeout}
          warningTime={warningTime}
        />
      );

      // Fast-forward to warning time
      vi.advanceTimersByTime(customTimeout - warningTime);

      await waitFor(() => {
        expect(screen.getByText(/session about to expire/i)).toBeInTheDocument();
      });
    });

    it('should respect custom warning time', async () => {
      const sessionTimeout = 10000;
      const customWarningTime = 3000; // 3 seconds before expiry

      renderWithProviders(
        <SessionTimeoutWarning
          sessionTimeout={sessionTimeout}
          warningTime={customWarningTime}
        />
      );

      // Fast-forward to custom warning time
      vi.advanceTimersByTime(sessionTimeout - customWarningTime);

      await waitFor(() => {
        expect(screen.getByText(/session about to expire/i)).toBeInTheDocument();
      });
    });

    it('should support custom activity events', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      const customEvents = ['click', 'scroll'];

      renderWithProviders(
        <SessionTimeoutWarning activityEvents={customEvents} />
      );

      // Should only listen to custom events
      expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function));

      // Should not listen to default events
      expect(addEventListenerSpy).not.toHaveBeenCalledWith('mousedown', expect.any(Function));
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
