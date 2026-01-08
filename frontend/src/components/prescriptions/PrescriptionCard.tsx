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
  CalendarClock,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  MoreVertical,
  Eye,
  Edit,
  XCircle,
  Trash2,
  User,
  Copy,
  Printer,
  PlayCircle,
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
  getRefillStatus,
  isExpiredPrescription,
  formatPrescription,
  getInteractionSeverityColor,
  DrugInteractionSeverity,
} from '@/types/prescription';
import { useAuth } from '@/store/authStore';

/**
 * Get the highest severity from interaction warnings
 */
function getHighestInteractionSeverity(
  warnings: { severity: DrugInteractionSeverity }[] | undefined
): DrugInteractionSeverity | null {
  if (!warnings || warnings.length === 0) return null;

  const severityOrder: DrugInteractionSeverity[] = ['unknown', 'minor', 'moderate', 'major', 'contraindicated'];
  let highest: DrugInteractionSeverity = 'unknown';

  for (const warning of warnings) {
    if (severityOrder.indexOf(warning.severity) > severityOrder.indexOf(highest)) {
      highest = warning.severity;
    }
  }

  return highest;
}

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
  /** Callback when resume action is clicked (for On Hold prescriptions) */
  onResume?: () => void;
  /** Callback when print action is clicked */
  onPrint?: () => void;
  /** Callback when delete action is clicked (admin only) */
  onDelete?: () => void;
  /** Whether to show patient info */
  showPatient?: boolean;
  /** Whether to show provider info */
  showProvider?: boolean;
  /** External flag to indicate this prescription has interactions (overrides prescription.interaction_warnings) */
  hasInteractionsOverride?: boolean;
  /** External severity level when hasInteractionsOverride is true (for real-time interaction display) */
  highestSeverityOverride?: DrugInteractionSeverity;
}

/**
 * Get badge variant based on prescription status
 */
function getStatusVariant(
  status: PrescriptionStatus
): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (status) {
    case PrescriptionStatus.ACTIVE:
      return 'default'; // Will be styled green via className
    case PrescriptionStatus.COMPLETED:
      return 'secondary'; // Gray/muted
    case PrescriptionStatus.CANCELLED:
      return 'destructive'; // Red
    case PrescriptionStatus.DISCONTINUED:
      return 'outline'; // Will be styled orange via className
    case PrescriptionStatus.ON_HOLD:
      return 'outline'; // Will be styled yellow via className
    default:
      return 'default';
  }
}

/**
 * Get additional CSS classes for status badge
 */
