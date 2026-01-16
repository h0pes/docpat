/**
 * BackupSettingsSection Component
 *
 * Settings section for backup configuration and status display.
 * Shows backup status, last backup details, and retention settings.
 * Read-only display as backup configuration is done via environment variables.
 */

import { useTranslation } from 'react-i18next';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Archive,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  HardDrive,
  Calendar,
  Timer,
  RefreshCw,
} from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SettingsSection, SettingsRow, SettingsDivider } from './SettingsSection';
import { useBackupStatus } from '@/hooks/useSystemHealth';
import { formatSize } from '@/types/system';

/**
 * BackupSettingsSection component
 *
 * Displays backup configuration and status in the settings page.
 * All settings are read-only as they are configured via environment.
 *
 * @returns BackupSettingsSection component
 */
export function BackupSettingsSection() {
  const { t } = useTranslation();
  const { data: backupData, isLoading, isError, refetch, isRefetching } = useBackupStatus();

  /**
   * Get status badge based on backup state
   */
  const getStatusBadge = () => {
    if (!backupData?.enabled) {
      return (
        <Badge variant="secondary">
          <XCircle className="mr-1 h-3 w-3" />
          {t('settings.backup.disabled')}
        </Badge>
      );
    }
    if (!backupData.last_backup) {
      return (
        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
          <AlertTriangle className="mr-1 h-3 w-3" />
          {t('settings.backup.no_backup_yet')}
        </Badge>
      );
    }
    if (backupData.last_backup.status === 'success') {
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
          <CheckCircle className="mr-1 h-3 w-3" />
          {t('settings.backup.status_ok')}
        </Badge>
      );
    }
    return (
      <Badge variant="destructive">
        <XCircle className="mr-1 h-3 w-3" />
        {t('settings.backup.status_error')}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <SettingsSection
        title={t('settings.backup.title')}
        description={t('settings.backup.description')}
        icon={<Archive className="h-5 w-5" />}
      >
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-muted rounded" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-10 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
          </div>
        </div>
      </SettingsSection>
    );
  }

  if (isError || !backupData) {
    return (
      <SettingsSection
        title={t('settings.backup.title')}
        description={t('settings.backup.description')}
        icon={<Archive className="h-5 w-5" />}
      >
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t('common.error')}</AlertTitle>
          <AlertDescription>
            {t('settings.backup.load_error')}
          </AlertDescription>
        </Alert>
        <Button onClick={() => refetch()} className="mt-4">
          {t('common.actions.retry')}
        </Button>
      </SettingsSection>
    );
  }

  return (
    <SettingsSection
      title={t('settings.backup.title')}
      description={t('settings.backup.description')}
      icon={<Archive className="h-5 w-5" />}
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
          {t('common.actions.refresh')}
        </Button>
      }
    >
      {/* Configuration Notice */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{t('settings.backup.config_notice_title')}</AlertTitle>
        <AlertDescription>
          {t('settings.backup.config_notice_description')}
        </AlertDescription>
      </Alert>

      {/* Status Overview */}
      <div className="space-y-4 mt-6">
        <div className="flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-medium">{t('settings.backup.status_section')}</h4>
        </div>

        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {t('settings.backup.backup_status')}
            </span>
            {getStatusBadge()}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {t('settings.backup.backup_enabled')}
            </span>
            <span className="text-sm font-medium">
              {backupData.enabled ? t('common.yes') : t('common.no')}
            </span>
          </div>
        </div>
      </div>

      {/* Last Backup Details */}
      {backupData.last_backup && (
        <>
          <SettingsDivider />

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-medium">{t('settings.backup.last_backup_section')}</h4>
            </div>

            <SettingsRow>
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">
                  {t('settings.backup.last_backup_time')}
                </span>
                <p className="text-sm font-medium">
                  {format(new Date(backupData.last_backup.timestamp), 'PPp')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(backupData.last_backup.timestamp), { addSuffix: true })}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">
                  {t('settings.backup.backup_size')}
                </span>
                <p className="text-sm font-medium">
                  {formatSize(backupData.last_backup.size_mb)}
                </p>
              </div>
            </SettingsRow>

            <SettingsRow>
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">
                  {t('settings.backup.backup_duration')}
                </span>
                <p className="text-sm font-medium">
                  {backupData.last_backup.duration_seconds}s
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">
                  {t('settings.backup.backup_file')}
                </span>
                <p className="text-sm font-medium font-mono text-xs truncate max-w-[200px]">
                  {backupData.last_backup.filename}
                </p>
              </div>
            </SettingsRow>
          </div>
        </>
      )}

      {/* Configuration Details */}
      <SettingsDivider />

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-medium">{t('settings.backup.configuration_section')}</h4>
        </div>

        <SettingsRow>
          <div className="space-y-1">
            <span className="text-sm text-muted-foreground">
              {t('settings.backup.backup_location')}
            </span>
            <p className="text-sm font-medium font-mono text-xs truncate max-w-[200px]">
              {backupData.backup_location || t('settings.backup.not_configured')}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-sm text-muted-foreground">
              {t('settings.backup.retention_days')}
            </span>
            <p className="text-sm font-medium">
              {backupData.retention_days} {t('common.days')}
            </p>
          </div>
        </SettingsRow>

        {/* Next Scheduled */}
        {backupData.next_scheduled && (
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-sm">{t('settings.backup.next_scheduled')}</span>
            </div>
            <span className="text-sm font-medium">
              {format(new Date(backupData.next_scheduled), 'PPp')}
            </span>
          </div>
        )}
      </div>
    </SettingsSection>
  );
}
