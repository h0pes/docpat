/**
 * DocumentList Component
 *
 * Displays a list of generated documents with filtering, sorting,
 * and actions (download, print, sign, deliver, delete).
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
  Search,
  Filter,
  Loader2,
  CheckCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  useDocuments,
  useDeleteDocument,
  useSignDocument,
  useDownloadDocument,
  usePrintDocument,
  usePreviewDocument,
} from '@/hooks/useDocuments';
import {
  DocumentType,
  DocumentStatus,
  getDocumentTypeColor,
  getDocumentStatusColor,
  formatFileSize,
  canSignDocument,
  canDeleteDocument,
  type GeneratedDocumentSummary,
  type GeneratedDocumentFilter,
} from '@/types/document';

interface DocumentListProps {
  /** Optional patient ID to filter by */
  patientId?: string;
  /** Optional visit ID to filter by */
  visitId?: string;
  /** Show compact view */
  compact?: boolean;
  /** Callback when email action is triggered */
  onEmailDocument?: (document: GeneratedDocumentSummary) => void;
}

/**
 * DocumentList Component
 */
export function DocumentList({
  patientId,
  visitId,
  compact = false,
  onEmailDocument,
}: DocumentListProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<DocumentType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'all'>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [signConfirmId, setSignConfirmId] = useState<string | null>(null);

  // Build filter
  const filter: GeneratedDocumentFilter = {
    patient_id: patientId,
    visit_id: visitId,
    document_type: typeFilter !== 'all' ? typeFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    limit: 50,
  };

  // Fetch documents
  const { data: documentsData, isLoading, refetch } = useDocuments(filter);

  // Mutations
  const deleteDocument = useDeleteDocument();
  const signDocument = useSignDocument();
  const downloadDocument = useDownloadDocument();
  const printDocument = usePrintDocument();
  const previewDocument = usePreviewDocument();

  const documents = documentsData?.documents || [];

  // Filter by search query
  const filteredDocuments = documents.filter((doc) =>
    doc.document_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.document_filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
    } catch (error: unknown) {
      // Extract error message from axios response or fall back to generic
      let errorMessage = t('errors.generic');

      // Check for axios error with response data
      // Backend returns: { error: "FORBIDDEN", message: "Signed documents cannot be deleted...", timestamp: "..." }
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number; data?: { error?: string; message?: string } } };
        if (axiosError.response?.status === 403) {
          // Use the backend message for forbidden errors (e.g., signed document delete)
          // Prioritize 'message' field which contains the human-readable error
          errorMessage = axiosError.response.data?.message
            || t('documents.delete_forbidden');
        } else if (axiosError.response?.data?.message) {
          // For other errors, prefer message field
          errorMessage = axiosError.response.data.message;
        } else if (axiosError.response?.data?.error && axiosError.response.data.error !== axiosError.response.data.error.toUpperCase()) {
          // Only use 'error' field if it's not an error code (all caps)
          errorMessage = axiosError.response.data.error;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast({
        variant: 'destructive',
        title: t('documents.delete_error'),
        description: errorMessage,
      });
      setDeleteConfirmId(null);
    }
  };

  if (compact) {
    return (
      <CompactDocumentList
        documents={filteredDocuments}
        isLoading={isLoading}
        onDownload={handleDownload}
        onPreview={handlePreview}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {t('documents.list_title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('documents.search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={typeFilter}
            onValueChange={(value) => setTypeFilter(value as DocumentType | 'all')}
          >
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder={t('documents.filter_type')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('documents.all_types')}</SelectItem>
              {Object.values(DocumentType).map((type) => (
                <SelectItem key={type} value={type}>
                  {t(`documents.types.${type.toLowerCase()}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as DocumentStatus | 'all')}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('documents.filter_status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('documents.all_statuses')}</SelectItem>
              {Object.values(DocumentStatus).filter(s => s !== DocumentStatus.DELETED).map((status) => (
                <SelectItem key={status} value={status}>
                  {t(`documents.statuses.${status.toLowerCase()}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Document table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {t('documents.no_documents')}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('documents.document_title')}</TableHead>
                  <TableHead>{t('documents.type')}</TableHead>
                  <TableHead>{t('documents.status')}</TableHead>
                  <TableHead>{t('documents.size')}</TableHead>
                  <TableHead>{t('documents.created')}</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{doc.document_title}</div>
                          <div className="text-xs text-muted-foreground">
                            {doc.document_filename}
                          </div>
                        </div>
                        {doc.is_signed && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getDocumentTypeColor(doc.document_type)}>
                        {t(`documents.types.${doc.document_type.toLowerCase()}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getDocumentStatusColor(doc.status)}>
                        {t(`documents.statuses.${doc.status.toLowerCase()}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatFileSize(doc.file_size_bytes)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(doc.created_at), 'MMM d, yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
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
                          {onEmailDocument && (
                            <DropdownMenuItem onClick={() => onEmailDocument(doc)}>
                              <Mail className="mr-2 h-4 w-4" />
                              {t('documents.email')}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {canSignDocument(doc as any) && (
                            <DropdownMenuItem onClick={() => setSignConfirmId(doc.id)}>
                              <FileSignature className="mr-2 h-4 w-4" />
                              {t('documents.sign')}
                            </DropdownMenuItem>
                          )}
                          {canDeleteDocument(doc as any) && (
                            <DropdownMenuItem
                              onClick={() => {
                                // For signed documents, show info toast immediately without confirmation
                                if (doc.is_signed) {
                                  toast({
                                    variant: 'destructive',
                                    title: t('documents.delete_error'),
                                    description: t('documents.delete_forbidden'),
                                  });
                                } else {
                                  setDeleteConfirmId(doc.id);
                                }
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t('documents.delete')}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination info */}
        {documentsData && (
          <div className="text-sm text-muted-foreground">
            {t('documents.showing_count', {
              count: filteredDocuments.length,
              total: documentsData.total,
            })}
          </div>
        )}
      </CardContent>

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
    </Card>
  );
}

/**
 * Compact document list for embedding in other views
 */
function CompactDocumentList({
  documents,
  isLoading,
  onDownload,
  onPreview,
}: {
  documents: GeneratedDocumentSummary[];
  isLoading: boolean;
  onDownload: (doc: GeneratedDocumentSummary) => void;
  onPreview: (doc: GeneratedDocumentSummary) => void;
}) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground">
        {t('documents.no_documents')}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center justify-between p-2 rounded-md border hover:bg-accent"
        >
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{doc.document_title}</div>
              <div className="text-xs text-muted-foreground">
                {format(new Date(doc.created_at), 'MMM d, yyyy')}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => onPreview(doc)}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDownload(doc)}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
