/**
 * PatientDocumentsSection Component
 *
 * Displays a list of documents for a specific patient in a card section.
 * Used in the Patient Detail page to show all documents generated for the patient.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  FileText,
  Download,
  Printer,
  Mail,
  Trash2,
  FileSignature,
  Eye,
  MoreHorizontal,
  Loader2,
  CheckCircle,
  FileOutput,
  Plus,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { extractErrorMessage, getErrorTitle } from '@/lib/error-utils';

import {
  usePatientDocuments,
  useDeleteDocument,
  useSignDocument,
  useDownloadDocument,
  usePrintDocument,
  usePreviewDocument,
} from '@/hooks/useDocuments';
import {
  getDocumentTypeColor,
  getDocumentStatusColor,
  formatFileSize,
  canSignDocument,
  canDeleteDocument,
  type GeneratedDocumentSummary,
} from '@/types/document';
import { EmailDocumentDialog } from './EmailDocumentDialog';
import { EmptyState } from '@/components/ui/empty-state';

interface PatientDocumentsSectionProps {
  /** Patient ID to fetch documents for */
  patientId: string;
  /** Callback to trigger document generation */
  onGenerateDocument?: () => void;
  /** Maximum number of documents to show (default: 5) */
  limit?: number;
}

/**
 * PatientDocumentsSection Component
 */
export function PatientDocumentsSection({
  patientId,
  onGenerateDocument,
  limit = 5,
}: PatientDocumentsSectionProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();

  // State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [signConfirmId, setSignConfirmId] = useState<string | null>(null);
  const [emailDocument, setEmailDocument] = useState<GeneratedDocumentSummary | null>(null);

  // Fetch patient documents
  const { data: documentsData, isLoading, refetch } = usePatientDocuments(patientId, { limit });

  // Mutations
  const deleteDocument = useDeleteDocument();
  const signDocument = useSignDocument();
  const downloadDocument = useDownloadDocument();
  const printDocument = usePrintDocument();
  const previewDocument = usePreviewDocument();

  const documents = documentsData?.documents || [];
  const totalDocuments = documentsData?.total || 0;

  /**
   * Handle document download
   */
  const handleDownload = async (doc: GeneratedDocumentSummary) => {
    try {
      await downloadDocument.mutateAsync({
        id: doc.id,
        filename: doc.document_filename,
      });
      toast({
        title: t('documents.download_success'),
        description: doc.document_filename,
      });
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: t(getErrorTitle(error)),
        description: extractErrorMessage(error, t),
      });
    }
  };

  /**
   * Handle document print
   */
  const handlePrint = async (doc: GeneratedDocumentSummary) => {
    try {
      await printDocument.mutateAsync(doc.id);
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: t(getErrorTitle(error)),
        description: extractErrorMessage(error, t),
      });
    }
  };

  /**
   * Handle document preview
   */
  const handlePreview = async (doc: GeneratedDocumentSummary) => {
    try {
      await previewDocument.mutateAsync(doc.id);
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: t(getErrorTitle(error)),
        description: extractErrorMessage(error, t),
      });
    }
  };

  /**
   * Handle document sign
   */
  const handleSign = async () => {
    if (!signConfirmId) return;
    try {
      await signDocument.mutateAsync({ id: signConfirmId });
      toast({
        title: t('documents.sign_success'),
        description: t('documents.sign_success_description'),
      });
      setSignConfirmId(null);
      refetch();
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: t(getErrorTitle(error)),
        description: extractErrorMessage(error, t),
      });
    }
  };

  /**
   * Handle document delete
   */
  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteDocument.mutateAsync(deleteConfirmId);
      toast({
        title: t('documents.delete_success'),
        description: t('documents.delete_success_description'),
      });
      setDeleteConfirmId(null);
      refetch();
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: t(getErrorTitle(error)),
        description: extractErrorMessage(error, t),
      });
    }
  };

  /**
   * Navigate to all documents page with patient filter
   */
  const handleViewAll = () => {
    navigate(`/documents?patientId=${patientId}`);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t('documents.list_title')}
            </CardTitle>
            <CardDescription>
              {t('documents.page_description')}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {onGenerateDocument && (
              <Button variant="outline" size="sm" onClick={onGenerateDocument}>
                <Plus className="h-4 w-4 mr-2" />
                {t('documents.generate_document')}
              </Button>
            )}
            {totalDocuments > limit && (
              <Button variant="outline" size="sm" onClick={handleViewAll}>
                {t('common.actions.viewAll')}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-3 border rounded-lg">
                  <Skeleton className="h-10 w-10 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : documents.length === 0 ? (
            <EmptyState
              variant="compact"
              icon={FileText}
              title={t('documents.no_documents')}
              action={
                onGenerateDocument && (
                  <Button onClick={onGenerateDocument} className="gap-2">
                    <FileOutput className="h-4 w-4" />
                    {t('documents.generate_document')}
                  </Button>
                )
              }
            />
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{doc.document_title}</span>
                      {doc.is_signed && (
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{format(new Date(doc.created_at), 'MMM d, yyyy')}</span>
                      <span>•</span>
                      <span>{formatFileSize(doc.file_size_bytes)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getDocumentTypeColor(doc.document_type)}>
                      {t(`documents.types.${doc.document_type.toLowerCase()}`)}
                    </Badge>
                    <Badge className={getDocumentStatusColor(doc.status)}>
                      {t(`documents.statuses.${doc.status.toLowerCase()}`)}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={t('common.actionsMenu')} className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handlePreview(doc)}>
                          <Eye className="mr-2 h-4 w-4" />
                          {t('documents.preview')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownload(doc)}>
                          <Download className="mr-2 h-4 w-4" />
                          {t('documents.download')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handlePrint(doc)}>
                          <Printer className="mr-2 h-4 w-4" />
                          {t('documents.print')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEmailDocument(doc)}>
                          <Mail className="mr-2 h-4 w-4" />
                          {t('documents.email')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {canSignDocument(doc as any) && (
                          <DropdownMenuItem onClick={() => setSignConfirmId(doc.id)}>
                            <FileSignature className="mr-2 h-4 w-4" />
                            {t('documents.sign')}
                          </DropdownMenuItem>
                        )}
                        {canDeleteDocument(doc as any) && (
                          <DropdownMenuItem
                            onClick={() => setDeleteConfirmId(doc.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t('documents.delete')}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Show total count if there are more documents */}
          {totalDocuments > 0 && (
            <div className="mt-4 text-sm text-muted-foreground text-center">
              {t('documents.showing_count', {
                count: documents.length,
                total: totalDocuments,
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sign confirmation dialog */}
      <AlertDialog open={!!signConfirmId} onOpenChange={() => setSignConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('documents.sign_confirm_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('documents.sign_confirm_description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleSign}>
              {signDocument.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileSignature className="mr-2 h-4 w-4" />
              )}
              {t('documents.sign')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('documents.delete_confirm_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('documents.delete_confirm_description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteDocument.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              {t('documents.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Email document dialog */}
      {emailDocument && (
        <EmailDocumentDialog
          document={emailDocument as any}
          onClose={() => setEmailDocument(null)}
          onSuccess={() => {
            setEmailDocument(null);
            refetch();
          }}
        />
      )}
    </>
  );
}
