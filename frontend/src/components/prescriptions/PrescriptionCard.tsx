/**
 * PrescriptionCard Component
 *
 * Displays a prescription summary card for use in list views.
 * Shows medication details, status, refill information, and quick actions.
 */

import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import {
  Pill,
  Calendar,
  RefreshCw,
  AlertTriangle,
  MoreVertical,
  Eye,
  Edit,
  XCircle,
  Trash2,
  User,
  Copy,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Prescription,
  PrescriptionStatus,
  getStatusColor,
  canDiscontinue,
  needsRefillSoon,
  formatPrescription,
} from '@/types/prescription';
import { useAuth } from '@/store/authStore';

interface PrescriptionCardProps {
  /** The prescription to display */
  prescription: Prescription;
  /** Patient name (if available) */
  patientName?: string;
  /** Provider name (if available) */
  providerName?: string;
  /** Callback when card is clicked */
  onClick?: () => void;
  /** Callback when view action is clicked */
  onView?: () => void;
  /** Callback when edit action is clicked */
  onEdit?: () => void;
  /** Callback when discontinue action is clicked */
  onDiscontinue?: () => void;
  /** Callback when renew action is clicked */
  onRenew?: () => void;
  /** Callback when delete action is clicked (admin only) */
  onDelete?: () => void;
  /** Whether to show patient info */
  showPatient?: boolean;
  /** Whether to show provider info */
  showProvider?: boolean;
}

/**
 * Get badge variant based on prescription status
 */
function getStatusVariant(
  status: PrescriptionStatus
): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (status) {
    case PrescriptionStatus.ACTIVE:
      return 'default';
    case PrescriptionStatus.COMPLETED:
      return 'secondary';
    case PrescriptionStatus.CANCELLED:
      return 'destructive';
    case PrescriptionStatus.DISCONTINUED:
      return 'outline';
    case PrescriptionStatus.ON_HOLD:
      return 'secondary';
    default:
      return 'default';
  }
}

/**
 * PrescriptionCard Component
 */
export function PrescriptionCard({
  prescription,
  patientName,
  providerName,
  onClick,
  onView,
  onEdit,
  onDiscontinue,
  onRenew,
  onDelete,
  showPatient = true,
  showProvider = false,
}: PrescriptionCardProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const needsRefill = needsRefillSoon(prescription);
  const hasInteractions =
    prescription.interaction_warnings && prescription.interaction_warnings.length > 0;

  /**
   * Handle card click
   */
  const handleCardClick = () => {
    if (onClick) {
      onClick();
    } else if (onView) {
      onView();
    }
  };

  /**
   * Handle action click and stop propagation
   */
  const handleActionClick = (
    e: React.MouseEvent,
    action: (() => void) | undefined
  ) => {
    e.stopPropagation();
    if (action) {
      action();
    }
  };

  return (
    <Card
      className={`hover:bg-accent cursor-pointer transition-colors ${
        needsRefill ? 'border-yellow-400' : ''
      }`}
      onClick={handleCardClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Medication name and status */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Pill className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-semibold text-base truncate">
                  {prescription.medication_name}
                </h4>
              </div>
              <Badge variant={getStatusVariant(prescription.status)}>
                {t(`prescriptions.status.${prescription.status.toLowerCase()}`)}
              </Badge>
              {needsRefill && (
                <Badge variant="outline" className="text-yellow-600 border-yellow-400">
                  <RefreshCw className="h-3 w-3 mr-1" />
                  {t('prescriptions.needs_refill')}
                </Badge>
              )}
              {hasInteractions && (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {t('prescriptions.has_interactions')}
                </Badge>
              )}
            </div>

            {/* Dosage and frequency */}
            <p className="text-sm text-muted-foreground">
              {formatPrescription(prescription)}
            </p>

            {/* Metadata row */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              {/* Prescribed date */}
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(prescription.prescribed_date), 'PP')}
              </div>

              {/* Patient info */}
              {showPatient && patientName && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {patientName}
                </div>
              )}

              {/* Provider info */}
              {showProvider && providerName && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {t('prescriptions.prescribed_by', { name: providerName })}
                </div>
              )}

              {/* Refills */}
              <div className="flex items-center gap-1">
                <RefreshCw className="h-3 w-3" />
                {t('prescriptions.refills_count', { count: prescription.refills })}
              </div>

              {/* Generic name if different */}
              {prescription.generic_name && (
                <span className="italic">({prescription.generic_name})</span>
              )}
            </div>

            {/* Instructions preview */}
            {prescription.instructions && (
              <p className="text-xs text-muted-foreground truncate max-w-md">
                {prescription.instructions}
              </p>
            )}
          </div>

          {/* Actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">{t('common.actions')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onView && (
                <DropdownMenuItem onClick={(e) => handleActionClick(e, onView)}>
                  <Eye className="h-4 w-4 mr-2" />
                  {t('common.view')}
                </DropdownMenuItem>
              )}
              {onEdit && prescription.status === PrescriptionStatus.ACTIVE && (
                <DropdownMenuItem onClick={(e) => handleActionClick(e, onEdit)}>
                  <Edit className="h-4 w-4 mr-2" />
                  {t('common.edit')}
                </DropdownMenuItem>
              )}
              {onRenew && (
                <DropdownMenuItem onClick={(e) => handleActionClick(e, onRenew)}>
                  <Copy className="h-4 w-4 mr-2" />
                  {t('prescriptions.actions.renew')}
                </DropdownMenuItem>
              )}
              {onDiscontinue && canDiscontinue(prescription.status) && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => handleActionClick(e, onDiscontinue)}
                    className="text-orange-600"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    {t('prescriptions.actions.discontinue')}
                  </DropdownMenuItem>
                </>
              )}
              {onDelete && isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => handleActionClick(e, onDelete)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('common.delete')}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
