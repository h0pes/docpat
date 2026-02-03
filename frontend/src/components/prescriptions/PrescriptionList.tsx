/**
 * PrescriptionList Component
 *
 * Reusable list component for displaying prescriptions with loading,
 * empty, and error states. Can be used in PrescriptionsPage, PatientDetailPage, etc.
 */

import { useTranslation } from 'react-i18next';
import { Pill, AlertCircle, RefreshCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PrescriptionCard } from './PrescriptionCard';
import { EmptyState } from '@/components/ui/empty-state';
import type { Prescription } from '@/types/prescription';

/**
 * Props for PrescriptionList component
 */
interface PrescriptionListProps {
  /** Array of prescriptions to display */
  prescriptions?: Prescription[];
  /** Whether data is loading */
  isLoading?: boolean;
  /** Whether there was an error loading data */
  isError?: boolean;
  /** Error object or message */
  error?: Error | unknown;
  /** Callback to retry loading */
  onRetry?: () => void;
  /** Handler for viewing a prescription */
  onView?: (prescription: Prescription) => void;
  /** Handler for editing a prescription */
  onEdit?: (prescription: Prescription) => void;
  /** Handler for discontinuing a prescription */
  onDiscontinue?: (prescription: Prescription) => void;
  /** Handler for renewing a prescription */
  onRenew?: (prescription: Prescription) => void;
  /** Handler for deleting a prescription (admin only) */
  onDelete?: (prescription: Prescription) => void;
  /** Number of skeleton items to show while loading */
  skeletonCount?: number;
  /** Message to show when list is empty */
  emptyMessage?: string;
  /** Description for empty state */
  emptyDescription?: string;
  /** Action button for empty state */
  emptyAction?: React.ReactNode;
  /** Whether to show patient info (useful when showing prescriptions for all patients) */
  showPatient?: boolean;
  /** Whether to show provider info */
  showProvider?: boolean;
  /** Grid layout configuration */
  gridCols?: 1 | 2 | 3;
}

/**
 * Skeleton component for loading state
 */
function PrescriptionSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-[180px]" />
            <Skeleton className="h-4 w-[120px]" />
          </div>
          <Skeleton className="h-6 w-[80px]" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-[100px]" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-[140px]" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-[80px]" />
        </div>
        <div className="pt-2 flex gap-2">
          <Skeleton className="h-8 w-[70px]" />
          <Skeleton className="h-8 w-[70px]" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * PrescriptionList Component
 */
export function PrescriptionList({
  prescriptions,
  isLoading = false,
  isError = false,
  error,
  onRetry,
  onView,
  onEdit,
  onDiscontinue,
  onRenew,
  onDelete,
  skeletonCount = 6,
  emptyMessage,
  emptyDescription,
  emptyAction,
  showPatient = true,
  showProvider = false,
  gridCols = 2,
}: PrescriptionListProps) {
  const { t } = useTranslation();

  // Determine grid class based on columns
  const gridClass =
    gridCols === 1
      ? 'grid-cols-1'
      : gridCols === 2
        ? 'grid-cols-1 md:grid-cols-2'
        : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

  // Loading state
  if (isLoading) {
    return (
      <div className={`grid gap-4 ${gridClass}`}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <PrescriptionSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t('prescriptions.error_title')}</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : t('prescriptions.error_loading')}
        </AlertDescription>
        {onRetry && (
          <Button className="mt-4" variant="outline" size="sm" onClick={onRetry}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            {t('common.retry')}
          </Button>
        )}
      </Alert>
    );
  }

  // Empty state
  if (!prescriptions || prescriptions.length === 0) {
    return (
      <EmptyState
        variant="default"
        icon={Pill}
        title={emptyMessage || t('prescriptions.no_prescriptions')}
        description={emptyDescription || t('prescriptions.no_prescriptions_description')}
        action={emptyAction}
      />
    );
  }

  // Prescription list
  return (
    <div className={`grid gap-4 ${gridClass}`}>
      {prescriptions.map((prescription) => (
        <PrescriptionCard
          key={prescription.id}
          prescription={prescription}
          onClick={onView ? () => onView(prescription) : undefined}
          onView={onView ? () => onView(prescription) : undefined}
          onEdit={
            onEdit && prescription.status === 'ACTIVE'
              ? () => onEdit(prescription)
              : undefined
          }
          onDiscontinue={
            onDiscontinue &&
            (prescription.status === 'ACTIVE' || prescription.status === 'ON_HOLD')
              ? () => onDiscontinue(prescription)
              : undefined
          }
          onRenew={onRenew ? () => onRenew(prescription) : undefined}
          onDelete={onDelete ? () => onDelete(prescription) : undefined}
          showPatient={showPatient}
          showProvider={showProvider}
        />
      ))}
    </div>
  );
}
