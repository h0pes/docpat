/**
 * SystemHealthPage Component
 *
 * Admin-only page displaying system health monitoring dashboard.
 * Shows database status, storage usage, backup status, system info,
 * and provides quick action links to admin functions.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  RefreshCw,
  Activity,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  DatabaseStatusCard,
  StorageUsageCard,
  BackupStatusCard,
  SystemInfoCard,
  QuickActionsCard,
} from '@/components/system-health';
import { useAllSystemHealth } from '@/hooks/useSystemHealth';
import { getHealthStatusColor } from '@/types/system';

/**
 * SystemHealthPage displays the system health monitoring dashboard
 */
export function SystemHealthPage() {
  const { t } = useTranslation();
  const [autoRefresh, setAutoRefresh] = useState(false);

  const {
    health,
    info,
    storage,
    backup,
    isLoading,
    refetchAll,
  } = useAllSystemHealth(autoRefresh, 30000);

  // Get overall status icon
  const getStatusIcon = () => {
    const status = health.data?.status;
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'unhealthy':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t('system.page.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('system.page.description')}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Overall Status Badge */}
          {health.data && (
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <Badge className={getHealthStatusColor(health.data.status)}>
                {health.data.status === 'healthy'
                  ? t('system.status.healthy')
                  : health.data.status === 'degraded'
                  ? t('system.status.degraded')
                  : t('system.status.unhealthy')}
              </Badge>
            </div>
          )}

          {/* Auto-refresh Toggle */}
          <div className="flex items-center gap-2">
            <Switch
              id="auto-refresh"
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
            />
            <Label htmlFor="auto-refresh" className="text-sm">
              {t('system.page.auto_refresh')}
            </Label>
          </div>

          {/* Manual Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchAll()}
            disabled={isLoading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </Button>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Database Status */}
        <DatabaseStatusCard
          data={health.data}
          isLoading={health.isLoading}
        />

        {/* Storage Usage */}
        <StorageUsageCard
          data={storage.data}
          isLoading={storage.isLoading}
        />

        {/* Backup Status */}
        <BackupStatusCard
          data={backup.data}
          isLoading={backup.isLoading}
        />
      </div>

      {/* Bottom Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* System Info */}
        <SystemInfoCard
          data={info.data}
          isLoading={info.isLoading}
        />

        {/* Quick Actions */}
        <QuickActionsCard />
      </div>

      {/* Last Updated */}
      {health.data && (
        <p className="text-xs text-muted-foreground text-center">
          {t('system.page.last_updated')}: {new Date(health.data.timestamp).toLocaleString()}
        </p>
      )}
    </div>
  );
}
