/**
 * Document Hooks
 *
 * React Query hooks for document generation and management.
 * Provides declarative data fetching and mutations with caching.
 */

import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import {
  documentsApi,
  documentTemplatesApi,
  downloadDocument,
  printDocument,
  previewDocument,
} from '@/services/api';
import type {
  DocumentTemplate,
  CreateDocumentTemplateRequest,
  UpdateDocumentTemplateRequest,
  DocumentTemplateFilter,
  DocumentTemplateListResponse,
  GeneratedDocument,
  GenerateDocumentRequest,
  DeliverDocumentRequest,
  SignDocumentRequest,
  GeneratedDocumentFilter,
  GeneratedDocumentListResponse,
  DocumentStatistics,
  DocumentType,
} from '@/types/document';

/**
 * Query keys for document-related data
 * Following React Query best practices for key structure
 */
export const documentKeys = {
  // Document templates
  templates: {
    all: ['document-templates'] as const,
    lists: () => [...documentKeys.templates.all, 'list'] as const,
    list: (filters?: DocumentTemplateFilter) => [...documentKeys.templates.lists(), filters] as const,
    details: () => [...documentKeys.templates.all, 'detail'] as const,
    detail: (id: string) => [...documentKeys.templates.details(), id] as const,
    default: (type: DocumentType) => [...documentKeys.templates.all, 'default', type] as const,
  },

  // Generated documents
  documents: {
    all: ['documents'] as const,
    lists: () => [...documentKeys.documents.all, 'list'] as const,
    list: (filters?: GeneratedDocumentFilter) => [...documentKeys.documents.lists(), filters] as const,
    details: () => [...documentKeys.documents.all, 'detail'] as const,
    detail: (id: string) => [...documentKeys.documents.details(), id] as const,
    byPatient: (patientId: string) => [...documentKeys.documents.all, 'patient', patientId] as const,
    byVisit: (visitId: string) => [...documentKeys.documents.all, 'visit', visitId] as const,
    statistics: () => [...documentKeys.documents.all, 'statistics'] as const,
  },
};

// ============================================================================
// Document Template Hooks
// ============================================================================

/**
 * Fetch all document templates with optional filtering
 */
export function useDocumentTemplates(
  filters?: DocumentTemplateFilter & { limit?: number; offset?: number },
  options?: Omit<UseQueryOptions<DocumentTemplateListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery<DocumentTemplateListResponse>({
    queryKey: documentKeys.templates.list(filters),
    queryFn: () => documentTemplatesApi.getAll(filters),
    ...options,
  });
}

/**
 * Fetch a single document template by ID
 */
export function useDocumentTemplate(
  id: string,
  options?: Omit<UseQueryOptions<DocumentTemplate>, 'queryKey' | 'queryFn'>
) {
  return useQuery<DocumentTemplate>({
    queryKey: documentKeys.templates.detail(id),
    queryFn: () => documentTemplatesApi.getById(id),
    enabled: !!id,
    ...options,
  });
}

/**
 * Fetch the default template for a document type
 */
export function useDefaultDocumentTemplate(
  documentType: DocumentType,
  options?: Omit<UseQueryOptions<DocumentTemplate | null>, 'queryKey' | 'queryFn'>
) {
  return useQuery<DocumentTemplate | null>({
    queryKey: documentKeys.templates.default(documentType),
    queryFn: () => documentTemplatesApi.getDefault(documentType),
    ...options,
  });
}

/**
 * Create a new document template (admin only)
 */
export function useCreateDocumentTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDocumentTemplateRequest) => documentTemplatesApi.create(data),
    onSuccess: () => {
      // Invalidate template lists
      queryClient.invalidateQueries({ queryKey: documentKeys.templates.lists() });
    },
  });
}

/**
 * Update an existing document template (admin only)
 */
export function useUpdateDocumentTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDocumentTemplateRequest }) =>
      documentTemplatesApi.update(id, data),
    onSuccess: (updatedTemplate) => {
      // Update cache for this specific template
      queryClient.setQueryData(
        documentKeys.templates.detail(updatedTemplate.id),
        updatedTemplate
      );
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: documentKeys.templates.lists() });
    },
  });
}

/**
 * Delete a document template (admin only)
 */
export function useDeleteDocumentTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => documentTemplatesApi.delete(id),
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: documentKeys.templates.detail(id) });
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: documentKeys.templates.lists() });
    },
  });
}

// ============================================================================
// Generated Document Hooks
// ============================================================================

/**
 * Fetch generated documents with optional filtering
 */
