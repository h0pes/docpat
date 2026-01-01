/**
 * PrintPrescriptionDialog Component
 *
 * Dialog for generating and printing a prescription document.
 * Integrates with the document generation system using PRESCRIPTION templates.
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Printer, FileOutput, Loader2, Download, ExternalLink } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import {
  useDocumentTemplates,
  useGenerateDocument,
} from '@/hooks/useDocuments';
import { documentsApi } from '@/services/api/documents';
import { useToast } from '@/hooks/use-toast';
import { DocumentType } from '@/types/document';
import type { Prescription } from '@/types/prescription';

interface PrintPrescriptionDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog is closed */
  onOpenChange: (open: boolean) => void;
  /** The prescription to print */
  prescription: Prescription;
  /** Patient name for display */
  patientName?: string;
}

/**
 * Convert a prescription to the template variable format.
 *
 * Maps Prescription model fields to template variable names:
 * - strength: medication strength (e.g., "500mg") from prescription.dosage
 * - dosage: posology/how to take (e.g., "1 compressa x 3/die") from prescription.frequency
 * - form: medication form from prescription.form
 * - instructions: patient instructions from prescription.instructions
 * - quantity: number of packages from prescription.quantity
 */
function prescriptionToTemplateData(prescription: Prescription): Record<string, unknown> {
  return {
    prescription: {
      medications: [
        {
          name: prescription.medication_name,
          generic_name: prescription.generic_name || '',
          // Template expects 'strength' for medication dose amount (e.g., "500mg")
          strength: prescription.dosage,
          // Template expects 'dosage' for posology (e.g., "1 compressa x 3/die")
          dosage: prescription.frequency,
          // Keep frequency as well for templates that might use it
          frequency: prescription.frequency,
          duration: prescription.duration || '',
          quantity: prescription.quantity ? String(prescription.quantity) : '',
          refills: prescription.refills,
          instructions: prescription.instructions || '',
          form: prescription.form || '',
          route: prescription.route || '',
        },
      ],
      notes: prescription.pharmacy_notes || '',
      prescribed_date: prescription.prescribed_date,
      start_date: prescription.start_date || '',
      end_date: prescription.end_date || '',
    },
    document: {
      date: new Date().toISOString().split('T')[0],
    },
  };
}

/**
 * PrintPrescriptionDialog Component
 */
