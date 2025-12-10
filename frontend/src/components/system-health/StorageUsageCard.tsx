/**
 * StorageUsageCard Component
 *
 * Displays storage usage statistics for database and file system.
 * Shows disk space, database size, and breakdown by category.
 */

import { useTranslation } from 'react-i18next';
import {
  HardDrive,
  Database,
  FileText,
  Upload,
  ScrollText,
  Loader2,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { StorageStatsResponse } from '@/types/system';
import { formatSize, getUsageColor, getUsageTextColor } from '@/types/system';

interface StorageUsageCardProps {
  /** Storage statistics data */
  data: StorageStatsResponse | undefined;
  /** Whether data is loading */
  isLoading: boolean;
}

/**
 * StorageUsageCard displays disk and database storage statistics
 */
export function StorageUsageCard({ data, isLoading }: StorageUsageCardProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t('system.storage.title')}
          </CardTitle>
          <HardDrive className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const { database, file_system } = data;
  const diskPercent = Math.round(file_system.disk_usage_percent);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {t('system.storage.title')}
        </CardTitle>
        <HardDrive className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Disk Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {t('system.storage.disk_usage')}
            </span>
            <span className={`font-medium ${getUsageTextColor(diskPercent)}`}>
              {diskPercent}%
            </span>
          </div>
          <Progress
            value={diskPercent}
            className={`h-2 [&>div]:${getUsageColor(diskPercent)}`}
          />
          <p className="text-xs text-muted-foreground">
            {file_system.available_disk_gb.toFixed(1)} GB {t('system.storage.available')} / {file_system.total_disk_gb.toFixed(1)} GB {t('system.storage.total')}
          </p>
        </div>

        {/* Database Storage */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Database className="h-4 w-4" />
            {t('system.storage.database')}
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm pl-6">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t('system.storage.db_total')}
              </span>
              <span className="font-medium">{formatSize(database.total_size_mb)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t('system.storage.tables')}
              </span>
              <span className="font-medium">{formatSize(database.tables_size_mb)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t('system.storage.indexes')}
              </span>
              <span className="font-medium">{formatSize(database.indexes_size_mb)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t('system.storage.rows')}
              </span>
              <span className="font-medium">{database.estimated_rows.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* File System Breakdown */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <FileText className="h-4 w-4" />
            {t('system.storage.files')}
          </div>
          <div className="space-y-1 text-sm pl-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileText className="h-3 w-3" />
                {t('system.storage.documents')}
              </div>
              <span className="font-medium">{formatSize(file_system.documents_size_mb)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Upload className="h-3 w-3" />
                {t('system.storage.uploads')}
              </div>
              <span className="font-medium">{formatSize(file_system.uploads_size_mb)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <ScrollText className="h-3 w-3" />
                {t('system.storage.logs')}
              </div>
              <span className="font-medium">{formatSize(file_system.logs_size_mb)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
