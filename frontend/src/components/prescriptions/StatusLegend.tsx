/**
 * StatusLegend Component
 *
 * Displays a legend explaining prescription statuses.
 * Can be shown as a popover or inline help.
 */

import { useTranslation } from 'react-i18next';
import { HelpCircle, CheckCircle, XCircle, PauseCircle, AlertTriangle, AlertCircle, Clock, Copy, Play, RefreshCw } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { PrescriptionStatus } from '@/types/prescription';

interface StatusItemProps {
  status: PrescriptionStatus;
  icon: React.ReactNode;
  colorClass: string;
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
}

function StatusItem({ status, icon, colorClass, badgeVariant }: StatusItemProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-start gap-3 py-2">
      <div className={`mt-0.5 ${colorClass}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant={badgeVariant} className="text-xs">
            {t(`prescriptions.status.${status.toLowerCase()}`)}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {t(`prescriptions.status_legend.${status.toLowerCase()}_description`)}
        </p>
      </div>
    </div>
  );
}

/**
 * StatusLegend Component - Popover version
 */
export function StatusLegend() {
  const { t } = useTranslation();

  const statuses: StatusItemProps[] = [
    {
      status: PrescriptionStatus.ACTIVE,
      icon: <CheckCircle className="h-4 w-4" />,
      colorClass: 'text-green-500',
      badgeVariant: 'default',
    },
    {
      status: PrescriptionStatus.ON_HOLD,
      icon: <PauseCircle className="h-4 w-4" />,
      colorClass: 'text-yellow-500',
      badgeVariant: 'secondary',
    },
    {
      status: PrescriptionStatus.COMPLETED,
      icon: <Clock className="h-4 w-4" />,
      colorClass: 'text-gray-500',
      badgeVariant: 'secondary',
    },
    {
      status: PrescriptionStatus.DISCONTINUED,
      icon: <AlertTriangle className="h-4 w-4" />,
      colorClass: 'text-orange-500',
      badgeVariant: 'outline',
    },
    {
      status: PrescriptionStatus.CANCELLED,
      icon: <XCircle className="h-4 w-4" />,
      colorClass: 'text-red-500',
      badgeVariant: 'destructive',
    },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1.5">
          <HelpCircle className="h-4 w-4" />
          <span className="text-sm">{t('prescriptions.status_legend.title')}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="end">
        <div className="space-y-1">
          <h4 className="font-medium leading-none mb-3">
            {t('prescriptions.status_legend.title')}
          </h4>
          <p className="text-sm text-muted-foreground mb-4">
            {t('prescriptions.status_legend.subtitle')}
          </p>
          <div className="divide-y">
            {statuses.map((status) => (
              <StatusItem key={status.status} {...status} />
            ))}
          </div>

          {/* Computed States / Badges Section */}
          <div className="pt-4 mt-4 border-t">
            <h5 className="font-medium text-sm mb-2">
              {t('prescriptions.status_legend.badges_title')}
            </h5>
            {/* Expired */}
            <div className="flex items-start gap-3 py-2">
              <div className="mt-0.5 text-red-500">
                <AlertCircle className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="destructive" className="text-xs bg-red-600">
                    {t('prescriptions.expired')}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('prescriptions.status_legend.expired_description')}
                </p>
              </div>
            </div>
            {/* Needs Refill */}
            <div className="flex items-start gap-3 py-2">
              <div className="mt-0.5 text-amber-500">
                <RefreshCw className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs text-amber-600 border-amber-500">
                    {t('prescriptions.needs_refill')}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('prescriptions.status_legend.needs_refill_description')}
                </p>
              </div>
            </div>
          </div>

          {/* Actions Section */}
          <div className="pt-4 mt-4 border-t">
            <h5 className="font-medium text-sm mb-2">
              {t('prescriptions.status_legend.actions_title')}
            </h5>
            <div className="flex items-start gap-3 py-2">
              <div className="mt-0.5 text-blue-500">
                <Copy className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">{t('prescriptions.actions.renew')}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('prescriptions.status_legend.renew_description')}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 py-2">
              <div className="mt-0.5 text-green-500">
                <Play className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">{t('prescriptions.actions.resume')}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('prescriptions.status_legend.resume_description')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * StatusLegendInline Component - Inline version for detail pages
 */
export function StatusLegendInline() {
  const { t } = useTranslation();

  return (
    <div className="rounded-lg border bg-card p-4">
      <h4 className="font-medium mb-3 flex items-center gap-2">
        <HelpCircle className="h-4 w-4" />
        {t('prescriptions.status_legend.title')}
      </h4>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <StatusBadgeItem
          status={PrescriptionStatus.ACTIVE}
          colorClass="bg-green-500"
        />
        <StatusBadgeItem
          status={PrescriptionStatus.ON_HOLD}
          colorClass="bg-yellow-500"
        />
        <StatusBadgeItem
          status={PrescriptionStatus.COMPLETED}
          colorClass="bg-gray-500"
        />
        <StatusBadgeItem
          status={PrescriptionStatus.DISCONTINUED}
          colorClass="bg-orange-500"
        />
        <StatusBadgeItem
          status={PrescriptionStatus.CANCELLED}
          colorClass="bg-red-500"
        />
      </div>
    </div>
  );
}

function StatusBadgeItem({ status, colorClass }: { status: PrescriptionStatus; colorClass: string }) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2">
      <div className={`h-3 w-3 rounded-full ${colorClass}`} />
      <span className="text-sm">
        {t(`prescriptions.status.${status.toLowerCase()}`)}
      </span>
    </div>
  );
}
