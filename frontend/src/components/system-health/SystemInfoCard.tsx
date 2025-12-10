/**
 * SystemInfoCard Component
 *
 * Displays system information including application version,
 * server details, database info, and environment configuration.
 */

import { useTranslation } from 'react-i18next';
import {
  Server,
  Package,
  Clock,
  Globe,
  Database,
  Cpu,
  Loader2,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { SystemInfoResponse } from '@/types/system';
import { formatUptime } from '@/types/system';

interface SystemInfoCardProps {
  /** System information data */
  data: SystemInfoResponse | undefined;
  /** Whether data is loading */
  isLoading: boolean;
}

/**
 * SystemInfoCard displays comprehensive system information
 */
export function SystemInfoCard({ data, isLoading }: SystemInfoCardProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t('system.info.title')}
          </CardTitle>
          <Server className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const { application, server, database, environment } = data;

  // Determine environment badge color
  const getEnvBadgeClass = () => {
    switch (environment.environment.toLowerCase()) {
      case 'production':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'staging':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {t('system.info.title')}
        </CardTitle>
        <Server className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Application Info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Package className="h-4 w-4" />
            {t('system.info.application')}
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm pl-6">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t('system.info.version')}
              </span>
              <Badge variant="outline">{application.version}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t('system.info.rust_version')}
              </span>
              <span className="font-medium">{application.rust_version}</span>
            </div>
          </div>
          {application.git_commit && (
            <div className="flex justify-between text-sm pl-6">
              <span className="text-muted-foreground">
                {t('system.info.git_commit')}
              </span>
              <code className="text-xs bg-muted px-1 rounded">
                {application.git_commit.substring(0, 8)}
              </code>
            </div>
          )}
        </div>

        <Separator />

        {/* Server Info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Cpu className="h-4 w-4" />
            {t('system.info.server')}
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm pl-6">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t('system.info.hostname')}
              </span>
              <span className="font-medium truncate max-w-[120px]" title={server.hostname}>
                {server.hostname}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t('system.info.os')}
              </span>
              <span className="font-medium">{server.os} ({server.arch})</span>
            </div>
          </div>
          <div className="flex justify-between text-sm pl-6">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              {t('system.info.uptime')}
            </div>
            <span className="font-medium">{formatUptime(server.uptime_seconds)}</span>
          </div>
        </div>

        <Separator />

        {/* Database Info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Database className="h-4 w-4" />
            {t('system.info.database')}
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm pl-6">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t('system.info.db_version')}
              </span>
              <span className="font-medium">{database.version}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t('system.info.db_name')}
              </span>
              <span className="font-medium">{database.database_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t('system.info.tables')}
              </span>
              <span className="font-medium">{database.total_tables}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t('system.info.pool_size')}
              </span>
              <span className="font-medium">{database.connection_pool_size}</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Environment Info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Globe className="h-4 w-4" />
            {t('system.info.environment')}
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm pl-6">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t('system.info.env_name')}
              </span>
              <Badge className={getEnvBadgeClass()}>
                {environment.environment}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t('system.info.log_level')}
              </span>
              <span className="font-medium">{environment.log_level}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t('system.info.debug_mode')}
              </span>
              <span className="font-medium">
                {environment.debug_mode ? t('common.yes') : t('common.no')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t('system.info.timezone')}
              </span>
              <span className="font-medium">{environment.timezone}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
