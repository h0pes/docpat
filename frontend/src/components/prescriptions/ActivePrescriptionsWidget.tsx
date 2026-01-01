/**
 * ActivePrescriptionsWidget Component
 *
 * Dashboard widget displaying active prescriptions summary
 * and prescriptions needing refill soon.
 */

import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Pill, AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

import { usePrescriptionSearch } from '@/hooks/useVisits';
import { PrescriptionStatus } from '@/types/prescription';

/**
 * Check if prescription needs refill soon (within 7 days)
 */
function needsRefillSoon(prescription: {
  end_date?: string;
  refills: number;
  status: PrescriptionStatus;
}): boolean {
  if (prescription.status !== PrescriptionStatus.ACTIVE) return false;
  if (!prescription.end_date) return false;

  const endDate = new Date(prescription.end_date);
  const today = new Date();
  const daysUntilEnd = Math.ceil(
    (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  return daysUntilEnd <= 7 && daysUntilEnd >= 0 && prescription.refills > 0;
}

/**
 * ActivePrescriptionsWidget Component
 */
export function ActivePrescriptionsWidget() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Fetch active prescriptions
  const {
    data: activePrescriptions,
    isLoading,
    isError,
    refetch,
  } = usePrescriptionSearch(
    { status: PrescriptionStatus.ACTIVE, limit: 50 },
    { staleTime: 5 * 60 * 1000 } // 5 minutes
  );

  // Calculate stats
  const prescriptions = activePrescriptions?.prescriptions || [];
  const totalActive = activePrescriptions?.total || 0;
  const needingRefill = prescriptions.filter(needsRefillSoon);

  /**
   * Handle view all prescriptions
   */
  const handleViewAll = () => {
    navigate('/prescriptions');
  };

  /**
   * Handle view prescriptions needing refill
   */
  const handleViewNeedingRefill = () => {
    navigate('/prescriptions?status=ACTIVE');
  };

  /**
   * Handle view prescription detail
   */
  const handleViewPrescription = (id: string) => {
    navigate(`/prescriptions/${id}`);
  };

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            <Skeleton className="h-4 w-24" />
          </CardTitle>
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16 mb-2" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (isError) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t('prescriptions.title')}
          </CardTitle>
          <Pill className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-2">
              {t('prescriptions.error_loading')}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('common.actions.retry')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {t('prescriptions.title')}
        </CardTitle>
        <Pill className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {/* Stats */}
        <div className="flex items-baseline gap-2">
          <div className="text-2xl font-bold">{totalActive}</div>
          <span className="text-sm text-muted-foreground">
            {t('prescriptions.stats.active')}
          </span>
        </div>

        {/* Refill warning */}
        {needingRefill.length > 0 && (
          <div className="mt-3 p-2 rounded-md bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">
                {t('prescriptions.stats.needs_refill', { count: needingRefill.length })}
              </span>
            </div>
          </div>
        )}

        {/* Prescriptions needing refill list */}
        {needingRefill.length > 0 && (
          <div className="mt-3 space-y-2">
            {needingRefill.slice(0, 3).map((prescription) => (
              <div
                key={prescription.id}
                className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => handleViewPrescription(prescription.id)}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {prescription.medication_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {prescription.dosage} - {prescription.frequency}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs ml-2">
                  {prescription.refills} {t('prescriptions.refills_count', { count: prescription.refills })}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {/* Empty state for active prescriptions */}
        {totalActive === 0 && (
          <div className="text-center py-4">
            <Pill className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {t('prescriptions.no_prescriptions')}
            </p>
          </div>
        )}

        {/* View all button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-4"
          onClick={handleViewAll}
        >
          {t('common.actions.viewAll')}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}
