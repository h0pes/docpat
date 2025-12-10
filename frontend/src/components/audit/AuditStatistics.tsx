/**
 * AuditStatistics Component
 *
 * Dashboard cards showing audit log statistics including
 * totals, breakdowns by action and entity type, and top users.
 */

import { useTranslation } from 'react-i18next';
import {
  FileText,
  Calendar,
  CalendarDays,
  CalendarRange,
  Users,
  Activity,
  Loader2,
  TrendingUp,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuditLogStatistics } from '@/hooks/useAuditLogs';
import { getActionDisplayName, getEntityTypeDisplayName, getActionColor } from '@/types/audit';

/**
 * AuditStatistics displays overview statistics for audit logs
 */
export function AuditStatistics() {
  const { t } = useTranslation();
  const { data: stats, isLoading, error } = useAuditLogStatistics();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return null;
  }

  // Calculate max for progress bars
  const maxActionCount = Math.max(...stats.actions_breakdown.map((a) => a.count), 1);
  const maxEntityCount = Math.max(
    ...stats.entity_types_breakdown.map((e) => e.count),
    1
  );

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Logs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('audit.stats.total_logs')}
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.total_logs.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('audit.stats.all_time')}
            </p>
          </CardContent>
        </Card>

        {/* Today */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('audit.stats.today')}
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.logs_today.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('audit.stats.logs_count')}
            </p>
          </CardContent>
        </Card>

        {/* This Week */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('audit.stats.this_week')}
            </CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.logs_this_week.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('audit.stats.logs_count')}
            </p>
          </CardContent>
        </Card>

        {/* This Month */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('audit.stats.this_month')}
            </CardTitle>
            <CalendarRange className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.logs_this_month.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('audit.stats.logs_count')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Actions Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4" />
              {t('audit.stats.actions_breakdown')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.actions_breakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('audit.stats.no_data')}
              </p>
            ) : (
              stats.actions_breakdown.map((action) => (
                <div key={action.action} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <Badge
                      className={getActionColor(action.action)}
                      variant="outline"
                    >
                      {getActionDisplayName(action.action)}
                    </Badge>
                    <span className="font-medium">
                      {action.count.toLocaleString()}
                    </span>
                  </div>
                  <Progress
                    value={(action.count / maxActionCount) * 100}
                    className="h-2"
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Entity Types Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              {t('audit.stats.entity_breakdown')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.entity_types_breakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('audit.stats.no_data')}
              </p>
            ) : (
              stats.entity_types_breakdown.slice(0, 6).map((entity) => (
                <div key={entity.entity_type} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{getEntityTypeDisplayName(entity.entity_type)}</span>
                    <span className="font-medium">
                      {entity.count.toLocaleString()}
                    </span>
                  </div>
                  <Progress
                    value={(entity.count / maxEntityCount) * 100}
                    className="h-2"
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Top Users */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              {t('audit.stats.top_users')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.top_users.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('audit.stats.no_data')}
              </p>
            ) : (
              <div className="space-y-3">
                {stats.top_users.slice(0, 5).map((user, index) => (
                  <div
                    key={user.user_id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                        {index + 1}
                      </span>
                      <span className="text-sm truncate max-w-[150px]">
                        {user.user_email || t('audit.stats.unknown_user')}
                      </span>
                    </div>
                    <Badge variant="secondary">
                      {user.count.toLocaleString()}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              {t('audit.stats.top_users_period')}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
