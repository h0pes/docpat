/**
 * DatabaseStatusCard Component
 *
 * Displays database connection status and pool statistics.
 * Shows health status, latency, and connection pool metrics.
 */

import { useTranslation } from 'react-i18next';
import {
  Database,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader2,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type {
  DetailedHealthResponse,
  ComponentHealth,
  HealthStatus,
} from '@/types/system';
import { getHealthStatusColor } from '@/types/system';

interface DatabaseStatusCardProps {
  /** Detailed health response data */
  data: DetailedHealthResponse | undefined;
  /** Whether data is loading */
  isLoading: boolean;
}

/**
 * Get icon component for health status
 */
function StatusIcon({ status }: { status: HealthStatus }) {
  switch (status) {
    case 'healthy':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'degraded':
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    case 'unhealthy':
      return <XCircle className="h-5 w-5 text-red-500" />;
    default:
      return null;
  }
}

/**
 * DatabaseStatusCard displays database health and connection pool info
 */
export function DatabaseStatusCard({ data, isLoading }: DatabaseStatusCardProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t('system.database.title')}
          </CardTitle>
          <Database className="h-4 w-4 text-muted-foreground" />
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

  // Find database component health
  const dbHealth = data.components.find((c: ComponentHealth) => c.name === 'database');
  const poolHealth = data.components.find((c: ComponentHealth) => c.name === 'connection_pool');
  const pool = data.database_pool;

  // Calculate pool usage percentage
  const poolUsagePercent = pool
    ? Math.round((pool.in_use / pool.max_connections) * 100)
    : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {t('system.database.title')}
        </CardTitle>
        <Database className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {t('system.database.status')}
          </span>
          <div className="flex items-center gap-2">
            {dbHealth && <StatusIcon status={dbHealth.status} />}
            <Badge className={getHealthStatusColor(dbHealth?.status || 'healthy')}>
              {dbHealth?.status === 'healthy'
                ? t('system.status.healthy')
                : dbHealth?.status === 'degraded'
                ? t('system.status.degraded')
                : t('system.status.unhealthy')}
            </Badge>
          </div>
        </div>

        {/* Latency */}
        {dbHealth?.latency_ms !== null && dbHealth?.latency_ms !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {t('system.database.latency')}
            </span>
            <span className="text-sm font-medium">
              {dbHealth.latency_ms}ms
            </span>
          </div>
        )}

        {/* Connection Pool */}
        {pool && (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {t('system.database.pool_usage')}
                </span>
                <span className="font-medium">
                  {pool.in_use} / {pool.max_connections}
                </span>
              </div>
              <Progress value={poolUsagePercent} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t('system.database.pool_size')}
                </span>
                <span className="font-medium">{pool.size}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t('system.database.available')}
                </span>
                <span className="font-medium">{pool.available}</span>
              </div>
            </div>
          </>
        )}

        {/* Pool Health Warning */}
        {poolHealth?.status === 'degraded' && poolHealth.message && (
          <p className="text-xs text-yellow-600 dark:text-yellow-400">
            {poolHealth.message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
