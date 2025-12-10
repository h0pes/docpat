/**
 * AuditLogDetail Component
 *
 * Modal/drawer component showing full details of a single audit log entry.
 */

import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import {
  User,
  Clock,
  Globe,
  Monitor,
  Hash,
  FileText,
  X,
  Copy,
  Check,
} from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { AuditLog } from '@/types/audit';
import {
  getActionDisplayName,
  getEntityTypeDisplayName,
  getActionColor,
} from '@/types/audit';

interface AuditLogDetailProps {
  /** The audit log entry to display */
  log: AuditLog | null;
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog is closed */
  onClose: () => void;
}

/**
 * DetailRow displays a single piece of information
 */
function DetailRow({
  icon: Icon,
  label,
  value,
  mono = false,
  copyable = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string | React.ReactNode;
  mono?: boolean;
  copyable?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (typeof value === 'string') {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
      <div className="flex-1 space-y-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className="flex items-center gap-2">
          <p className={mono ? 'font-mono text-sm' : 'text-sm'}>{value || '-'}</p>
          {copyable && typeof value === 'string' && value && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * AuditLogDetail shows complete information about an audit log entry
 */
export function AuditLogDetail({ log, open, onClose }: AuditLogDetailProps) {
  const { t } = useTranslation();

  if (!log) return null;

  // Format timestamp with timezone
  const formatTimestamp = (timestamp: string) => {
    try {
      return format(new Date(timestamp), 'PPpp');
    } catch {
      return timestamp;
    }
  };

  // Pretty print JSON changes
  const formatChanges = (changes: Record<string, unknown> | null) => {
    if (!changes) return null;
    return JSON.stringify(changes, null, 2);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('audit.detail.title')}
            <span className="font-mono text-sm text-muted-foreground">
              #{log.id}
            </span>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-6 pr-4">
            {/* Action and Entity Type */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={getActionColor(log.action)} variant="outline">
                {getActionDisplayName(log.action)}
              </Badge>
              <span className="text-muted-foreground">on</span>
              <Badge variant="secondary">
                {getEntityTypeDisplayName(log.entity_type)}
              </Badge>
            </div>

            <Separator />

            {/* Basic Information */}
            <div className="space-y-1">
              <h4 className="text-sm font-medium">
                {t('audit.detail.basic_info')}
              </h4>

              <DetailRow
                icon={Clock}
                label={t('audit.detail.timestamp')}
                value={formatTimestamp(log.created_at)}
              />

              <DetailRow
                icon={User}
                label={t('audit.detail.user')}
                value={
                  log.user_email ? (
                    <span>
                      {log.user_email}
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({log.user_id})
                      </span>
                    </span>
                  ) : (
                    t('audit.detail.system_action')
                  )
                }
              />

              <DetailRow
                icon={Hash}
                label={t('audit.detail.entity_id')}
                value={log.entity_id || t('audit.detail.not_applicable')}
                mono
                copyable
              />
            </div>

            <Separator />

            {/* Request Information */}
            <div className="space-y-1">
              <h4 className="text-sm font-medium">
                {t('audit.detail.request_info')}
              </h4>

              <DetailRow
                icon={Globe}
                label={t('audit.detail.ip_address')}
                value={log.ip_address || t('audit.detail.not_recorded')}
                mono
              />

              <DetailRow
                icon={Monitor}
                label={t('audit.detail.user_agent')}
                value={
                  log.user_agent ? (
                    <span className="break-all text-xs">
                      {log.user_agent}
                    </span>
                  ) : (
                    t('audit.detail.not_recorded')
                  )
                }
              />

              <DetailRow
                icon={Hash}
                label={t('audit.detail.request_id')}
                value={log.request_id || t('audit.detail.not_recorded')}
                mono
                copyable
              />
            </div>

            {/* Changes (if present) */}
            {log.changes && Object.keys(log.changes).length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">
                    {t('audit.detail.changes')}
                  </h4>
                  <div className="rounded-md bg-muted p-4">
                    <pre className="overflow-x-auto text-xs">
                      {formatChanges(log.changes)}
                    </pre>
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            {t('common.close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