function getStatusClassName(status: PrescriptionStatus): string {
  switch (status) {
    case PrescriptionStatus.ACTIVE:
      return 'bg-green-500 hover:bg-green-600 text-white border-green-500';
    case PrescriptionStatus.ON_HOLD:
      return 'bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500';
    case PrescriptionStatus.DISCONTINUED:
      return 'bg-orange-500 hover:bg-orange-600 text-white border-orange-500';
    default:
      return '';
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
  onResume,
  onPrint,
  onDelete,
  showPatient = true,
  showProvider = false,
  hasInteractionsOverride,
  highestSeverityOverride,
}: PrescriptionCardProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  // Get refill status (can_refill, needs_renewal, expired, or null)
  const refillStatus = getRefillStatus(prescription);
  // Check if prescription is expired (end date has passed)
  const isExpired = isExpiredPrescription(prescription);
  // Use external override if provided, otherwise check prescription's stored warnings
  const hasInteractions = hasInteractionsOverride !== undefined
    ? hasInteractionsOverride
    : (prescription.interaction_warnings && prescription.interaction_warnings.length > 0);

  // Get the highest severity for badge coloring (use override if provided)
  const highestSeverity = highestSeverityOverride
    ?? getHighestInteractionSeverity(prescription.interaction_warnings);

  // Renew is available for completed, discontinued, or cancelled prescriptions
  const canRenew =
    prescription.status === PrescriptionStatus.COMPLETED ||
    prescription.status === PrescriptionStatus.DISCONTINUED ||
    prescription.status === PrescriptionStatus.CANCELLED;

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

  // Determine card border styling based on status
  const getCardBorderClass = () => {
    // Expired prescriptions get red styling
    if (isExpired && prescription.status === PrescriptionStatus.ACTIVE) {
      return 'border-red-500 border-2 dark:border-red-400';
    }
    // Ending soon gets yellow/amber styling
    if (refillStatus && !isExpired) {
      return 'border-amber-500 border-2 dark:border-amber-400';
    }
    return '';
  };

  return (
    <Card
      className={`hover:bg-accent cursor-pointer transition-colors ${getCardBorderClass()}`}
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
              <Badge
                variant={getStatusVariant(prescription.status)}
                className={getStatusClassName(prescription.status)}
              >
                {t(`prescriptions.status.${prescription.status.toLowerCase()}`)}
              </Badge>
              {/* Expired badge - for active prescriptions past end date */}
              {isExpired && prescription.status === PrescriptionStatus.ACTIVE && (
                <Badge variant="destructive" className="bg-red-600 hover:bg-red-700 text-white border-red-600">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {t('prescriptions.expired')}
                </Badge>
              )}
              {/* Needs Refill badge - for prescriptions ending soon (within 7 days) */}
              {refillStatus && !isExpired && (
                <Badge variant="outline" className="text-amber-600 border-amber-500 dark:text-amber-400 dark:border-amber-400">
                  <RefreshCw className="h-3 w-3 mr-1" />
                  {t('prescriptions.needs_refill')}
                </Badge>
              )}
              {hasInteractions && highestSeverity && (
                <Badge
                  variant="outline"
                  className={getInteractionSeverityColor(highestSeverity)}
                >
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

              {/* End date - show with visual emphasis if expired or ending soon */}
              {prescription.end_date && (
                <div className={`flex items-center gap-1 ${
                  isExpired
                    ? 'text-red-600 dark:text-red-400 font-medium'
                    : refillStatus
                      ? 'text-amber-600 dark:text-amber-400'
                      : ''
                }`}>
                  <CalendarClock className="h-3 w-3" />
                  <span>{t('prescriptions.card.ends')}: {format(new Date(prescription.end_date), 'PP')}</span>
                </div>
              )}

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

            {/* Status change info for non-active prescriptions */}
            {prescription.status !== PrescriptionStatus.ACTIVE && (
              <div className="text-xs text-muted-foreground">
                {prescription.status === PrescriptionStatus.DISCONTINUED && prescription.discontinued_at && (
                  <span className="text-orange-600">
                    {t('prescriptions.card.discontinued_on', {
                      date: format(new Date(prescription.discontinued_at), 'PP')
                    })}
                    {prescription.discontinuation_reason && `: ${prescription.discontinuation_reason}`}
                  </span>
                )}
                {prescription.status === PrescriptionStatus.CANCELLED && (
                  <span className="text-red-600">
                    {t('prescriptions.card.cancelled_on', {
                      date: format(new Date(prescription.updated_at), 'PP')
                    })}
                    {prescription.discontinuation_reason && `: ${prescription.discontinuation_reason}`}
                  </span>
                )}
                {prescription.status === PrescriptionStatus.ON_HOLD && (
                  <span className="text-yellow-600">
                    {t('prescriptions.card.on_hold_since', {
                      date: format(new Date(prescription.updated_at), 'PP')
                    })}
                    {prescription.discontinuation_reason && `: ${prescription.discontinuation_reason}`}
                  </span>
                )}
                {prescription.status === PrescriptionStatus.COMPLETED && (
                  <span className="text-gray-600">
                    {t('prescriptions.card.completed_on', {
                      date: format(new Date(prescription.updated_at), 'PP')
                    })}
                  </span>
                )}
              </div>
            )}

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
                <span className="sr-only">{t('common.actionsTitle')}</span>
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
              {onRenew && canRenew && (
                <DropdownMenuItem onClick={(e) => handleActionClick(e, onRenew)}>
                  <Copy className="h-4 w-4 mr-2" />
                  {t('prescriptions.actions.renew')}
                </DropdownMenuItem>
              )}
              {onResume && prescription.status === PrescriptionStatus.ON_HOLD && (
                <DropdownMenuItem
                  onClick={(e) => handleActionClick(e, onResume)}
                  className="text-green-600"
                >
                  <PlayCircle className="h-4 w-4 mr-2" />
                  {t('prescriptions.actions.resume')}
                </DropdownMenuItem>
              )}
              {onPrint && (
                <DropdownMenuItem onClick={(e) => handleActionClick(e, onPrint)}>
                  <Printer className="h-4 w-4 mr-2" />
                  {t('prescriptions.actions.print')}
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
