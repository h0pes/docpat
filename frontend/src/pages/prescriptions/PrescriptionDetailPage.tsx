/**
 * PrescriptionDetailPage Component
 *
 * Displays full details of a single prescription including medication info,
 * refill status, drug interactions, and management actions.
 */

import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Printer,
  XCircle,
  Pill,
  Calendar,
  User,
  FileText,
  RefreshCw,
  AlertTriangle,
  Clock,
  Building,
  ExternalLink,
  PauseCircle,
  PlayCircle,
  CheckCircle,
} from 'lucide-react';

import {
  usePrescription,
  useDiscontinuePrescription,
  useDeletePrescription,
  useCancelPrescription,
  useHoldPrescription,
  useResumePrescription,
  useCompletePrescription,
  useCreatePrescription,
} from '@/hooks/useVisits';
import { Copy } from 'lucide-react';
import { CreatePrescriptionRequest } from '@/types/prescription';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import {
  DiscontinueDialog,
  PrintPrescriptionDialog,
  CancelDialog,
  HoldDialog,
  RenewDialog,
  StatusLegend,
} from '@/components/prescriptions';
import {
  PrescriptionStatus,
  canDiscontinue,
  getStatusColor,
  getInteractionSeverityColor,
  needsRefillSoon,
  isExpired,
} from '@/types/prescription';
import { useAuth } from '@/store/authStore';
import { useState } from 'react';

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
 * PrescriptionDetailPage Component
 */
