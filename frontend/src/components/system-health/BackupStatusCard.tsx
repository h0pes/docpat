/**
 * BackupStatusCard Component
 *
 * Displays backup status information including last backup details
 * and next scheduled backup time.
 */

import { useTranslation } from 'react-i18next';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Archive,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { BackupStatusResponse } from '@/types/system';
import { formatSize } from '@/types/system';

interface BackupStatusCardProps {
  /** Backup status data */
  data: BackupStatusResponse | undefined;
  /** Whether data is loading */
  isLoading: boolean;
}

/**
 * BackupStatusCard displays backup configuration and last backup info
 */
export function BackupStatusCard({ data, isLoading }: BackupStatusCardProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t('system.backup.title')}
          </CardTitle>
          <Archive className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="flex h-32 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const { enabled, last_backup, next_scheduled, retention_days } = data;

  // Determine backup status
  const getStatusBadge = () => {
    if (!enabled) {
      return (
        <Badge variant="secondary">
          <XCircle className="mr-1 h-3 w-3" />
          {t('system.backup.disabled')}
        </Badge>
      );
    }
    if (!last_backup) {
      return (
        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
          <AlertTriangle className="mr-1 h-3 w-3" />
          {t('system.backup.no_backup')}
        </Badge>
      );
    }
    if (last_backup.status === 'success') {
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
          <CheckCircle className="mr-1 h-3 w-3" />
          {t('system.backup.success')}
        </Badge>
      );
    }
    return (
      <Badge variant="destructive">
        <XCircle className="mr-1 h-3 w-3" />
        {t('system.backup.failed')}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {t('system.backup.title')}
        </CardTitle>
        <Archive className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {t('system.backup.status')}
          </span>
          {getStatusBadge()}
        </div>

        {/* Last Backup Info */}
        {last_backup && (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {t('system.backup.last_backup')}
              </span>
              <span className="font-medium">
                {formatDistanceToNow(new Date(last_backup.timestamp), { addSuffix: true })}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {t('system.backup.backup_time')}
              </span>
              <span className="font-medium">
                {format(new Date(last_backup.timestamp), 'PPp')}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {t('system.backup.size')}
              </span>
              <span className="font-medium">{formatSize(last_backup.size_mb)}</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {t('system.backup.duration')}
              </span>
              <span className="font-medium">
                {last_backup.duration_seconds}s
              </span>
            </div>
          </>
        )}

        {/* Next Scheduled */}
        {next_scheduled && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              {t('system.backup.next_scheduled')}
            </div>
            <span className="font-medium">
              {format(new Date(next_scheduled), 'PPp')}
            </span>
          </div>
        )}

        {/* Retention */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {t('system.backup.retention')}
          </span>
          <span className="font-medium">
            {retention_days} {t('system.backup.days')}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
