/**
 * Document Types and Interfaces
 *
 * TypeScript type definitions for document generation and templates,
 * matching the backend Rust models for medical document management.
 *
 * Document types include: medical certificates, referral letters,
 * lab requests, visit summaries, and prescriptions.
 */

/**
 * Document type enum
 */
export enum DocumentType {
  MEDICAL_CERTIFICATE = 'MEDICAL_CERTIFICATE',
  REFERRAL_LETTER = 'REFERRAL_LETTER',
  LAB_REQUEST = 'LAB_REQUEST',
  VISIT_SUMMARY = 'VISIT_SUMMARY',
  PRESCRIPTION = 'PRESCRIPTION',
  CUSTOM = 'CUSTOM',
}

/**
 * Get display name for document type
 */
export function getDocumentTypeLabel(type: DocumentType): string {
  const labels: Record<DocumentType, string> = {
    [DocumentType.MEDICAL_CERTIFICATE]: 'Medical Certificate',
    [DocumentType.REFERRAL_LETTER]: 'Referral Letter',
    [DocumentType.LAB_REQUEST]: 'Lab Request',
    [DocumentType.VISIT_SUMMARY]: 'Visit Summary',
    [DocumentType.PRESCRIPTION]: 'Prescription',
    [DocumentType.CUSTOM]: 'Custom Document',
  };
  return labels[type] || type;
}

/**
 * Get color for document type badge
 */
export function getDocumentTypeColor(type: DocumentType): string {
  const colors: Record<DocumentType, string> = {
    [DocumentType.MEDICAL_CERTIFICATE]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    [DocumentType.REFERRAL_LETTER]: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    [DocumentType.LAB_REQUEST]: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    [DocumentType.VISIT_SUMMARY]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    [DocumentType.PRESCRIPTION]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    [DocumentType.CUSTOM]: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  };
  return colors[type] || colors[DocumentType.CUSTOM];
}

/**
 * Document status enum
 */
export enum DocumentStatus {
  GENERATING = 'GENERATING',
  GENERATED = 'GENERATED',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  DELETED = 'DELETED',
}

/**
 * Get display name for document status
 */
export function getDocumentStatusLabel(status: DocumentStatus): string {
  const labels: Record<DocumentStatus, string> = {
    [DocumentStatus.GENERATING]: 'Generating',
    [DocumentStatus.GENERATED]: 'Generated',
    [DocumentStatus.DELIVERED]: 'Delivered',
    [DocumentStatus.FAILED]: 'Failed',
    [DocumentStatus.DELETED]: 'Deleted',
  };
  return labels[status] || status;
}

/**
 * Get color for document status badge
 */
export function getDocumentStatusColor(status: DocumentStatus): string {
  const colors: Record<DocumentStatus, string> = {
    [DocumentStatus.GENERATING]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    [DocumentStatus.GENERATED]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    [DocumentStatus.DELIVERED]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    [DocumentStatus.FAILED]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    [DocumentStatus.DELETED]: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  };
  return colors[status] || colors[DocumentStatus.GENERATED];
}

/**
 * Page size options
 */
export enum PageSize {
  A4 = 'A4',
  LETTER = 'LETTER',
  LEGAL = 'LEGAL',
}

/**
 * Page orientation options
 */
export enum PageOrientation {
  PORTRAIT = 'PORTRAIT',
  LANDSCAPE = 'LANDSCAPE',
}

/**
 * Template language options
 */
export enum TemplateLanguage {
  ITALIAN = 'italian',
  ENGLISH = 'english',
}

// ============================================================================
// Document Template Types
// ============================================================================

/**
 * Document template response from API
 */
