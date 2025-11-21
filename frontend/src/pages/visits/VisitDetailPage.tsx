/**
 * VisitDetailPage
 *
 * Comprehensive view-only page for displaying visit details.
 * Includes actions for editing, signing, locking, and printing.
 */

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Edit,
  FileSignature,
  Lock,
  Printer,
  Loader2,
  Calendar,
  User,
  Activity,
} from 'lucide-react';
import { format } from 'date-fns';
import { enUS, it } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useVisit } from '@/hooks/useVisits';
import { useToast } from '@/hooks/use-toast';
import { VisitStatus, getStatusColor, formatVitalSigns } from '@/types/visit';
import { DigitalSignatureDialog } from '@/components/visits/DigitalSignatureDialog';
import { VisitLockDialog } from '@/components/visits/VisitLockDialog';

/**
 * VisitDetailPage Component
 */
export function VisitDetailPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  // State for dialogs
  const [showSignDialog, setShowSignDialog] = useState(false);
  const [showLockDialog, setShowLockDialog] = useState(false);

  // Fetch visit data
  const { data: visit, isLoading, isError, error } = useVisit(id!);

  // Get date-fns locale
  const getDateFnsLocale = () => {
    return i18n.language === 'it' ? it : enUS;
  };

  /**
   * Handle edit action
   */
  const handleEdit = () => {
    navigate(`/visits/${id}/edit`);
  };

  /**
   * Handle print action
   */
  const handlePrint = () => {
    window.print();
  };

  /**
   * Handle sign success
   */
  const handleSignSuccess = () => {
    setShowSignDialog(false);
    toast({
      title: t('visits.messages.signSuccess'),
      description: t('visits.messages.signSuccessDescription'),
    });
  };

  /**
   * Handle lock success
   */
  const handleLockSuccess = () => {
    setShowLockDialog(false);
    toast({
      title: t('visits.messages.lockSuccess'),
      description: t('visits.messages.lockSuccessDescription'),
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !visit) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertDescription>
            {error instanceof Error ? error.message : t('visits.messages.loadError')}
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => navigate('/visits')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('visits.title')}
          </Button>
        </div>
      </div>
    );
  }

  // Check if visit can be edited/signed/locked
  const canEdit = visit.status === VisitStatus.DRAFT;
  const canSign = visit.status === VisitStatus.DRAFT;
  const canLock = visit.status === VisitStatus.SIGNED;

  return (
    <div className="container mx-auto py-8 print:py-0">
      {/* Header with actions */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/patients/${visit.patient_id}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('common.back')}
        </Button>

        <div className="flex items-center gap-2">
          {canEdit && (
            <Button variant="outline" size="sm" onClick={handleEdit}>
              <Edit className="mr-2 h-4 w-4" />
              {t('common.edit')}
            </Button>
          )}
          {canSign && (
            <Button variant="outline" size="sm" onClick={() => setShowSignDialog(true)}>
              <FileSignature className="mr-2 h-4 w-4" />
              {t('visits.sign_visit')}
            </Button>
          )}
          {canLock && (
            <Button variant="outline" size="sm" onClick={() => setShowLockDialog(true)}>
              <Lock className="mr-2 h-4 w-4" />
              {t('visits.lock_visit')}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            {t('common.print')}
          </Button>
        </div>
      </div>

      {/* Visit header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">
                {t('visits.visit_detail_title')}
              </CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={getStatusColor(visit.status)}>
                  {t(`visits.status.${visit.status.toLowerCase()}`)}
                </Badge>
                <Badge variant="outline">
                  {t(`visits.visit_types.${visit.visit_type.toLowerCase()}`)}
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">{t('visits.visit_date')}</p>
                <p className="font-medium">
                  {format(new Date(visit.visit_date), 'PPP', { locale: getDateFnsLocale() })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">{t('visits.provider')}</p>
                <p className="font-medium">{visit.provider_id}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">{t('visits.created_at')}</p>
                <p className="font-medium">
                  {format(new Date(visit.created_at), 'PPp', { locale: getDateFnsLocale() })}
                </p>
              </div>
            </div>
          </div>

          {visit.chief_complaint && (
            <>
              <Separator className="my-4" />
              <div>
                <h3 className="font-semibold mb-2">{t('visits.chief_complaint')}</h3>
                <p className="text-sm text-muted-foreground">{visit.chief_complaint}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Vital Signs */}
      {visit.vital_signs && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t('visits.vitals.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {formatVitalSigns(visit.vital_signs).map((vital, index) => (
                <div key={index}>
                  <p className="text-muted-foreground">{vital.label}</p>
                  <p className="font-medium text-lg">{vital.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* SOAP Notes */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t('visits.soap.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {visit.subjective && (
            <div>
              <h3 className="font-semibold text-sm mb-2">{t('visits.soap.subjective.title')}</h3>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                {visit.subjective}
              </p>
            </div>
          )}

          {visit.objective && (
            <div>
              <h3 className="font-semibold text-sm mb-2">{t('visits.soap.objective.title')}</h3>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                {visit.objective}
              </p>
            </div>
          )}

          {visit.assessment && (
            <div>
              <h3 className="font-semibold text-sm mb-2">{t('visits.soap.assessment.title')}</h3>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                {visit.assessment}
              </p>
            </div>
          )}

          {visit.plan && (
            <div>
              <h3 className="font-semibold text-sm mb-2">{t('visits.soap.plan.title')}</h3>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                {visit.plan}
              </p>
            </div>
          )}

          {!visit.subjective && !visit.objective && !visit.assessment && !visit.plan && (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t('visits.no_soap_notes')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Signature info (if signed or locked) */}
      {(visit.status === VisitStatus.SIGNED || visit.status === VisitStatus.LOCKED) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t('visits.signature_info')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {visit.signed_at && (
                <div>
                  <span className="text-muted-foreground">{t('visits.signed_at')}: </span>
                  <span className="font-medium">
                    {format(new Date(visit.signed_at), 'PPp', { locale: getDateFnsLocale() })}
                  </span>
                </div>
              )}
              {visit.signature_hash && (
                <div>
                  <span className="text-muted-foreground">{t('visits.signature_hash')}: </span>
                  <span className="font-mono text-xs">{visit.signature_hash}</span>
                </div>
              )}
              {visit.locked_at && (
                <div>
                  <span className="text-muted-foreground">{t('visits.locked_at')}: </span>
                  <span className="font-medium">
                    {format(new Date(visit.locked_at), 'PPp', { locale: getDateFnsLocale() })}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      {showSignDialog && (
        <DigitalSignatureDialog
          visitId={id!}
          onSuccess={handleSignSuccess}
          onClose={() => setShowSignDialog(false)}
        />
      )}

      {showLockDialog && (
        <VisitLockDialog
          visitId={id!}
          onSuccess={handleLockSuccess}
          onClose={() => setShowLockDialog(false)}
        />
      )}
    </div>
  );
}
