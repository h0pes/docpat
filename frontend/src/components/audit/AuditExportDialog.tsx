/**
 * AuditExportDialog Component
 *
 * Dialog for exporting audit logs to CSV or JSON format.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Download, FileJson, FileSpreadsheet, Loader2, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useExportAuditLogs } from '@/hooks/useAuditLogs';
import { useToast } from '@/hooks/use-toast';
import type { AuditLogsFilter, ExportFormat } from '@/types/audit';

interface AuditExportDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog is closed */
  onClose: () => void;
  /** Current filter state to apply to export */
  currentFilter: AuditLogsFilter;
}

/**
 * AuditExportDialog provides options for exporting audit logs
 */
export function AuditExportDialog({
  open,
  onClose,
  currentFilter,
}: AuditExportDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const exportMutation = useExportAuditLogs();

  const [format, setFormat] = useState<ExportFormat>('csv');
  const [limit, setLimit] = useState(10000);

  // Handle export
  const handleExport = async () => {
    try {
      await exportMutation.mutateAsync({
        ...currentFilter,
        format,
        limit,
        page: undefined, // Remove pagination for export
        page_size: undefined,
      });
      toast({
        title: t('audit.export.success_title'),
        description: t('audit.export.success_description'),
      });
      onClose();
    } catch (error) {
      toast({
        title: t('audit.export.error_title'),
        description: t('audit.export.error_description'),
        variant: 'destructive',
      });
    }
  };

  // Format active filters for display
  const getActiveFiltersDescription = () => {
    const parts: string[] = [];

    if (currentFilter.date_from && currentFilter.date_to) {
      parts.push(
        t('audit.export.filter_date_range', {
          from: currentFilter.date_from,
          to: currentFilter.date_to,
        })
      );
    } else if (currentFilter.date_from) {
      parts.push(t('audit.export.filter_from', { from: currentFilter.date_from }));
    } else if (currentFilter.date_to) {
      parts.push(t('audit.export.filter_to', { to: currentFilter.date_to }));
    }

    if (currentFilter.user_id) {
      parts.push(t('audit.export.filter_user'));
    }

    if (currentFilter.action) {
      parts.push(t('audit.export.filter_action', { action: currentFilter.action }));
    }

    if (currentFilter.entity_type) {
      parts.push(
        t('audit.export.filter_entity', { entity: currentFilter.entity_type })
      );
    }

    return parts.length > 0 ? parts.join(', ') : t('audit.export.no_filters');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            {t('audit.export.title')}
          </DialogTitle>
          <DialogDescription>
            {t('audit.export.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Active filters info */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <span className="font-medium">{t('audit.export.active_filters')}: </span>
              {getActiveFiltersDescription()}
            </AlertDescription>
          </Alert>

          {/* Export format */}
          <div className="space-y-2">
            <Label>{t('audit.export.format')}</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>CSV ({t('audit.export.csv_description')})</span>
                  </div>
                </SelectItem>
                <SelectItem value="json">
                  <div className="flex items-center gap-2">
                    <FileJson className="h-4 w-4" />
                    <span>JSON ({t('audit.export.json_description')})</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Record limit */}
          <div className="space-y-2">
            <Label>{t('audit.export.max_records')}</Label>
            <Input
              type="number"
              min={1}
              max={50000}
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value) || 10000)}
            />
            <p className="text-xs text-muted-foreground">
              {t('audit.export.max_records_hint')}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleExport} disabled={exportMutation.isPending}>
            {exportMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('audit.export.exporting')}
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                {t('audit.export.export_button')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
