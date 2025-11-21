/**
 * Prescription Types and Interfaces
 *
 * TypeScript type definitions for prescription-related data structures,
 * matching the backend Rust models for medication prescriptions in the
 * medical practice management system.
 *
 * All medication data is encrypted at rest using AES-256-GCM.
 */

/**
 * Prescription status enum
 */
export enum PrescriptionStatus {
  /** Prescription is active */
  ACTIVE = 'ACTIVE',
  /** Prescription has been completed (all refills used) */
  COMPLETED = 'COMPLETED',
  /** Prescription was cancelled */
  CANCELLED = 'CANCELLED',
  /** Prescription has been discontinued by provider */
  DISCONTINUED = 'DISCONTINUED',
  /** Prescription is temporarily on hold */
  ON_HOLD = 'ON_HOLD',
}

/**
 * Medication form enum
 */
export enum MedicationForm {
  TABLET = 'TABLET',
  CAPSULE = 'CAPSULE',
  LIQUID = 'LIQUID',
  SYRUP = 'SYRUP',
  SUSPENSION = 'SUSPENSION',
  INJECTION = 'INJECTION',
  TOPICAL = 'TOPICAL',
  CREAM = 'CREAM',
  OINTMENT = 'OINTMENT',
  GEL = 'GEL',
  PATCH = 'PATCH',
  INHALER = 'INHALER',
  DROPS = 'DROPS',
  SUPPOSITORY = 'SUPPOSITORY',
  OTHER = 'OTHER',
}

/**
 * Route of administration enum
 */
export enum RouteOfAdministration {
  ORAL = 'ORAL',
  TOPICAL = 'TOPICAL',
  INTRAVENOUS = 'INTRAVENOUS',
  INTRAMUSCULAR = 'INTRAMUSCULAR',
  SUBCUTANEOUS = 'SUBCUTANEOUS',
  SUBLINGUAL = 'SUBLINGUAL',
  RECTAL = 'RECTAL',
  INHALATION = 'INHALATION',
  OPHTHALMIC = 'OPHTHALMIC',
  OTIC = 'OTIC',
  NASAL = 'NASAL',
  TRANSDERMAL = 'TRANSDERMAL',
  OTHER = 'OTHER',
}

/**
 * Drug interaction warning severity
 */
export type DrugInteractionSeverity = 'minor' | 'moderate' | 'major';

/**
 * Drug interaction warning structure
 */
export interface DrugInteractionWarning {
  medication_name: string;
  severity: DrugInteractionSeverity;
  description: string;
}

/**
 * Main Prescription interface (DTO from backend)
 */
export interface Prescription {
  id: string;

  // References
  visit_id?: string;
  patient_id: string;
  provider_id: string;

  // Medication details (encrypted)
  medication_name: string;
  generic_name?: string;
  dosage: string;
  form?: MedicationForm;
  route?: RouteOfAdministration;
  frequency: string;
  duration?: string;
  quantity?: number;
  refills: number;

  // Instructions (encrypted)
  instructions?: string;
  pharmacy_notes?: string;

  // Status
  status: PrescriptionStatus;
  prescribed_date: string; // ISO 8601 format
  start_date?: string;
  end_date?: string;
  discontinued_date?: string;
  discontinued_reason?: string;

  // Drug interactions (stored as JSONB)
  interaction_warnings?: DrugInteractionWarning[];

  // Audit
  created_at: string;
  updated_at: string;
}

/**
 * Request to create a new prescription
 */
export interface CreatePrescriptionRequest {
  visit_id?: string;
  patient_id: string;
  provider_id: string;
  medication_name: string;
  generic_name?: string;
  dosage: string;
  form?: MedicationForm;
  route?: RouteOfAdministration;
  frequency: string;
  duration?: string;
  quantity?: number;
  refills?: number;
  instructions?: string;
  pharmacy_notes?: string;
  prescribed_date: string; // ISO 8601 format
  start_date?: string;
  end_date?: string;
}

/**
 * Request to update an existing prescription
 */