export function PrescriptionDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  // Dialog states
  const [showDiscontinueDialog, setShowDiscontinueDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showHoldDialog, setShowHoldDialog] = useState(false);
  const [showResumeConfirm, setShowResumeConfirm] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [showRenewDialog, setShowRenewDialog] = useState(false);

  // Fetch prescription
  const { data: prescription, isLoading, isError, error } = usePrescription(id!);

  // Mutations
  const discontinueMutation = useDiscontinuePrescription();
  const deleteMutation = useDeletePrescription();
  const cancelMutation = useCancelPrescription();
  const holdMutation = useHoldPrescription();
  const resumeMutation = useResumePrescription();
  const completeMutation = useCompletePrescription();
  const createMutation = useCreatePrescription();

  /**
   * Handle discontinue prescription
   */
  const handleDiscontinue = async (reason: string) => {
    if (!prescription) return;

    try {
      await discontinueMutation.mutateAsync({
        id: prescription.id,
        data: { reason },
      });
      toast({
        title: t('prescriptions.discontinue.success'),
        description: t('prescriptions.discontinue.success_description', {
          medication: prescription.medication_name,
        }),
      });
      setShowDiscontinueDialog(false);
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
    if (!prescription) return;

    try {
      await deleteMutation.mutateAsync(prescription.id);
      toast({
        title: t('prescriptions.delete.success'),
        description: t('prescriptions.delete.success_description'),
      });
      navigate('/prescriptions');
    } catch (err) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('prescriptions.delete.error'),
      });
    }
  };

  /**
   * Handle print prescription - opens print dialog
   */
  const handlePrint = () => {
    setShowPrintDialog(true);
  };

  /**
   * Handle cancel prescription
   */
  const handleCancel = async (reason?: string) => {
    if (!prescription) return;

    try {
      await cancelMutation.mutateAsync({
        id: prescription.id,
        data: reason ? { reason } : undefined,
      });
      toast({
        title: t('prescriptions.cancel.success'),
        description: t('prescriptions.cancel.success_description', {
          medication: prescription.medication_name,
        }),
      });
      setShowCancelDialog(false);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('prescriptions.cancel.error'),
      });
    }
  };

  /**
   * Handle hold prescription
   */
  const handleHold = async (reason: string) => {
    if (!prescription) return;

    try {
      await holdMutation.mutateAsync({
        id: prescription.id,
        data: { reason },
      });
      toast({
        title: t('prescriptions.hold.success'),
        description: t('prescriptions.hold.success_description', {
          medication: prescription.medication_name,
        }),
      });
      setShowHoldDialog(false);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('prescriptions.hold.error'),
      });
    }
  };

  /**
   * Handle resume prescription
   */
  const handleResume = async () => {
    if (!prescription) return;

    try {
      await resumeMutation.mutateAsync(prescription.id);
      toast({
        title: t('prescriptions.resume.success'),
        description: t('prescriptions.resume.success_description', {
          medication: prescription.medication_name,
        }),
      });
      setShowResumeConfirm(false);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('prescriptions.resume.error'),
      });
    }
  };

  /**
   * Handle complete prescription
   */
  const handleComplete = async () => {
    if (!prescription) return;

    try {
      await completeMutation.mutateAsync(prescription.id);
      toast({
        title: t('prescriptions.complete.success'),
        description: t('prescriptions.complete.success_description', {
          medication: prescription.medication_name,
        }),
      });
      setShowCompleteConfirm(false);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('prescriptions.complete.error'),
      });
    }
  };

  /**
   * Handle renew prescription - creates a new prescription based on the existing one
   */
  const handleRenew = async (data: CreatePrescriptionRequest) => {
    if (!prescription) return;

    try {
      const newPrescription = await createMutation.mutateAsync(data);
      toast({
        title: t('prescriptions.renew.success'),
        description: t('prescriptions.renew.success_description', {
          medication: prescription.medication_name,
        }),
      });
      setShowRenewDialog(false);
      // Navigate to the new prescription
      navigate(`/prescriptions/${newPrescription.id}`);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('prescriptions.renew.error'),
      });
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t('common.error')}</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : t('prescriptions.error_loading')}
          </AlertDescription>
        </Alert>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/prescriptions')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('prescriptions.back_to_list')}
        </Button>
      </div>
    );
  }

  if (!prescription) {
    return null;
  }

  const showRefillWarning = needsRefillSoon(prescription);
  const isExpiredPrescription = isExpired(prescription);
  const hasInteractions =
    prescription.interaction_warnings && prescription.interaction_warnings.length > 0;
  const canEdit = prescription.status === PrescriptionStatus.ACTIVE;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/prescriptions')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{prescription.medication_name}</h1>
              <Badge variant={getStatusVariant(prescription.status)}>
                {t(`prescriptions.status.${prescription.status.toLowerCase()}`)}
              </Badge>
            </div>
            {prescription.generic_name && (
              <p className="text-muted-foreground">{prescription.generic_name}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            {t('common.print')}
          </Button>
          {canEdit && (
            <Button
              variant="outline"
              onClick={() => navigate(`/prescriptions/${prescription.id}/edit`)}
            >
              <Edit className="mr-2 h-4 w-4" />
              {t('common.edit')}
            </Button>
          )}
          {/* Status Actions */}
          {prescription.status === PrescriptionStatus.ACTIVE && (
            <>
              <Button
                variant="outline"
                className="text-yellow-600 border-yellow-300 hover:bg-yellow-50"
                onClick={() => setShowHoldDialog(true)}
              >
                <PauseCircle className="mr-2 h-4 w-4" />
                {t('prescriptions.actions.hold')}
              </Button>
              <Button
                variant="outline"
                className="text-green-600 border-green-300 hover:bg-green-50"
                onClick={() => setShowCompleteConfirm(true)}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                {t('prescriptions.actions.complete')}
              </Button>
              <Button
                variant="outline"
                className="text-red-600 border-red-300 hover:bg-red-50"
                onClick={() => setShowCancelDialog(true)}
              >
                <XCircle className="mr-2 h-4 w-4" />
                {t('prescriptions.actions.cancel')}
              </Button>
            </>
          )}
          {prescription.status === PrescriptionStatus.ON_HOLD && (
            <Button
              variant="outline"
              className="text-green-600 border-green-300 hover:bg-green-50"
              onClick={() => setShowResumeConfirm(true)}
            >
              <PlayCircle className="mr-2 h-4 w-4" />
              {t('prescriptions.actions.resume')}
            </Button>
          )}
          {/* Renew button - available for completed, discontinued, cancelled, or expired prescriptions */}
          {(prescription.status === PrescriptionStatus.COMPLETED ||
            prescription.status === PrescriptionStatus.DISCONTINUED ||
            prescription.status === PrescriptionStatus.CANCELLED ||
            isExpiredPrescription) && (
            <Button
              variant="outline"
              className="text-blue-600 border-blue-300 hover:bg-blue-50"
              onClick={() => setShowRenewDialog(true)}
            >
              <Copy className="mr-2 h-4 w-4" />
              {t('prescriptions.actions.renew')}
            </Button>
          )}
          {canDiscontinue(prescription.status) && (
            <Button
              variant="outline"
              className="text-orange-600 border-orange-300 hover:bg-orange-50"
              onClick={() => setShowDiscontinueDialog(true)}
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              {t('prescriptions.actions.discontinue')}
            </Button>
          )}
          {isAdmin && (
            <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              {t('common.delete')}
            </Button>
          )}
        </div>
      </div>

      {/* Warnings */}
      {showRefillWarning && (
        <Alert className="border-yellow-400 bg-yellow-50 dark:bg-yellow-950">
          <RefreshCw className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-800 dark:text-yellow-200">
            {t('prescriptions.warnings.needs_refill_title')}
          </AlertTitle>
          <AlertDescription className="text-yellow-700 dark:text-yellow-300">
            {t('prescriptions.warnings.needs_refill_description')}
          </AlertDescription>
        </Alert>
      )}

      {isExpiredPrescription && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t('prescriptions.warnings.expired_title')}</AlertTitle>
          <AlertDescription>{t('prescriptions.warnings.expired_description')}</AlertDescription>
        </Alert>
      )}

      {/* Drug Interactions Warning */}
      {hasInteractions && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t('prescriptions.interactions.title')}</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-2">
              {prescription.interaction_warnings!.map((warning, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Badge className={getInteractionSeverityColor(warning.severity)}>
                    {t(`prescriptions.interactions.severity.${warning.severity}`)}
                  </Badge>
                  <div>
                    <span className="font-medium">{warning.medication_name}</span>
                    <p className="text-sm">{warning.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Main content grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Medication Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pill className="h-5 w-5" />
              {t('prescriptions.details.medication')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('prescriptions.details.dosage')}
                </p>
                <p className="text-lg font-semibold">{prescription.dosage}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('prescriptions.details.frequency')}
                </p>
                <p className="text-lg">{prescription.frequency}</p>
              </div>
            </div>

            {prescription.form && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('prescriptions.details.form')}
                </p>
                <p>{t(`visits.prescription.forms.${prescription.form.toLowerCase()}`)}</p>
              </div>
            )}

            {prescription.route && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('prescriptions.details.route')}
                </p>
                <p>{t(`visits.prescription.routes.${prescription.route.toLowerCase()}`)}</p>
              </div>
            )}

            {prescription.duration && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('prescriptions.details.duration')}
                </p>
                <p>{prescription.duration}</p>
              </div>
            )}

            {prescription.quantity && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('prescriptions.details.quantity')}
                </p>
                <p>{prescription.quantity}</p>
              </div>
            )}

            <Separator />

            <div className="flex items-center gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('prescriptions.details.refills')}
                </p>
                <p className="text-lg font-semibold">{prescription.refills}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dates & Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {t('prescriptions.details.dates_status')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t('prescriptions.details.prescribed_date')}
              </p>
              <p className="text-lg">{format(new Date(prescription.prescribed_date), 'PPP')}</p>
            </div>

            {prescription.start_date && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('prescriptions.details.start_date')}
                </p>
                <p>{format(new Date(prescription.start_date), 'PPP')}</p>
              </div>
            )}

            {prescription.end_date && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('prescriptions.details.end_date')}
                </p>
                <p className={isExpiredPrescription ? 'text-destructive' : ''}>
                  {format(new Date(prescription.end_date), 'PPP')}
                </p>
              </div>
            )}

            {prescription.status === PrescriptionStatus.DISCONTINUED && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {t('prescriptions.details.discontinued_date')}
                  </p>
                  <p className="text-orange-600">
                    {prescription.discontinued_at
                      ? format(new Date(prescription.discontinued_at), 'PPP')
                      : '-'}
                  </p>
                </div>
                {prescription.discontinuation_reason && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {t('prescriptions.details.discontinued_reason')}
                    </p>
                    <p className="text-sm">{prescription.discontinuation_reason}</p>
                  </div>
                )}
              </>
            )}

            {prescription.status === PrescriptionStatus.CANCELLED && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {t('prescriptions.details.cancelled_date')}
                  </p>
                  <p className="text-red-600">
                    {format(new Date(prescription.updated_at), 'PPP')}
                  </p>
                </div>
                {prescription.discontinuation_reason && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {t('prescriptions.details.cancellation_reason')}
                    </p>
                    <p className="text-sm">{prescription.discontinuation_reason}</p>
                  </div>
                )}
              </>
            )}

            {prescription.status === PrescriptionStatus.ON_HOLD && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {t('prescriptions.details.on_hold_since')}
                  </p>
                  <p className="text-yellow-600">
                    {format(new Date(prescription.updated_at), 'PPP')}
                  </p>
                </div>
                {prescription.discontinuation_reason && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {t('prescriptions.details.hold_reason')}
                    </p>
                    <p className="text-sm">{prescription.discontinuation_reason}</p>
                  </div>
                )}
              </>
            )}

            {prescription.status === PrescriptionStatus.COMPLETED && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {t('prescriptions.details.completed_date')}
                  </p>
                  <p className="text-gray-600">
                    {format(new Date(prescription.updated_at), 'PPP')}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Instructions and Notes */}
      {(prescription.instructions || prescription.pharmacy_notes) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t('prescriptions.details.instructions_notes')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {prescription.instructions && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  {t('prescriptions.details.patient_instructions')}
                </p>
                <p className="whitespace-pre-wrap">{prescription.instructions}</p>
              </div>
            )}
            {prescription.pharmacy_notes && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  {t('prescriptions.details.pharmacy_notes')}
                </p>
                <p className="whitespace-pre-wrap">{prescription.pharmacy_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Related Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            {t('prescriptions.details.related_info')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Patient link */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                {t('prescriptions.details.patient')}
              </p>
              <Button variant="link" className="p-0 h-auto" asChild>
                <Link to={`/patients/${prescription.patient_id}`}>
                  <User className="mr-2 h-4 w-4" />
                  {t('prescriptions.view_patient')}
                </Link>
              </Button>
            </div>

            {/* Visit link (if prescription was created from a visit) */}
            {prescription.visit_id && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  {t('prescriptions.details.visit')}
                </p>
                <Button variant="link" className="p-0 h-auto" asChild>
                  <Link to={`/visits/${prescription.visit_id}`}>
                    <FileText className="mr-2 h-4 w-4" />
                    {t('prescriptions.view_visit')}
                  </Link>
                </Button>
              </div>
            )}
          </div>

          <Separator />

          {/* Audit info */}
          <div className="grid gap-4 md:grid-cols-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>
                {t('common.created_at')}: {format(new Date(prescription.created_at), 'PPp')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>
                {t('common.updated_at')}: {format(new Date(prescription.updated_at), 'PPp')}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Discontinue Dialog */}
      {prescription && (
        <DiscontinueDialog
          open={showDiscontinueDialog}
          onOpenChange={setShowDiscontinueDialog}
          prescription={prescription}
          onConfirm={handleDiscontinue}
          isLoading={discontinueMutation.isPending}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('prescriptions.delete.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('prescriptions.delete.description', {
                medication: prescription?.medication_name,
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

      {/* Print Prescription Dialog */}
      {prescription && (
        <PrintPrescriptionDialog
          open={showPrintDialog}
          onOpenChange={setShowPrintDialog}
          prescription={prescription}
        />
      )}

      {/* Cancel Dialog */}
      {prescription && (
        <CancelDialog
          open={showCancelDialog}
          onOpenChange={setShowCancelDialog}
          prescription={prescription}
          onConfirm={handleCancel}
          isLoading={cancelMutation.isPending}
        />
      )}

      {/* Hold Dialog */}
      {prescription && (
        <HoldDialog
          open={showHoldDialog}
          onOpenChange={setShowHoldDialog}
          prescription={prescription}
          onConfirm={handleHold}
          isLoading={holdMutation.isPending}
        />
      )}

      {/* Resume Confirmation Dialog */}
      <AlertDialog open={showResumeConfirm} onOpenChange={setShowResumeConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('prescriptions.resume.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('prescriptions.hold.info', {
                medication: prescription?.medication_name,
              }).replace('put', 'resume').replace('on hold', 'from hold')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResume}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              {resumeMutation.isPending ? t('common.processing') : t('prescriptions.resume.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Complete Confirmation Dialog */}
      <AlertDialog open={showCompleteConfirm} onOpenChange={setShowCompleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('prescriptions.complete.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('prescriptions.complete.success_description', {
                medication: prescription?.medication_name,
              }).replace('has been', 'will be')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleComplete}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              {completeMutation.isPending ? t('common.processing') : t('prescriptions.complete.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Renew Dialog */}
      {prescription && user && (
        <RenewDialog
          open={showRenewDialog}
          onOpenChange={setShowRenewDialog}
          prescription={prescription}
          providerId={user.id}
          onConfirm={handleRenew}
          isLoading={createMutation.isPending}
        />
      )}
    </div>
  );
}
