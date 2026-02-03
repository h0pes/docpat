/**
 * NotificationList Component
 *
 * Displays a list of notifications with loading, empty,
 * and error states.
 */

import { useTranslation } from 'react-i18next';
import { Mail, Loader2, AlertCircle } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { NotificationCard } from './NotificationCard';
import { EmptyState } from '@/components/ui/empty-state';
import type { NotificationResponse } from '@/types/notification';

/**
 * Props for NotificationList
 */
interface NotificationListProps {
  notifications: NotificationResponse[];
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: (id: string) => void;
  onCancel?: (id: string) => void;
  retryingId?: string;
  cancellingId?: string;
  hasMore?: boolean;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
}

/**
 * NotificationList component
 *
 * @param props - Component props
 * @returns NotificationList component
 */
export function NotificationList({
  notifications,
  isLoading,
  error,
  onRetry,
  onCancel,
  retryingId,
  cancellingId,
  hasMore,
  onLoadMore,
  isLoadingMore,
}: NotificationListProps) {
  const { t } = useTranslation();

  // Loading state
  if (isLoading && notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t('common.error')}</AlertTitle>
        <AlertDescription>
          {error.message || t('notifications.errors.load_failed')}
        </AlertDescription>
      </Alert>
    );
  }

  // Empty state
  if (notifications.length === 0) {
    return (
      <EmptyState
        variant="compact"
        icon={Mail}
        title={t('notifications.empty.title')}
        description={t('notifications.empty.description')}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Notification Cards */}
      {notifications.map((notification) => (
        <NotificationCard
          key={notification.id}
          notification={notification}
          onRetry={onRetry}
          onCancel={onCancel}
          isRetrying={retryingId === notification.id}
          isCancelling={cancellingId === notification.id}
        />
      ))}

      {/* Load More */}
      {hasMore && onLoadMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={onLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('common.loading')}
              </>
            ) : (
              t('common.load_more')
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