export interface UpdatePrescriptionRequest {
  dosage?: string;
  frequency?: string;
  duration?: string;
  quantity?: number;
  refills?: number;
  instructions?: string;
  pharmacy_notes?: string;
  status?: PrescriptionStatus;
  start_date?: string;
  end_date?: string;
}

/**
 * Request to discontinue a prescription
 */
export interface DiscontinuePrescriptionRequest {
  discontinued_reason: string;
}

/**
 * Medication search result
 */
export interface MedicationSearchResult {
  name: string;
  generic_name?: string;
  common_dosages?: string[];
  common_forms?: MedicationForm[];
  default_route?: RouteOfAdministration;
}

/**
 * Search/filter parameters for prescriptions
 */
export interface PrescriptionSearchFilters {
  patient_id?: string;
  provider_id?: string;
  status?: PrescriptionStatus;
  medication_name?: string;
  start_date?: string; // ISO 8601 format
  end_date?: string; // ISO 8601 format
  limit?: number;
  offset?: number;
}

/**
 * Paginated prescription list response
 */
export interface PrescriptionListResponse {
  prescriptions: Prescription[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Prescription template for quick prescribing
 */
export interface PrescriptionTemplate {
  id: string;
  name: string;
  description?: string;
  medication_name: string;
  generic_name?: string;
  dosage: string;
  form?: MedicationForm;
  route?: RouteOfAdministration;
  frequency: string;
  duration?: string;
  quantity?: number;
  refills: number;
  instructions?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Request to create a prescription template
 */
export interface CreatePrescriptionTemplateRequest {
  name: string;
  description?: string;
  medication_name: string;
  generic_name?: string;
  dosage: string;
  form?: MedicationForm;
  route?: RouteOfAdministration;
  frequency: string;
  duration?: string;
  quantity?: number;
  refills?: number;
  instructions?: string;
}

/**
 * Helper Functions
 */

/**
 * Check if prescription can be refilled
 */
export function canRefill(status: PrescriptionStatus): boolean {
  return status === PrescriptionStatus.ACTIVE;
}

/**
 * Check if prescription can be discontinued
 */
export function canDiscontinue(status: PrescriptionStatus): boolean {
  return [PrescriptionStatus.ACTIVE, PrescriptionStatus.ON_HOLD].includes(status);
}

/**
 * Get status display color for UI
 */
export function getStatusColor(status: PrescriptionStatus): string {
  switch (status) {
    case PrescriptionStatus.ACTIVE:
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case PrescriptionStatus.COMPLETED:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    case PrescriptionStatus.CANCELLED:
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case PrescriptionStatus.DISCONTINUED:
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    case PrescriptionStatus.ON_HOLD:
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Get interaction severity display color for UI
 */
export function getInteractionSeverityColor(severity: DrugInteractionSeverity): string {
  switch (severity) {
    case 'minor':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'moderate':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    case 'major':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Format prescription for display (e.g., "Aspirin 100mg, 1 tablet daily")
 */
export function formatPrescription(prescription: Prescription): string {
  const parts: string[] = [prescription.medication_name];

  if (prescription.dosage) {
    parts.push(prescription.dosage);
  }

  if (prescription.form) {
    parts.push(prescription.form.toLowerCase());
  }

  if (prescription.frequency) {
    parts.push(prescription.frequency);
  }

  return parts.join(', ');
}

/**
 * Check if prescription is expired
 */
export function isExpired(prescription: Prescription): boolean {
  if (!prescription.end_date) return false;
  return new Date(prescription.end_date) < new Date();
}

/**
 * Check if prescription needs refill soon (within 7 days)
 */
export function needsRefillSoon(prescription: Prescription): boolean {
  if (!prescription.end_date || prescription.status !== PrescriptionStatus.ACTIVE) {
    return false;
  }

  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  return new Date(prescription.end_date) <= sevenDaysFromNow;
}

/**
 * Calculate remaining refills
 */
export function getRemainingRefills(prescription: Prescription): number {
  // This would need to track actual refill usage from backend
  // For now, just return the refills count
  return prescription.refills;
}
