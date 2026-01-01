/**
 * PrescriptionsPage Component
 *
 * Main page for viewing and managing prescriptions.
 * Provides a list view with filtering, search, and quick actions.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Pill, FileText, RefreshCw, AlertTriangle } from 'lucide-react';

import { usePrescriptionSearch, useDiscontinuePrescription, useDeletePrescription } from '@/hooks/useVisits';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { PatientSearchCombobox } from '@/components/appointments/PatientSearchCombobox';
import { PrescriptionCard, PrescriptionFilters, DiscontinueDialog } from '@/components/prescriptions';
import {
  Prescription,
  PrescriptionStatus,
  PrescriptionSearchFilters,
} from '@/types/prescription';
import { useAuth } from '@/store/authStore';

/**
 * PrescriptionsPage Component
 */
export function PrescriptionsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  // Filter state
  const [filters, setFilters] = useState<PrescriptionSearchFilters>({
    limit: 50,
    offset: 0,
  });

  // Dialog states
  const [showPatientSelector, setShowPatientSelector] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [discontinuingPrescription, setDiscontinuingPrescription] = useState<Prescription | null>(null);
  const [deletingPrescription, setDeletingPrescription] = useState<Prescription | null>(null);

  // Fetch prescriptions
  const { data: prescriptionsData, isLoading, isError, error } = usePrescriptionSearch(filters);

  // Mutations
  const discontinueMutation = useDiscontinuePrescription();
  const deleteMutation = useDeletePrescription();

  /**
   * Handle prescription click - navigate to detail page
   */
  const handlePrescriptionClick = (prescriptionId: string) => {
    navigate(`/prescriptions/${prescriptionId}`);
  };

  /**
   * Handle edit prescription
   */
  const handleEditPrescription = (prescriptionId: string) => {
    navigate(`/prescriptions/${prescriptionId}/edit`);
  };

  /**
   * Handle new prescription click - show patient selector first
   */
  const handleNewPrescription = () => {
    setShowPatientSelector(true);
  };

  /**
   * Handle patient selection - navigate to new prescription page
   */
  const handlePatientSelected = (patientId: string) => {
    setSelectedPatientId(patientId);
    setShowPatientSelector(false);
    navigate(`/prescriptions/new?patientId=${patientId}`);
  };

  /**
   * Handle manage templates click
   */
  const handleManageTemplates = () => {
    navigate('/prescriptions/templates');
  };

  /**
   * Handle discontinue prescription
   */
  const handleDiscontinue = async (reason: string) => {
    if (!discontinuingPrescription) return;

    try {
      await discontinueMutation.mutateAsync({
        id: discontinuingPrescription.id,
        data: { discontinued_reason: reason },
      });
      toast({
        title: t('prescriptions.discontinue.success'),
        description: t('prescriptions.discontinue.success_description', {
          medication: discontinuingPrescription.medication_name,
        }),
      });
      setDiscontinuingPrescription(null);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('prescriptions.discontinue.error'),
      });
    }
  };

  /**
   * Handle delete prescription (admin only)
   */
  const handleDelete = async () => {
    if (!deletingPrescription) return;

    try {
      await deleteMutation.mutateAsync(deletingPrescription.id);
      toast({
        title: t('prescriptions.delete.success'),
        description: t('prescriptions.delete.success_description'),
      });
      setDeletingPrescription(null);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('prescriptions.delete.error'),
      });
    }
  };

  // Calculate statistics
  const stats = prescriptionsData
    ? {
        total: prescriptionsData.total,
        active: prescriptionsData.prescriptions.filter(
          (p) => p.status === PrescriptionStatus.ACTIVE
        ).length,
        needsRefill: prescriptionsData.prescriptions.filter((p) => {
          if (!p.end_date || p.status !== PrescriptionStatus.ACTIVE) return false;
          const sevenDaysFromNow = new Date();
          sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
          return new Date(p.end_date) <= sevenDaysFromNow;
        }).length,
      }
    : null;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('prescriptions.title')}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t('prescriptions.description')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleManageTemplates}>
            <FileText className="mr-2 h-4 w-4" />
            {t('prescriptions.manage_templates')}
          </Button>
          <Button onClick={handleNewPrescription}>
            <Plus className="mr-2 h-4 w-4" />
            {t('prescriptions.new_prescription')}
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('prescriptions.stats.total')}
              </CardTitle>
              <Pill className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('prescriptions.stats.active')}
              </CardTitle>
              <Pill className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('prescriptions.stats.needs_refill')}
              </CardTitle>
              <RefreshCw className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.needsRefill}</div>
              {stats.needsRefill > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {t('prescriptions.stats.needs_refill_description')}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{t('prescriptions.filters.title')}</CardTitle>
          <CardDescription>{t('prescriptions.filters.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <PrescriptionFilters
            filters={filters}
            onFiltersChange={setFilters}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      {/* Prescriptions List */}
      <Card>
        <CardHeader>
          <CardTitle>{t('prescriptions.list.title')}</CardTitle>
          <CardDescription>
            {prescriptionsData
              ? t('prescriptions.list.showing', {
                  count: prescriptionsData.prescriptions.length,
                  total: prescriptionsData.total,
                })
              : t('prescriptions.list.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Loading State */}
          {isLoading && (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          )}

          {/* Error State */}
          {isError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {error instanceof Error
                  ? error.message
                  : t('prescriptions.error_loading')}
              </AlertDescription>
            </Alert>
          )}

          {/* Empty State */}
          {prescriptionsData && prescriptionsData.prescriptions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Pill className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {t('prescriptions.no_prescriptions')}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('prescriptions.no_prescriptions_description')}
              </p>
              <Button onClick={handleNewPrescription}>
                <Plus className="mr-2 h-4 w-4" />
                {t('prescriptions.create_first')}
              </Button>
            </div>
          )}

          {/* Prescriptions List */}
          {prescriptionsData && prescriptionsData.prescriptions.length > 0 && (
            <div className="space-y-3">
              {prescriptionsData.prescriptions.map((prescription: Prescription) => (
                <PrescriptionCard
                  key={prescription.id}
                  prescription={prescription}
                  showPatient={!filters.patient_id}
                  onView={() => handlePrescriptionClick(prescription.id)}
                  onEdit={() => handleEditPrescription(prescription.id)}
                  onDiscontinue={() => setDiscontinuingPrescription(prescription)}
                  onDelete={isAdmin ? () => setDeletingPrescription(prescription) : undefined}
                />
              ))}
            </div>
          )}

          {/* Pagination info */}
          {prescriptionsData && prescriptionsData.total > filters.limit! && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t('common.showing', {
                  start: filters.offset! + 1,
                  end: Math.min(filters.offset! + filters.limit!, prescriptionsData.total),
                  total: prescriptionsData.total,
                })}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={filters.offset === 0}
                  onClick={() =>
                    setFilters((f) => ({ ...f, offset: Math.max(0, f.offset! - f.limit!) }))
                  }
                >
                  {t('common.previous')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={filters.offset! + filters.limit! >= prescriptionsData.total}
                  onClick={() =>
                    setFilters((f) => ({ ...f, offset: f.offset! + f.limit! }))
                  }
                >
                  {t('common.next')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Patient Selection Dialog */}
      <Dialog open={showPatientSelector} onOpenChange={setShowPatientSelector}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('prescriptions.select_patient')}</DialogTitle>
            <DialogDescription>
              {t('prescriptions.select_patient_description')}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <PatientSearchCombobox
              value={selectedPatientId || ''}
              onSelect={handlePatientSelected}
              placeholder={t('patients.search_placeholder')}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Discontinue Dialog */}
      {discontinuingPrescription && (
        <DiscontinueDialog
          open={!!discontinuingPrescription}
          onOpenChange={(open) => !open && setDiscontinuingPrescription(null)}
          prescription={discontinuingPrescription}
          onConfirm={handleDiscontinue}
          isLoading={discontinueMutation.isPending}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingPrescription}
        onOpenChange={(open) => !open && setDeletingPrescription(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('prescriptions.delete.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('prescriptions.delete.description', {
                medication: deletingPrescription?.medication_name,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? t('common.deleting') : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
