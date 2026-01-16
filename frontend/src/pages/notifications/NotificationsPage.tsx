/**
 * NotificationsPage Component
 *
 * Main page for viewing and managing notifications.
 * Accessible by both ADMIN and DOCTOR roles.
 * Displays notification list, statistics, and filters.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  useNotifications,
  useNotificationStatistics,
  useRetryNotification,
  useCancelNotification,
} from '@/hooks/useNotifications';
import { NotificationList, NotificationFilters } from '@/components/notifications';
import type { NotificationFilter } from '@/types/notification';

/**
 * Default page size for notifications
 */
const DEFAULT_PAGE_SIZE = 20;

/**
 * NotificationsPage component
 *
 * @returns NotificationsPage component
 */
export function NotificationsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();

  // Filter state
  const [filters, setFilters] = useState<NotificationFilter>({
    limit: DEFAULT_PAGE_SIZE,
    offset: 0,
  });

  // Confirmation dialog state
  const [confirmAction, setConfirmAction] = useState<{
    type: 'retry' | 'cancel';
    id: string;
  } | null>(null);

  // Fetch data
  const {
    data: notificationsData,
    isLoading,
    error,
    refetch,
  } = useNotifications(filters);
  const { data: statistics, isLoading: isLoadingStats } =
    useNotificationStatistics();

  // Mutations
  const retryMutation = useRetryNotification();
  const cancelMutation = useCancelNotification();

  /**
   * Handle retry notification
   */
  const handleRetry = async (id: string) => {
    setConfirmAction({ type: 'retry', id });
  };

  /**
   * Handle cancel notification
   */
  const handleCancel = async (id: string) => {
    setConfirmAction({ type: 'cancel', id });
  };

  /**
   * Confirm and execute action
   */
  const executeAction = async () => {
    if (!confirmAction) return;

    try {
      if (confirmAction.type === 'retry') {
        await retryMutation.mutateAsync(confirmAction.id);
        toast({
          title: t('notifications.actions.retry_success'),
          description: t('notifications.actions.retry_success_description'),
        });
      } else {
        await cancelMutation.mutateAsync(confirmAction.id);
        toast({
          title: t('notifications.actions.cancel_success'),
          description: t('notifications.actions.cancel_success_description'),
        });
      }
    } catch (error) {
      toast({
        title: t('common.error'),
        description:
          error instanceof Error
            ? error.message
            : t('notifications.actions.action_failed'),
        variant: 'destructive',
      });
    } finally {
      setConfirmAction(null);
    }
  };

  /**
   * Load more notifications
   */
  const handleLoadMore = () => {
    setFilters((prev) => ({
      ...prev,
      offset: (prev.offset || 0) + DEFAULT_PAGE_SIZE,
    }));
  };

  const notifications = notificationsData?.notifications || [];
  const total = notificationsData?.total || 0;
  const hasMore = notifications.length < total;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-8 w-8 text-muted-foreground" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {t('notifications.title')}
            </h1>
            <p className="text-muted-foreground">
              {t('notifications.description')}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {t('common.refresh')}
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('notifications.stats.total')}
            </CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingStats ? '...' : statistics?.total_notifications ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('notifications.stats.all_time')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('notifications.stats.pending')}
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {isLoadingStats ? '...' : statistics?.pending_count ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('notifications.stats.awaiting_delivery')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('notifications.stats.sent_today')}
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {isLoadingStats ? '...' : statistics?.sent_today ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('notifications.stats.delivered_today')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('notifications.stats.failed')}
            </CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {isLoadingStats ? '...' : statistics?.failed_count ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('notifications.stats.require_attention')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {t('notifications.filters.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <NotificationFilters filters={filters} onFiltersChange={setFilters} />
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {t('notifications.list.title')}
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              {t('notifications.list.showing', {
                count: notifications.length,
                total,
              })}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <NotificationList
            notifications={notifications}
            isLoading={isLoading}
            error={error as Error | null}
            onRetry={handleRetry}
            onCancel={handleCancel}
            retryingId={
              retryMutation.isPending ? confirmAction?.id : undefined
            }
            cancellingId={
              cancelMutation.isPending ? confirmAction?.id : undefined
            }
            hasMore={hasMore}
            onLoadMore={handleLoadMore}
          />
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === 'retry'
                ? t('notifications.dialogs.retry_title')
                : t('notifications.dialogs.cancel_title')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'retry'
                ? t('notifications.dialogs.retry_description')
                : t('notifications.dialogs.cancel_description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeAction}
              className={
                confirmAction?.type === 'cancel'
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : ''
              }
            >
              {confirmAction?.type === 'retry'
                ? t('notifications.actions.retry')
                : t('notifications.actions.cancel')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