export function PrintPrescriptionDialog({
  open,
  onOpenChange,
  prescription,
  patientName,
}: PrintPrescriptionDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [documentTitle, setDocumentTitle] = useState('');
  const [generatedDocId, setGeneratedDocId] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  // Fetch prescription templates
  const { data: templatesData, isLoading: templatesLoading } = useDocumentTemplates({
    is_active: true,
    document_type: DocumentType.PRESCRIPTION,
    limit: 50,
  });

  // Generate document mutation
  const generateDocument = useGenerateDocument();

  // Auto-select default template and set title
  useEffect(() => {
    if (open && templatesData?.templates) {
      // Find default template or first available
      const defaultTemplate = templatesData.templates.find((t) => t.is_default);
      const template = defaultTemplate || templatesData.templates[0];

      if (template) {
        setSelectedTemplateId(template.id);
      }

      // Set default title
      const today = new Date().toISOString().split('T')[0];
      const title = `${t('prescriptions.print.document_title')} - ${prescription.medication_name} - ${today}`;
      setDocumentTitle(title);

      // Reset state
      setGeneratedDocId(null);
      setError(null);
    }
  }, [open, templatesData, prescription, t]);

  /**
   * Handle generate document
   */
  const handleGenerate = async () => {
    if (!selectedTemplateId) {
      setError(t('prescriptions.print.select_template_error'));
      return;
    }

    try {
      setError(null);

      const additionalData = prescriptionToTemplateData(prescription);

      const generatedDoc = await generateDocument.mutateAsync({
        template_id: selectedTemplateId,
        patient_id: prescription.patient_id,
        document_title: documentTitle,
        visit_id: prescription.visit_id || undefined,
        additional_data: additionalData,
      });

      setGeneratedDocId(generatedDoc.id);

      toast({
        title: t('prescriptions.print.generated_success'),
        description: t('prescriptions.print.generated_description'),
      });
    } catch (err) {
      console.error('Failed to generate prescription document:', err);
      setError(err instanceof Error ? err.message : t('prescriptions.print.generate_error'));
    }
  };

  /**
   * Handle print the generated document
   */
  const handlePrint = async () => {
    if (!generatedDocId) return;

    try {
      setIsPrinting(true);

      // Download the PDF blob
      const blob = await documentsApi.download(generatedDocId);

      // Create object URL and open in new window for printing
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');

      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }

      // Clean up URL after a delay
      setTimeout(() => URL.revokeObjectURL(url), 60000);

      toast({
        title: t('prescriptions.print.print_opened'),
        description: t('prescriptions.print.print_opened_description'),
      });
    } catch (err) {
      console.error('Failed to print document:', err);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('prescriptions.print.print_error'),
      });
    } finally {
      setIsPrinting(false);
    }
  };

  /**
   * Handle download the generated document
   */
  const handleDownload = async () => {
    if (!generatedDocId) return;

    try {
      const blob = await documentsApi.download(generatedDocId);

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${documentTitle}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: t('prescriptions.print.download_success'),
        description: t('prescriptions.print.download_description'),
      });
    } catch (err) {
      console.error('Failed to download document:', err);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('prescriptions.print.download_error'),
      });
    }
  };

  const templates = templatesData?.templates || [];
  const hasTemplates = templates.length > 0;
  const isGenerating = generateDocument.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            {t('prescriptions.print.title')}
          </DialogTitle>
          <DialogDescription>
            {t('prescriptions.print.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Prescription summary */}
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-1">
                <p className="font-semibold">{prescription.medication_name}</p>
                <p className="text-sm text-muted-foreground">
                  {prescription.dosage} - {prescription.frequency}
                </p>
                {patientName && (
                  <p className="text-sm text-muted-foreground">
                    {t('prescriptions.print.for_patient', { name: patientName })}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Template loading */}
          {templatesLoading && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}

          {/* No templates warning */}
          {!templatesLoading && !hasTemplates && (
            <Alert>
              <AlertDescription>
                {t('prescriptions.print.no_templates')}
              </AlertDescription>
            </Alert>
          )}

          {/* Template selection */}
          {!templatesLoading && hasTemplates && (
            <>
              <div className="space-y-2">
                <Label htmlFor="template">{t('prescriptions.print.template_label')}</Label>
                <Select
                  value={selectedTemplateId}
                  onValueChange={setSelectedTemplateId}
                  disabled={isGenerating || !!generatedDocId}
                >
                  <SelectTrigger id="template">
                    <SelectValue placeholder={t('prescriptions.print.select_template')} />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.template_name}
                        {template.is_default && ` (${t('common.default')})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">{t('prescriptions.print.title_label')}</Label>
                <Input
                  id="title"
                  value={documentTitle}
                  onChange={(e) => setDocumentTitle(e.target.value)}
                  placeholder={t('prescriptions.print.title_placeholder')}
                  disabled={isGenerating || !!generatedDocId}
                />
              </div>
            </>
          )}

          {/* Error display */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Generated document actions */}
          {generatedDocId && (
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950">
              <AlertDescription className="text-green-800 dark:text-green-200">
                {t('prescriptions.print.document_ready')}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {!generatedDocId ? (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isGenerating}
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={!hasTemplates || !selectedTemplateId || isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('prescriptions.print.generating')}
                  </>
                ) : (
                  <>
                    <FileOutput className="mr-2 h-4 w-4" />
                    {t('prescriptions.print.generate')}
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.close')}
              </Button>
              <Button variant="outline" onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                {t('common.download')}
              </Button>
              <Button onClick={handlePrint} disabled={isPrinting}>
                {isPrinting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('prescriptions.print.opening')}
                  </>
                ) : (
                  <>
                    <Printer className="mr-2 h-4 w-4" />
                    {t('common.print')}
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
