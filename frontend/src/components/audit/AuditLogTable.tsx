/**
 * AuditLogTable Component
 *
 * Table display for audit log entries with pagination,
 * sorting, and action details.
 */

import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  Loader2,
  FileText,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { AuditLog, AuditLogsFilter } from '@/types/audit';
import {
  getActionDisplayName,
  getEntityTypeDisplayName,
  getActionColor,
} from '@/types/audit';

interface AuditLogTableProps {
  /** Array of audit log entries */
  logs: AuditLog[];
  /** Total number of entries (for pagination) */
  total: number;
  /** Current page number */
  page: number;
  /** Items per page */
  pageSize: number;
  /** Total pages */
  totalPages: number;
  /** Current filter state */
  filter: AuditLogsFilter;
  /** Callback when filter/pagination changes */
  onFilterChange: (filter: AuditLogsFilter) => void;
  /** Callback when viewing log details */
  onViewDetails: (log: AuditLog) => void;
  /** Loading state */
  isLoading?: boolean;
}

/**
 * AuditLogTable displays audit logs in a paginated table format
 */
export function AuditLogTable({
  logs,
  total,
  page,
  pageSize,
  totalPages,
  filter,
  onFilterChange,
  onViewDetails,
  isLoading = false,
}: AuditLogTableProps) {
  const { t } = useTranslation();

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      onFilterChange({ ...filter, page: newPage });
    }
  };

  // Handle page size change
  const handlePageSizeChange = (newSize: string) => {
    onFilterChange({ ...filter, page_size: parseInt(newSize), page: 1 });
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    try {
      return format(new Date(timestamp), 'yyyy-MM-dd HH:mm:ss');
    } catch {
      return timestamp;
    }
  };

  // Truncate long text
  const truncate = (text: string | null, maxLength: number = 20) => {
    if (!text) return '-';
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
        <FileText className="mb-4 h-12 w-12" />
        <p className="text-lg font-medium">{t('audit.table.no_logs')}</p>
        <p className="text-sm">{t('audit.table.no_logs_hint')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Results count */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {t('audit.table.showing', {
            from: (page - 1) * pageSize + 1,
            to: Math.min(page * pageSize, total),
            total,
          })}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">
                {t('audit.table.timestamp')}
              </TableHead>
              <TableHead>{t('audit.table.user')}</TableHead>
              <TableHead className="w-[100px]">
                {t('audit.table.action')}
              </TableHead>
              <TableHead>{t('audit.table.entity_type')}</TableHead>
              <TableHead>{t('audit.table.entity_id')}</TableHead>
              <TableHead className="hidden lg:table-cell">
                {t('audit.table.ip_address')}
              </TableHead>
              <TableHead className="w-[80px] text-right">
                {t('audit.table.actions')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-mono text-xs">
                  {formatTimestamp(log.created_at)}
                </TableCell>
                <TableCell>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-default">
                          {truncate(log.user_email, 25) || t('audit.table.system')}
                        </span>
                      </TooltipTrigger>
                      {log.user_email && (
                        <TooltipContent>
                          <p>{log.user_email}</p>
                          {log.user_id && (
                            <p className="text-xs text-muted-foreground">
                              ID: {log.user_id}
                            </p>
                          )}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                <TableCell>
                  <Badge className={getActionColor(log.action)} variant="outline">
                    {getActionDisplayName(log.action)}
                  </Badge>
                </TableCell>
                <TableCell>{getEntityTypeDisplayName(log.entity_type)}</TableCell>
                <TableCell>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="font-mono text-xs cursor-default">
                          {truncate(log.entity_id, 12)}
                        </span>
                      </TooltipTrigger>
                      {log.entity_id && log.entity_id.length > 12 && (
                        <TooltipContent>
                          <p className="font-mono">{log.entity_id}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                <TableCell className="hidden font-mono text-xs lg:table-cell">
                  {log.ip_address || '-'}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onViewDetails(log)}
                  >
                    <Eye className="h-4 w-4" />
                    <span className="sr-only">{t('audit.table.view_details')}</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        {/* Page size selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {t('audit.table.rows_per_page')}
          </span>
          <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
            <SelectTrigger className="w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Page navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(1)}
            disabled={page === 1}
          >
            <ChevronsLeft className="h-4 w-4" />
            <span className="sr-only">{t('common.first_page')}</span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">{t('common.previous')}</span>
          </Button>
          <span className="text-sm">
            {t('audit.table.page_of', { page, totalPages: totalPages || 1 })}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">{t('common.next')}</span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(totalPages)}
            disabled={page >= totalPages}
          >
            <ChevronsRight className="h-4 w-4" />
            <span className="sr-only">{t('common.last_page')}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
