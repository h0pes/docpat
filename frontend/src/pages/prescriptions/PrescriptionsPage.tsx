/**
 * PrescriptionsPage Component
 *
 * Main page for viewing and managing prescriptions.
 * Provides a list view with filtering, search, and quick actions.
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Pill, FileText, RefreshCw, AlertTriangle, FlaskConical } from 'lucide-react';

import { usePrescriptionSearch, useDiscontinuePrescription, useDeletePrescription, useCreatePrescription, useResumePrescription, useCreateCustomMedication } from '@/hooks/useVisits';
import { usePatientDrugInteractions } from '@/hooks/useDrugInteractions';
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
import { PrescriptionCard, PrescriptionFilters, DiscontinueDialog, RenewDialog, PrintPrescriptionDialog, StatusLegend } from '@/components/prescriptions';
import { CustomMedicationDialog } from '@/components/prescriptions/CustomMedicationDialog';
import {
  Prescription,
  PrescriptionStatus,
  PrescriptionSearchFilters,
  CreatePrescriptionRequest,
  CreateCustomMedicationRequest,
  DrugInteractionSeverity,
  isExpiredPrescription,
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

  // Expired filter (client-side filtering since it's a computed state)
  const [expiredFilter, setExpiredFilter] = useState(false);

  // Dialog states
  const [showPatientSelector, setShowPatientSelector] = useState(false);
  const [showCustomMedicationDialog, setShowCustomMedicationDialog] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [discontinuingPrescription, setDiscontinuingPrescription] = useState<Prescription | null>(null);
  const [renewingPrescription, setRenewingPrescription] = useState<Prescription | null>(null);
  const [resumingPrescription, setResumingPrescription] = useState<Prescription | null>(null);
  const [printingPrescription, setPrintingPrescription] = useState<Prescription | null>(null);
  const [deletingPrescription, setDeletingPrescription] = useState<Prescription | null>(null);

  // Fetch prescriptions
  const { data: prescriptionsData, isLoading, isError, error } = usePrescriptionSearch(filters);

  // Fetch drug interactions when a patient filter is applied
  const { data: interactionsData } = usePatientDrugInteractions(
    filters.patient_id,
    undefined, // Show all severity levels
    { enabled: !!filters.patient_id }
  );

  // Create a map of medication names to their highest interaction severity
  // This is used to show the interaction badge on ALL prescriptions involved
  const medicationSeverityMap = useMemo(() => {
    const severityOrder: DrugInteractionSeverity[] = ['unknown', 'minor', 'moderate', 'major', 'contraindicated'];
    const meds = new Map<string, DrugInteractionSeverity>();
    if (!interactionsData?.interactions) return meds;

    const updateSeverity = (drugName: string, severity: DrugInteractionSeverity) => {
      const existing = meds.get(drugName);
      if (!existing || severityOrder.indexOf(severity) > severityOrder.indexOf(existing)) {
        meds.set(drugName, severity);
      }
    };

    for (const interaction of interactionsData.interactions) {
      // Add both drugs in the interaction pair (lowercase for case-insensitive matching)
      if (interaction.drug_a_name) {
        updateSeverity(interaction.drug_a_name.toLowerCase(), interaction.severity);
      }
      if (interaction.drug_b_name) {
        updateSeverity(interaction.drug_b_name.toLowerCase(), interaction.severity);
      }
    }
    return meds;
  }, [interactionsData]);

  /**
   * Normalize drug name for comparison (handles Italian/English variations)
   * e.g., "omeprazolo" → "omeprazol", "fluconazolo" → "fluconazol"
   */
  const normalizeDrugName = (name: string): string => {
    let normalized = name.toLowerCase().trim();
    // Remove common Italian suffixes and normalize to base form
    // -olo → -ol (omeprazolo → omeprazol)
    // -ina → -in (claritromicina → claritromicin)
    // -one → -on (not always needed but helps)
    normalized = normalized
      .replace(/olo$/, 'ol')
      .replace(/ole$/, 'ol')
      .replace(/ina$/, 'in')
      .replace(/ine$/, 'in')
      .replace(/one$/, 'on');
    return normalized;
  };

  /**
   * Check if two drug names match (with normalization for Italian/English)
   */
  const drugNamesMatch = (name1: string, name2: string): boolean => {
    const n1 = normalizeDrugName(name1);
    const n2 = normalizeDrugName(name2);
    // Direct match after normalization
    if (n1 === n2) return true;
    // One contains the other (for compound names)
    if (n1.includes(n2) || n2.includes(n1)) return true;
    return false;
  };

  /**
   * Get interaction info for a prescription (has interaction + highest severity)
   */
  const getPrescriptionInteractionInfo = (prescription: Prescription): { hasInteraction: boolean; severity?: DrugInteractionSeverity } => {
    if (medicationSeverityMap.size === 0) return { hasInteraction: false };

    const medicationLower = prescription.medication_name.toLowerCase();
    const genericLower = prescription.generic_name?.toLowerCase();
    let highestSeverity: DrugInteractionSeverity | undefined;
    const severityOrder: DrugInteractionSeverity[] = ['unknown', 'minor', 'moderate', 'major', 'contraindicated'];

    // Check each drug in the interaction map
    for (const [interactionDrug, severity] of medicationSeverityMap) {
      let matched = false;

      // Check medication name
      if (drugNamesMatch(medicationLower, interactionDrug)) {
        matched = true;
      }

      // Check generic name
      if (!matched && genericLower && drugNamesMatch(genericLower, interactionDrug)) {
        matched = true;
      }

      if (matched && (!highestSeverity || severityOrder.indexOf(severity) > severityOrder.indexOf(highestSeverity))) {
        highestSeverity = severity;
      }
    }

    return { hasInteraction: !!highestSeverity, severity: highestSeverity };
  };

  // Mutations
  const discontinueMutation = useDiscontinuePrescription();
  const deleteMutation = useDeletePrescription();
  const createMutation = useCreatePrescription();
  const resumeMutation = useResumePrescription();
  const createCustomMedicationMutation = useCreateCustomMedication();

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
   * Handle create custom medication
   */
  const handleCreateCustomMedication = async (data: CreateCustomMedicationRequest) => {
    try {
      await createCustomMedicationMutation.mutateAsync(data);
      toast({
        title: t('prescriptions.custom_medication.success'),
        description: t('prescriptions.custom_medication.success_description', {
          name: data.name,
        }),
      });
      setShowCustomMedicationDialog(false);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('prescriptions.custom_medication.error'),
      });
    }
  };

  /**
   * Handle discontinue prescription
   */
  const handleDiscontinue = async (reason: string) => {
    if (!discontinuingPrescription) return;

    try {
      await discontinueMutation.mutateAsync({
        id: discontinuingPrescription.id,
        data: { reason },
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
   * Handle renew prescription
   */
  const handleRenew = async (data: CreatePrescriptionRequest) => {
    try {
      await createMutation.mutateAsync(data);
      toast({
        title: t('prescriptions.renew.success'),
        description: t('prescriptions.renew.success_description', {
          medication: data.medication_name,
        }),
      });
      setRenewingPrescription(null);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('prescriptions.renew.error'),
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

  /**
   * Handle resume prescription (from On Hold)
   */
  const handleResume = async () => {
    if (!resumingPrescription) return;

    try {
      await resumeMutation.mutateAsync(resumingPrescription.id);
      toast({
        title: t('prescriptions.resume.success'),
        description: t('prescriptions.resume.success_description', {
          medication: resumingPrescription.medication_name,
        }),
      });
      setResumingPrescription(null);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('prescriptions.resume.error'),
      });
    }
  };

  // Filter prescriptions client-side when expired filter is active
  const filteredPrescriptions = useMemo(() => {
    if (!prescriptionsData?.prescriptions) return [];

    if (expiredFilter) {
      // Show only ACTIVE prescriptions that have expired (end_date passed)
      return prescriptionsData.prescriptions.filter(
        (p) => p.status === PrescriptionStatus.ACTIVE && isExpiredPrescription(p)
      );
    }

    return prescriptionsData.prescriptions;
  }, [prescriptionsData, expiredFilter]);

  // Calculate statistics
  const stats = prescriptionsData
    ? {
        total: expiredFilter ? filteredPrescriptions.length : prescriptionsData.total,
        active: prescriptionsData.prescriptions.filter(
          (p) => p.status === PrescriptionStatus.ACTIVE
        ).length,
        needsRefill: prescriptionsData.prescriptions.filter((p) => {
          if (!p.end_date || p.status !== PrescriptionStatus.ACTIVE) return false;
          const sevenDaysFromNow = new Date();
          sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
          return new Date(p.end_date) <= sevenDaysFromNow;
        }).length,
        expired: prescriptionsData.prescriptions.filter(
          (p) => p.status === PrescriptionStatus.ACTIVE && isExpiredPrescription(p)
        ).length,
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
          <Button variant="outline" onClick={() => setShowCustomMedicationDialog(true)}>
            <FlaskConical className="mr-2 h-4 w-4" />
            {t('prescriptions.custom_medication.title')}
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
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>{t('prescriptions.filters.title')}</CardTitle>
            <CardDescription>{t('prescriptions.filters.description')}</CardDescription>
          </div>
          <StatusLegend />
        </CardHeader>
        <CardContent>
          <PrescriptionFilters
            filters={filters}
            onFiltersChange={setFilters}
            isLoading={isLoading}
            expiredFilter={expiredFilter}
            onExpiredFilterChange={setExpiredFilter}
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
                  count: filteredPrescriptions.length,
                  total: expiredFilter ? filteredPrescriptions.length : prescriptionsData.total,
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
          {prescriptionsData && filteredPrescriptions.length === 0 && (
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
          {prescriptionsData && filteredPrescriptions.length > 0 && (
            <div className="space-y-3">
              {filteredPrescriptions.map((prescription: Prescription) => {
                // Get real-time interaction info when patient filter is active
                const interactionInfo = filters.patient_id
                  ? getPrescriptionInteractionInfo(prescription)
                  : { hasInteraction: false };

                return (
                  <PrescriptionCard
                    key={prescription.id}
                    prescription={prescription}
                    showPatient={!filters.patient_id}
                    hasInteractionsOverride={
                      filters.patient_id ? interactionInfo.hasInteraction : undefined
                    }
                    highestSeverityOverride={
                      filters.patient_id ? interactionInfo.severity : undefined
                    }
                    onView={() => handlePrescriptionClick(prescription.id)}
                    onEdit={() => handleEditPrescription(prescription.id)}
                    onRenew={() => setRenewingPrescription(prescription)}
                    onResume={() => setResumingPrescription(prescription)}
                    onPrint={() => setPrintingPrescription(prescription)}
                    onDiscontinue={() => setDiscontinuingPrescription(prescription)}
                    onDelete={isAdmin ? () => setDeletingPrescription(prescription) : undefined}
                  />
                );
              })}
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

      {/* Resume Confirmation Dialog */}
      <AlertDialog
        open={!!resumingPrescription}
        onOpenChange={(open) => !open && setResumingPrescription(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('prescriptions.resume.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('prescriptions.resume.description', {
                medication: resumingPrescription?.medication_name,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResume}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              {resumeMutation.isPending ? t('common.processing') : t('prescriptions.actions.resume')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Renew Dialog */}
      {renewingPrescription && (
        <RenewDialog
          open={!!renewingPrescription}
          onOpenChange={(open) => !open && setRenewingPrescription(null)}
          prescription={renewingPrescription}
          providerId={user?.id || ''}
          onConfirm={handleRenew}
          isLoading={createMutation.isPending}
        />
      )}

      {/* Print Dialog */}
      {printingPrescription && (
        <PrintPrescriptionDialog
          open={!!printingPrescription}
          onOpenChange={(open) => !open && setPrintingPrescription(null)}
          prescription={printingPrescription}
        />
      )}

      {/* Custom Medication Dialog */}
      <CustomMedicationDialog
        open={showCustomMedicationDialog}
        onOpenChange={setShowCustomMedicationDialog}
        onConfirm={handleCreateCustomMedication}
        isLoading={createCustomMedicationMutation.isPending}
      />
    </div>
  );
}
