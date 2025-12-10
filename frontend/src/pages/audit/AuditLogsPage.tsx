/**
 * AuditLogsPage Component
 *
 * Main page for viewing, filtering, and exporting audit logs.
 * Requires ADMIN role for access.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format, subDays } from 'date-fns';
import { Shield, Download, BarChart3, List, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AuditFilters,
  AuditLogTable,
  AuditLogDetail,
  AuditExportDialog,
  AuditStatistics,
} from '@/components/audit';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import type { AuditLog, AuditLogsFilter } from '@/types/audit';

/**
 * AuditLogsPage provides a comprehensive audit log viewer
 */
export function AuditLogsPage() {
  const { t } = useTranslation();

  // Initialize filter with last 7 days
  const [filter, setFilter] = useState<AuditLogsFilter>({
    date_from: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    date_to: format(new Date(), 'yyyy-MM-dd'),
    page: 1,
    page_size: 50,
  });

  // Selected log for detail view
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Export dialog state
  const [exportOpen, setExportOpen] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState<'logs' | 'statistics'>('logs');

  // Fetch audit logs
  const {
    data: logsData,
    isLoading,
    isFetching,
    refetch,
  } = useAuditLogs(filter, {
    enabled: activeTab === 'logs',
  });

  // Handle viewing log details
  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setDetailOpen(true);
  };

  // Handle filter change
  const handleFilterChange = (newFilter: AuditLogsFilter) => {
    setFilter(newFilter);
  };

  return (
    <div className="container mx-auto space-y-6 py-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Shield className="h-6 w-6" />
            {t('audit.page.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('audit.page.description')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`}
            />
            {t('common.refresh')}
          </Button>
          <Button size="sm" onClick={() => setExportOpen(true)}>
            <Download className="mr-2 h-4 w-4" />
            {t('audit.page.export')}
          </Button>
        </div>
      </div>

      {/* Tabs for Logs and Statistics */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'logs' | 'statistics')}
      >
        <TabsList>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            {t('audit.tabs.logs')}
          </TabsTrigger>
          <TabsTrigger value="statistics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            {t('audit.tabs.statistics')}
          </TabsTrigger>
        </TabsList>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
            {/* Filters Sidebar */}
            <aside className="lg:sticky lg:top-20 lg:h-fit">
              <AuditFilters
                filter={filter}
                onFilterChange={handleFilterChange}
                isLoading={isLoading}
              />
            </aside>

            {/* Logs Table */}
            <main>
              <AuditLogTable
                logs={logsData?.logs || []}
                total={logsData?.total || 0}
                page={logsData?.page || 1}
                pageSize={logsData?.page_size || 50}
                totalPages={logsData?.total_pages || 0}
                filter={filter}
                onFilterChange={handleFilterChange}
                onViewDetails={handleViewDetails}
                isLoading={isLoading}
              />
            </main>
          </div>
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="statistics">
          <AuditStatistics />
        </TabsContent>
      </Tabs>

      {/* Log Detail Dialog */}
      <AuditLogDetail
        log={selectedLog}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />

      {/* Export Dialog */}
      <AuditExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        currentFilter={filter}
      />
    </div>
  );
}
