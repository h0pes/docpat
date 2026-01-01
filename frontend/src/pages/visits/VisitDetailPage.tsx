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
  FileOutput,
  Pill,
  Plus,
  Eye,
} from 'lucide-react';
import { format } from 'date-fns';
import { enUS, it } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useVisit, useVisitPrescriptions } from '@/hooks/useVisits';
import { useToast } from '@/hooks/use-toast';
import { VisitStatus, getStatusColor, formatVitalSigns } from '@/types/visit';
import { PrescriptionStatus, getStatusBadgeColor as getPrescriptionStatusColor } from '@/types/prescription';
import { Skeleton } from '@/components/ui/skeleton';
import { DigitalSignatureDialog } from '@/components/visits/DigitalSignatureDialog';
import { VisitLockDialog } from '@/components/visits/VisitLockDialog';
import { DocumentGenerationDialog, VisitDocumentsSection } from '@/components/documents';
import type { GeneratedDocument } from '@/types/document';

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
  const [showGenerateDocDialog, setShowGenerateDocDialog] = useState(false);

  // Fetch visit data
  const { data: visit, isLoading, isError, error } = useVisit(id!);

  // Fetch visit prescriptions
  const {
    data: prescriptions,
    isLoading: prescriptionsLoading,
  } = useVisitPrescriptions(id!, { enabled: !!id });

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

  /**
   * Handle document generation success
   */
  const handleDocumentGenerationSuccess = (document: GeneratedDocument) => {
    setShowGenerateDocDialog(false);
    toast({
      title: t('documents.generation.success'),
      description: t('documents.generation.success_description', { title: document.document_title }),
    });
    // Optionally navigate to documents page or stay on current page
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
    <>
      {/* Print-specific styles */}
      <style>{`
        @media print {
          /* Reset print margins and optimize for medical documentation */
          @page {
            size: A4;
            margin: 2cm 1.5cm;
          }

          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          /* Hide UI elements */
          header, nav, footer, .no-print {
            display: none !important;
          }

          /* Container adjustments */
          .print-container {
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          /* Print header with clinic info */
          .print-header {
            display: block !important;
            text-align: center;
            margin-bottom: 1.5cm;
            padding-bottom: 0.5cm;
            border-bottom: 2px solid #000;
          }

          .print-header h1 {
            font-size: 20pt;
            font-weight: bold;
            margin: 0 0 0.3cm 0;
            color: #000;
          }

          .print-header p {
            font-size: 10pt;
            margin: 0.1cm 0;
            color: #333;
          }

          /* Card styling for print */
          .print-card {
            page-break-inside: avoid;
            margin-bottom: 0.8cm;
            border: 1px solid #ddd !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: white !important;
          }

          .print-card-header {
            background: #f5f5f5 !important;
            border-bottom: 1px solid #ddd !important;
            padding: 0.4cm !important;
          }

          .print-card-title {
            font-size: 14pt !important;
            font-weight: bold !important;
            color: #000 !important;
          }

          .print-card-content {
            padding: 0.5cm !important;
          }

          /* Typography */
          .print-label {
            font-size: 9pt;
            color: #666 !important;
            font-weight: normal;
          }

          .print-value {
            font-size: 11pt;
            color: #000 !important;
            font-weight: 500;
          }

          /* SOAP Notes specific styling */
          .print-soap-section {
            margin-bottom: 0.6cm;
            page-break-inside: avoid;
          }

          .print-soap-title {
            font-size: 11pt;
            font-weight: bold;
            color: #000 !important;
            margin-bottom: 0.2cm;
            text-transform: uppercase;
            letter-spacing: 0.5pt;
          }

          .print-soap-content {
            font-size: 10pt;
            line-height: 1.5;
            color: #000 !important;
            white-space: pre-wrap;
            font-family: Georgia, serif;
          }

          /* Vital signs grid */
          .print-vitals-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 0.5cm;
          }

          .print-vital-item {
            padding: 0.3cm;
            background: #fafafa !important;
            border: 1px solid #e0e0e0;
          }

          /* Badge styling */
          .print-badge {
            display: inline-block;
            padding: 0.1cm 0.3cm;
            border: 1px solid #333;
            border-radius: 0;
            font-size: 9pt;
            font-weight: 500;
            color: #000 !important;
            background: white !important;
          }

          /* Metadata grid */
          .print-metadata-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 0.5cm;
            margin-bottom: 0.5cm;
          }

          /* Signature section */
          .print-signature-section {
            margin-top: 1cm;
            padding-top: 0.5cm;
            border-top: 1px solid #000;
            page-break-inside: avoid;
          }

          .print-signature-line {
            margin-top: 1cm;
            padding-top: 0.3cm;
            border-top: 1px solid #333;
            width: 50%;
            text-align: center;
            font-size: 9pt;
            color: #666;
          }

          /* Footer with page numbers */
          .print-footer {
            display: block;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 8pt;
            color: #666;
          }

          /* Prevent breaking */
          h1, h2, h3, h4, h5, h6 {
            page-break-after: avoid;
          }

          /* Links */
          a {
            color: #000 !important;
            text-decoration: none !important;
          }

          /* Ensure black text for all content */
          * {
            color: #000 !important;
          }

          .text-muted-foreground {
            color: #666 !important;
          }
        }
      `}</style>

      <div className="container mx-auto py-8 print:py-0 print-container">
        {/* Print-only header */}
        <div className="hidden print:block print-header">
          <h1>DocPat Medical Practice</h1>
          <p>Clinical Visit Documentation</p>
          <p>Confidential Medical Record</p>
        </div>

        {/* Header with actions */}
        <div className="mb-6 flex items-center justify-between print:hidden no-print">
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
          <Button variant="outline" size="sm" onClick={() => setShowGenerateDocDialog(true)}>
            <FileOutput className="mr-2 h-4 w-4" />
            {t('documents.generate_document')}
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            {t('common.print')}
          </Button>
        </div>
      </div>

      {/* Visit header */}
      <Card className="mb-6 print-card">
        <CardHeader className="print-card-header">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl print-card-title">
                {t('visits.visit_detail_title')}
              </CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={`${getStatusColor(visit.status)} print-badge`}>
                  {t(`visits.status.${visit.status.toLowerCase()}`)}
                </Badge>
                <Badge variant="outline" className="print-badge">
                  {t(`visits.visit_types.${visit.visit_type.toLowerCase()}`)}
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="print-card-content">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm print-metadata-grid">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground print:hidden" />
              <div>
                <p className="text-muted-foreground print-label">{t('visits.visit_date')}</p>
                <p className="font-medium print-value">
                  {format(new Date(visit.visit_date), 'PPP', { locale: getDateFnsLocale() })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground print:hidden" />
              <div>
                <p className="text-muted-foreground print-label">{t('visits.provider')}</p>
                <p className="font-medium print-value">{visit.provider_id}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground print:hidden" />
              <div>
                <p className="text-muted-foreground print-label">{t('visits.created_at')}</p>
                <p className="font-medium print-value">
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
        <Card className="mb-6 print-card">
          <CardHeader className="print-card-header">
            <CardTitle className="print-card-title">{t('visits.vitals.title')}</CardTitle>
          </CardHeader>
          <CardContent className="print-card-content">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm print-vitals-grid">
              {formatVitalSigns(visit.vital_signs).map((vital, index) => (
                <div key={index} className="print-vital-item">
                  <p className="text-muted-foreground print-label">{vital.label}</p>
                  <p className="font-medium text-lg print-value">{vital.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* SOAP Notes */}
      <Card className="mb-6 print-card">
        <CardHeader className="print-card-header">
          <CardTitle className="print-card-title">{t('visits.soap.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 print-card-content">
          {visit.subjective && (
            <div className="print-soap-section">
              <h3 className="font-semibold text-sm mb-2 print-soap-title">{t('visits.soap.subjective.title')}</h3>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground print-soap-content">
                {visit.subjective}
              </p>
            </div>
          )}

          {visit.objective && (
            <div className="print-soap-section">
              <h3 className="font-semibold text-sm mb-2 print-soap-title">{t('visits.soap.objective.title')}</h3>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground print-soap-content">
                {visit.objective}
              </p>
            </div>
          )}

          {visit.assessment && (
            <div className="print-soap-section">
              <h3 className="font-semibold text-sm mb-2 print-soap-title">{t('visits.soap.assessment.title')}</h3>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground print-soap-content">
                {visit.assessment}
              </p>
            </div>
          )}

          {visit.plan && (
            <div className="print-soap-section">
              <h3 className="font-semibold text-sm mb-2 print-soap-title">{t('visits.soap.plan.title')}</h3>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground print-soap-content">
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
        <Card className="mb-6 print-card print-signature-section">
          <CardHeader className="print-card-header">
            <CardTitle className="print-card-title">{t('visits.signature_info')}</CardTitle>
          </CardHeader>
          <CardContent className="print-card-content">
            <div className="space-y-2 text-sm">
              {visit.signed_at && (
                <div>
                  <span className="text-muted-foreground print-label">{t('visits.signed_at')}: </span>
                  <span className="font-medium print-value">
                    {format(new Date(visit.signed_at), 'PPp', { locale: getDateFnsLocale() })}
                  </span>
                </div>
              )}
              {visit.signature_hash && (
                <div>
                  <span className="text-muted-foreground print-label">{t('visits.signature_hash')}: </span>
                  <span className="font-mono text-xs print-value">{visit.signature_hash}</span>
                </div>
              )}
              {visit.locked_at && (
                <div>
                  <span className="text-muted-foreground print-label">{t('visits.locked_at')}: </span>
                  <span className="font-medium print-value">
                    {format(new Date(visit.locked_at), 'PPp', { locale: getDateFnsLocale() })}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Visit Prescriptions Section */}
      <Card className="mb-6 print-card">
        <CardHeader className="print-card-header flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 print-card-title">
              <Pill className="h-5 w-5" />
              {t('prescriptions.title')}
            </CardTitle>
          </div>
          <Button
            size="sm"
            className="gap-1 no-print"
            onClick={() => navigate(`/prescriptions/new?patientId=${visit?.patient_id}&visitId=${id}`)}
          >
            <Plus className="h-4 w-4" />
            {t('prescriptions.new_prescription')}
          </Button>
        </CardHeader>
        <CardContent className="print-card-content">
          {prescriptionsLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-4 p-3 border rounded-lg">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          ) : !prescriptions || prescriptions.length === 0 ? (
            <div className="text-center py-8">
              <Pill className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                {t('visits.no_prescriptions')}
              </p>
              <Button
                onClick={() => navigate(`/prescriptions/new?patientId=${visit?.patient_id}&visitId=${id}`)}
                className="gap-2 no-print"
              >
                <Plus className="h-4 w-4" />
                {t('prescriptions.new_prescription')}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {prescriptions.map((prescription) => (
                <div
                  key={prescription.id}
                  className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/prescriptions/${prescription.id}`)}
                >
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Pill className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{prescription.medication_name}</span>
                      <Badge variant="outline" className="text-xs">
                        {prescription.dosage}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {prescription.frequency}
                      {prescription.instructions && ` - ${prescription.instructions}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getPrescriptionStatusColor(prescription.status)}>
                      {t(`prescriptions.status.${prescription.status.toLowerCase()}`)}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8 no-print">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Visit Documents Section */}
      <div className="mb-6">
        <VisitDocumentsSection
          visitId={id!}
          onGenerateDocument={() => setShowGenerateDocDialog(true)}
        />
      </div>

        {/* Print-only footer */}
        <div className="hidden print:block print-footer">
          <p>DocPat Medical Practice - Confidential Medical Record</p>
          <p>Visit ID: {id} | Generated: {format(new Date(), 'PPp', { locale: getDateFnsLocale() })}</p>
        </div>
      </div>

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

      {showGenerateDocDialog && visit && (
        <DocumentGenerationDialog
          patientId={visit.patient_id}
          visitId={id!}
          visitDate={visit.visit_date}
          onSuccess={handleDocumentGenerationSuccess}
          onClose={() => setShowGenerateDocDialog(false)}
        />
      )}
    </>
  );
}
