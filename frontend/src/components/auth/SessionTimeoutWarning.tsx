/**
 * Session Timeout Warning Component
 *
 * Monitors user activity and displays a warning dialog before session expires.
 * Features:
 * - Tracks user activity (mouse movement, keyboard, clicks)
 * - Warns users 5 minutes before session timeout
 * - Shows countdown timer
 * - Allows session extension
 * - Auto-logout on expiration
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/store/authStore';
import { useToast } from '@/hooks/use-toast';

interface SessionTimeoutWarningProps {
  /** Total session timeout in milliseconds (default: 30 minutes) */
  sessionTimeout?: number;
  /** Warning time before timeout in milliseconds (default: 5 minutes) */
  warningTime?: number;
  /** Events that reset the activity timer */
  activityEvents?: string[];
}

/**
 * Session timeout warning component with activity monitoring
 */
export function SessionTimeoutWarning({
  sessionTimeout = 30 * 60 * 1000, // 30 minutes
  warningTime = 5 * 60 * 1000, // 5 minutes
  activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'],
}: SessionTimeoutWarningProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();

  const [showWarning, setShowWarning] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);

  const lastActivityRef = useRef<number>(Date.now());
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Format remaining time as MM:SS
   */
  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  /**
   * Clear all timers
   */
  const clearAllTimers = useCallback(() => {
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  /**
   * Handle session expiration - logout user
   */
  const handleSessionExpired = useCallback(() => {
    clearAllTimers();
    setShowWarning(false);

    logout();

    toast({
      variant: 'destructive',
      title: t('auth.sessionExpired'),
      description: t('auth.sessionExpiredDescription'),
    });

    navigate('/login', { replace: true });
  }, [clearAllTimers, logout, navigate, t, toast]);

  /**
   * Show warning dialog
   */
  const showWarningDialog = useCallback(() => {
    setShowWarning(true);
    setRemainingTime(warningTime);

    // Start countdown
    countdownIntervalRef.current = setInterval(() => {
      setRemainingTime((prev) => {
        const newTime = prev - 1000;
        if (newTime <= 0) {
          handleSessionExpired();
        }
        return newTime;
      });
    }, 1000);

    // Set final logout timer
    logoutTimerRef.current = setTimeout(() => {
      handleSessionExpired();
    }, warningTime);
  }, [warningTime, handleSessionExpired]);

  /**
   * Reset activity timer - called on user activity
   */
  const resetActivityTimer = useCallback(() => {
    lastActivityRef.current = Date.now();

    // Clear existing timers
    clearAllTimers();

    // Hide warning if showing
    if (showWarning) {
      setShowWarning(false);
    }

    // Set warning timer
    const timeUntilWarning = sessionTimeout - warningTime;
    warningTimerRef.current = setTimeout(() => {
      showWarningDialog();
    }, timeUntilWarning);
  }, [sessionTimeout, warningTime, showWarning, clearAllTimers, showWarningDialog]);

  /**
   * Handle "Stay Logged In" button click
   */
  const handleStayLoggedIn = () => {
    resetActivityTimer();
    setShowWarning(false);

    toast({
      title: t('auth.sessionExtended'),
      description: t('auth.sessionExtendedDescription'),
    });
  };

  /**
   * Handle "Logout" button click
   */
  const handleLogoutNow = () => {
    handleSessionExpired();
  };

  /**
   * Set up activity listeners
   */
  useEffect(() => {
    if (!isAuthenticated) {
      clearAllTimers();
      setShowWarning(false);
      return;
    }

    // Initialize activity timer
    resetActivityTimer();

    // Add activity event listeners
    const activityHandler = () => {
      // Throttle: only reset if more than 1 second since last activity
      const now = Date.now();
      if (now - lastActivityRef.current > 1000) {
        resetActivityTimer();
      }
    };

    activityEvents.forEach((event) => {
      window.addEventListener(event, activityHandler, { passive: true });
    });

    // Cleanup
    return () => {
      clearAllTimers();
      activityEvents.forEach((event) => {
        window.removeEventListener(event, activityHandler);
      });
    };
  }, [isAuthenticated, activityEvents, resetActivityTimer, clearAllTimers]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Dialog open={showWarning} onOpenChange={setShowWarning}>
      <DialogContent
        className="sm:max-w-md"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {t('auth.sessionTimeout.title')}
          </DialogTitle>
          <DialogDescription>
            {t('auth.sessionTimeout.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center py-6">
          <div className="flex flex-col items-center gap-2">
            <Clock className="h-12 w-12 text-muted-foreground" />
            <div className="text-4xl font-mono font-bold text-destructive">
              {formatTime(remainingTime)}
            </div>
            <p className="text-sm text-muted-foreground">
              {t('auth.sessionTimeout.timeRemaining')}
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={handleLogoutNow}
            className="w-full sm:w-auto"
          >
            {t('auth.logoutNow')}
          </Button>
          <Button onClick={handleStayLoggedIn} className="w-full sm:w-auto">
            {t('auth.stayLoggedIn')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
