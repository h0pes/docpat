/**
 * Documents API Service
 *
 * Provides methods for interacting with the document generation API endpoints.
 * Handles document templates, document generation, signing, delivery, and downloads.
 */

import { apiClient } from './axios-instance';
import type {
  DocumentTemplate,
  CreateDocumentTemplateRequest,
  UpdateDocumentTemplateRequest,
  DocumentTemplateFilter,
  DocumentTemplateListResponse,
  GeneratedDocument,
  GeneratedDocumentSummary,
  GenerateDocumentRequest,
  DeliverDocumentRequest,
  SignDocumentRequest,
  GeneratedDocumentFilter,
  GeneratedDocumentListResponse,
  DocumentStatistics,
  DocumentType,
} from '../../types/document';

// ============================================================================
// Document Templates API
// ============================================================================

/**
 * API methods for document template management
 */
export const documentTemplatesApi = {
  /**
   * Get all document templates with optional filtering
   * @param filters - Optional filter criteria
   * @returns Paginated list of templates
   */
  getAll: async (filters?: DocumentTemplateFilter & { limit?: number; offset?: number }): Promise<DocumentTemplateListResponse> => {
    const response = await apiClient.get<DocumentTemplateListResponse>('/api/v1/document-templates', {
      params: filters,
    });
    return response.data;
  },

  /**
   * Get a single template by ID
   * @param id - Template UUID
   * @returns The template details
   */
  getById: async (id: string): Promise<DocumentTemplate> => {
    const response = await apiClient.get<DocumentTemplate>(`/api/v1/document-templates/${id}`);
    return response.data;
  },

  /**
   * Get the default template for a document type
   * @param documentType - Type of document
   * @returns The default template for the type, or null if none
   */
  getDefault: async (documentType: DocumentType): Promise<DocumentTemplate | null> => {
    try {
      const response = await apiClient.get<DocumentTemplate>('/api/v1/document-templates/default', {
        params: { document_type: documentType },
      });
      return response.data;
    } catch {
      return null;
    }
  },

  /**
   * Create a new document template (admin only)
   * @param data - Template creation data
   * @returns The created template
   */
  create: async (data: CreateDocumentTemplateRequest): Promise<DocumentTemplate> => {
    const response = await apiClient.post<DocumentTemplate>('/api/v1/document-templates', data);
    return response.data;
  },

  /**
   * Update an existing template (admin only)
   * @param id - Template UUID
   * @param data - Fields to update
   * @returns The updated template
   */
  update: async (id: string, data: UpdateDocumentTemplateRequest): Promise<DocumentTemplate> => {
    const response = await apiClient.put<DocumentTemplate>(`/api/v1/document-templates/${id}`, data);
    return response.data;
  },

  /**
   * Delete a template (admin only)
   * @param id - Template UUID
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/document-templates/${id}`);
  },
};

// ============================================================================
// Generated Documents API
// ============================================================================

/**
 * API methods for generated document operations
 */
export const documentsApi = {
  /**
   * Generate a new document from a template
   * @param data - Document generation request
   * @returns The generated document
   */
  generate: async (data: GenerateDocumentRequest): Promise<GeneratedDocument> => {
    const response = await apiClient.post<GeneratedDocument>('/api/v1/documents/generate', data);
    return response.data;
  },

  /**
   * Get a single document by ID
   * @param id - Document UUID
   * @returns The document details
   */
  getById: async (id: string): Promise<GeneratedDocument> => {
    const response = await apiClient.get<GeneratedDocument>(`/api/v1/documents/${id}`);
    return response.data;
  },

  /**
   * List documents with optional filtering
   * @param filters - Filter and pagination criteria
   * @returns Paginated list of documents
   */
  list: async (filters?: GeneratedDocumentFilter): Promise<GeneratedDocumentListResponse> => {
    const response = await apiClient.get<GeneratedDocumentListResponse>('/api/v1/documents', {
      params: filters,
    });
    return response.data;
  },

  /**
   * Get documents for a specific patient
   * @param patientId - Patient UUID
   * @param params - Optional pagination parameters
   * @returns Paginated list of patient's documents
   */
  getByPatient: async (
    patientId: string,
    params?: { limit?: number; offset?: number }
  ): Promise<GeneratedDocumentListResponse> => {
    const response = await apiClient.get<GeneratedDocumentListResponse>('/api/v1/documents', {
      params: { patient_id: patientId, ...params },
    });
    return response.data;
  },

  /**
   * Get documents for a specific visit
   * @param visitId - Visit UUID
   * @param params - Optional pagination parameters
   * @returns Paginated list of visit's documents
   */
  getByVisit: async (
    visitId: string,
    params?: { limit?: number; offset?: number }
  ): Promise<GeneratedDocumentListResponse> => {
    const response = await apiClient.get<GeneratedDocumentListResponse>('/api/v1/documents', {
      params: { visit_id: visitId, ...params },
    });
    return response.data;
  },

  /**
   * Download a document as PDF
   * @param id - Document UUID
   * @returns Blob containing the PDF file
   */
  download: async (id: string): Promise<Blob> => {
    const response = await apiClient.get(`/api/v1/documents/${id}/download`, {
      responseType: 'blob',
    });
    return response.data as Blob;
  },

  /**
   * Get the download URL for a document (for direct linking)
   * @param id - Document UUID
   * @returns URL string for downloading
   */
  getDownloadUrl: (id: string): string => {
    const baseUrl = apiClient.defaults.baseURL || '';
    return `${baseUrl}/api/v1/documents/${id}/download`;
  },

  /**
   * Sign a document digitally
   * @param id - Document UUID
   * @param data - Sign request with optional confirmation code
   * @returns The signed document
   */
  sign: async (id: string, data?: SignDocumentRequest): Promise<GeneratedDocument> => {
    const response = await apiClient.post<GeneratedDocument>(`/api/v1/documents/${id}/sign`, data || {});
    return response.data;
  },

  /**
   * Mark document as delivered (e.g., emailed, printed)
   * @param id - Document UUID
   * @param data - Delivery details
   * @returns The updated document
   */
  deliver: async (id: string, data: DeliverDocumentRequest): Promise<GeneratedDocument> => {
    const response = await apiClient.post<GeneratedDocument>(`/api/v1/documents/${id}/deliver`, data);
    return response.data;
  },

  /**
   * Delete a document (soft delete)
   * @param id - Document UUID
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/documents/${id}`);
  },

  /**
   * Get document statistics
   * @returns Statistics including counts by type and status
   */
  getStatistics: async (): Promise<DocumentStatistics> => {
    const response = await apiClient.get<DocumentStatistics>('/api/v1/documents/statistics');
    return response.data;
  },
};

// ============================================================================
// Document Utility Functions
// ============================================================================

/**
 * Helper to trigger browser download of a document
 * @param id - Document UUID
 * @param filename - Optional filename override
 */
export async function downloadDocument(id: string, filename?: string): Promise<void> {
  const blob = await documentsApi.download(id);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `document-${id}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Helper to open document in new tab for printing
 * @param id - Document UUID
 */
export async function printDocument(id: string): Promise<void> {
  const blob = await documentsApi.download(id);
  const url = window.URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}

/**
 * Helper to preview document in new tab
 * @param id - Document UUID
 */
export async function previewDocument(id: string): Promise<void> {
  const blob = await documentsApi.download(id);
  const url = window.URL.createObjectURL(blob);
  window.open(url, '_blank');
}