export function useDocuments(
  filters?: GeneratedDocumentFilter,
  options?: Omit<UseQueryOptions<GeneratedDocumentListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery<GeneratedDocumentListResponse>({
    queryKey: documentKeys.documents.list(filters),
    queryFn: () => documentsApi.list(filters),
    ...options,
  });
}

/**
 * Fetch a single generated document by ID
 */
export function useDocument(
  id: string,
  options?: Omit<UseQueryOptions<GeneratedDocument>, 'queryKey' | 'queryFn'>
) {
  return useQuery<GeneratedDocument>({
    queryKey: documentKeys.documents.detail(id),
    queryFn: () => documentsApi.getById(id),
    enabled: !!id,
    ...options,
  });
}

/**
 * Fetch documents for a specific patient
 */
export function usePatientDocuments(
  patientId: string,
  params?: { limit?: number; offset?: number },
  options?: Omit<UseQueryOptions<GeneratedDocumentListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery<GeneratedDocumentListResponse>({
    queryKey: documentKeys.documents.byPatient(patientId),
    queryFn: () => documentsApi.getByPatient(patientId, params),
    enabled: !!patientId,
    ...options,
  });
}

/**
 * Fetch documents for a specific visit
 */
export function useVisitDocuments(
  visitId: string,
  params?: { limit?: number; offset?: number },
  options?: Omit<UseQueryOptions<GeneratedDocumentListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery<GeneratedDocumentListResponse>({
    queryKey: documentKeys.documents.byVisit(visitId),
    queryFn: () => documentsApi.getByVisit(visitId, params),
    enabled: !!visitId,
    ...options,
  });
}

/**
 * Fetch document statistics
 */
export function useDocumentStatistics(
  options?: Omit<UseQueryOptions<DocumentStatistics>, 'queryKey' | 'queryFn'>
) {
  return useQuery<DocumentStatistics>({
    queryKey: documentKeys.documents.statistics(),
    queryFn: () => documentsApi.getStatistics(),
    ...options,
  });
}

/**
 * Generate a new document from a template
 */
export function useGenerateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: GenerateDocumentRequest) => documentsApi.generate(data),
    onSuccess: (newDocument) => {
      // Invalidate document lists
      queryClient.invalidateQueries({ queryKey: documentKeys.documents.lists() });
      // Invalidate patient documents if applicable
      queryClient.invalidateQueries({
        queryKey: documentKeys.documents.byPatient(newDocument.patient_id),
      });
      // Invalidate visit documents if applicable
      if (newDocument.visit_id) {
        queryClient.invalidateQueries({
          queryKey: documentKeys.documents.byVisit(newDocument.visit_id),
        });
      }
      // Invalidate statistics
      queryClient.invalidateQueries({ queryKey: documentKeys.documents.statistics() });
    },
  });
}

/**
 * Sign a document digitally
 */
export function useSignDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: SignDocumentRequest }) =>
      documentsApi.sign(id, data),
    onSuccess: (signedDocument) => {
      // Update cache for this document
      queryClient.setQueryData(
        documentKeys.documents.detail(signedDocument.id),
        signedDocument
      );
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: documentKeys.documents.lists() });
      // Invalidate statistics
      queryClient.invalidateQueries({ queryKey: documentKeys.documents.statistics() });
    },
  });
}

/**
 * Mark document as delivered
 */
export function useDeliverDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: DeliverDocumentRequest }) =>
      documentsApi.deliver(id, data),
    onSuccess: (deliveredDocument) => {
      // Update cache for this document
      queryClient.setQueryData(
        documentKeys.documents.detail(deliveredDocument.id),
        deliveredDocument
      );
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: documentKeys.documents.lists() });
      // Invalidate statistics
      queryClient.invalidateQueries({ queryKey: documentKeys.documents.statistics() });
    },
  });
}

/**
 * Delete a document
 */
export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => documentsApi.delete(id),
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: documentKeys.documents.detail(id) });
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: documentKeys.documents.lists() });
      // Invalidate statistics
      queryClient.invalidateQueries({ queryKey: documentKeys.documents.statistics() });
    },
  });
}

/**
 * Download a document (triggers browser download)
 */
export function useDownloadDocument() {
  return useMutation({
    mutationFn: ({ id, filename }: { id: string; filename?: string }) =>
      downloadDocument(id, filename),
  });
}

/**
 * Print a document (opens in new tab and triggers print)
 */
export function usePrintDocument() {
  return useMutation({
    mutationFn: (id: string) => printDocument(id),
  });
}

/**
 * Preview a document (opens in new tab)
 */
export function usePreviewDocument() {
  return useMutation({
    mutationFn: (id: string) => previewDocument(id),
  });
}