export interface DocumentTemplate {
  id: string;
  template_key: string;
  template_name: string;
  description?: string;
  document_type: DocumentType;
  template_html: string;
  template_variables?: Record<string, unknown>;
  header_html?: string;
  footer_html?: string;
  css_styles?: string;
  page_size: PageSize;
  page_orientation: PageOrientation;
  margin_top_mm: number;
  margin_bottom_mm: number;
  margin_left_mm: number;
  margin_right_mm: number;
  is_active: boolean;
  is_default: boolean;
  language: TemplateLanguage;
  version: number;
  previous_version_id?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

/**
 * Request to create a document template
 */
export interface CreateDocumentTemplateRequest {
  template_key: string;
  template_name: string;
  description?: string;
  document_type: DocumentType;
  template_html: string;
  template_variables?: Record<string, unknown>;
  header_html?: string;
  footer_html?: string;
  css_styles?: string;
  page_size?: PageSize;
  page_orientation?: PageOrientation;
  margin_top_mm?: number;
  margin_bottom_mm?: number;
  margin_left_mm?: number;
  margin_right_mm?: number;
  is_active?: boolean;
  is_default?: boolean;
  language?: TemplateLanguage;
}

/**
 * Request to update a document template
 */
export interface UpdateDocumentTemplateRequest {
  template_name?: string;
  description?: string;
  template_html?: string;
  template_variables?: Record<string, unknown>;
  header_html?: string;
  footer_html?: string;
  css_styles?: string;
  page_size?: PageSize;
  page_orientation?: PageOrientation;
  margin_top_mm?: number;
  margin_bottom_mm?: number;
  margin_left_mm?: number;
  margin_right_mm?: number;
  is_active?: boolean;
  is_default?: boolean;
  language?: TemplateLanguage;
}

/**
 * Filter options for listing templates
 */
export interface DocumentTemplateFilter {
  document_type?: DocumentType;
  is_active?: boolean;
  language?: TemplateLanguage;
}

/**
 * Paginated list response for templates
 */
export interface DocumentTemplateListResponse {
  templates: DocumentTemplate[];
  total: number;
  limit: number;
  offset: number;
}

// ============================================================================
// Generated Document Types
// ============================================================================

/**
 * Generated document response from API
 */
export interface GeneratedDocument {
  id: string;
  template_id: string;
  patient_id: string;
  visit_id?: string;
  visit_date?: string;
  provider_id: string;
  document_type: DocumentType;
  document_title: string;
  document_filename: string;
  file_size_bytes?: number;
  file_hash?: string;
  template_version?: number;
  status: DocumentStatus;
  generation_error?: string;
  delivered_to?: string;
  delivered_at?: string;
  expires_at?: string;
  is_signed: boolean;
  signed_at?: string;
  signed_by?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

/**
 * Summary of generated document for listings
 */
export interface GeneratedDocumentSummary {
  id: string;
  patient_id: string;
  visit_id?: string;
  document_type: DocumentType;
  document_title: string;
  document_filename: string;
  status: DocumentStatus;
  is_signed: boolean;
  file_size_bytes?: number;
  created_at: string;
}

/**
 * Request to generate a document
 */
export interface GenerateDocumentRequest {
  template_id: string;
  patient_id: string;
  document_title: string;
  visit_id?: string;
  visit_date?: string;
  additional_data?: Record<string, unknown>;
  expires_at?: string;
}

/**
 * Request to deliver a document
 */
export interface DeliverDocumentRequest {
  delivered_to: string;
  delivery_method?: string;
}

/**
 * Request to sign a document
 */
export interface SignDocumentRequest {
  confirmation_code?: string;
}

/**
 * Filter options for listing generated documents
 */
export interface GeneratedDocumentFilter {
  patient_id?: string;
  visit_id?: string;
  provider_id?: string;
  document_type?: DocumentType;
  status?: DocumentStatus;
  is_signed?: boolean;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}

/**
 * Paginated list response for generated documents
 */
export interface GeneratedDocumentListResponse {
  documents: GeneratedDocumentSummary[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Document statistics
 */
export interface DocumentStatistics {
  total_documents: number;
  by_type: Record<string, number>;
  by_status: Record<string, number>;
  signed_count: number;
  delivered_count: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes) return 'Unknown';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Check if a document can be signed
 */
export function canSignDocument(doc: GeneratedDocument): boolean {
  return (
    doc.status === DocumentStatus.GENERATED &&
    !doc.is_signed
  );
}

/**
 * Check if a document can be delivered
 */
export function canDeliverDocument(doc: GeneratedDocument): boolean {
  return (
    doc.status === DocumentStatus.GENERATED ||
    doc.status === DocumentStatus.DELIVERED
  );
}

/**
 * Check if a document can be deleted
 */
export function canDeleteDocument(doc: GeneratedDocument): boolean {
  return (
    doc.status !== DocumentStatus.DELETED &&
    doc.status !== DocumentStatus.GENERATING
  );
}
