/**
 * VisitDocumentsSection Component
 *
 * Displays a list of documents for a specific visit in a card section.
 * Used in the Visit Detail page to show documents linked to that visit.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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

import {
  useVisitDocuments,
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

interface VisitDocumentsSectionProps {
  /** Visit ID to fetch documents for */
  visitId: string;
  /** Callback to trigger document generation */
  onGenerateDocument?: () => void;
}

/**
 * VisitDocumentsSection Component
 */
export function VisitDocumentsSection({
  visitId,
  onGenerateDocument,
}: VisitDocumentsSectionProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  // State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [signConfirmId, setSignConfirmId] = useState<string | null>(null);
  const [emailDocument, setEmailDocument] = useState<GeneratedDocumentSummary | null>(null);

  // Fetch visit documents
  const { data: documentsData, isLoading, refetch } = useVisitDocuments(visitId);

  // Mutations
  const deleteDocument = useDeleteDocument();
  const signDocument = useSignDocument();
  const downloadDocument = useDownloadDocument();
  const printDocument = usePrintDocument();
  const previewDocument = usePreviewDocument();

  const documents = documentsData?.documents || [];

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
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('documents.download_error'),
        description: error instanceof Error ? error.message : t('errors.generic'),
      });
    }
  };

  /**
   * Handle document print
   */
  const handlePrint = async (doc: GeneratedDocumentSummary) => {
    try {
      await printDocument.mutateAsync(doc.id);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('documents.print_error'),
        description: error instanceof Error ? error.message : t('errors.generic'),
      });
    }
  };

  /**
   * Handle document preview
   */
  const handlePreview = async (doc: GeneratedDocumentSummary) => {
    try {
      await previewDocument.mutateAsync(doc.id);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('documents.preview_error'),
        description: error instanceof Error ? error.message : t('errors.generic'),
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
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('documents.sign_error'),
        description: error instanceof Error ? error.message : t('errors.generic'),
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
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('documents.delete_error'),
        description: error instanceof Error ? error.message : t('errors.generic'),
      });
    }
  };

  return (
    <>
      <Card className="print:hidden no-print">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t('documents.list_title')}
            </CardTitle>
            <CardDescription>
              {t('documents.visit_documents_description')}
            </CardDescription>
          </div>
          {onGenerateDocument && (
            <Button variant="outline" size="sm" onClick={onGenerateDocument}>
              <FileOutput className="h-4 w-4 mr-2" />
              {t('documents.generate_document')}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
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
            <div className="text-center py-6">
              <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-3">
                {t('documents.no_visit_documents')}
              </p>
              {onGenerateDocument && (
                <Button variant="outline" size="sm" onClick={onGenerateDocument}>
                  <FileOutput className="h-4 w-4 mr-2" />
                  {t('documents.generate_document')}
                </Button>
              )}
            </div>
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
                      <span>{format(new Date(doc.created_at), 'MMM d, yyyy HH:mm')}</span>
                      <span>•</span>
                      <span>{formatFileSize(doc.file_size_bytes)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getDocumentTypeColor(doc.document_type)}>
                      {t(`documents.types.${doc.document_type.toLowerCase()}`)}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
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
