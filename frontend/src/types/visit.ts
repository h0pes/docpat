/**
 * Visit Types and Interfaces
 *
 * TypeScript type definitions for visit-related data structures,
 * matching the backend Rust models for clinical documentation in the
 * medical practice management system.
 *
 * All clinical data is encrypted at rest using AES-256-GCM.
 */

/**
 * Visit status enum representing the lifecycle of a visit note
 *
 * Status Workflow:
 * - DRAFT → SIGNED → LOCKED
 * - DRAFT: Can be edited freely
 * - SIGNED: Digitally signed, cannot be edited (can only be locked)
 * - LOCKED: Permanently archived, immutable
 */
export enum VisitStatus {
  DRAFT = 'DRAFT',
  SIGNED = 'SIGNED',
  LOCKED = 'LOCKED',
}

/**
 * Visit type enum
 */
export enum VisitType {
  NEW_PATIENT = 'NEW_PATIENT',
  FOLLOW_UP = 'FOLLOW_UP',
  URGENT = 'URGENT',
  CONSULTATION = 'CONSULTATION',
  ROUTINE_CHECKUP = 'ROUTINE_CHECKUP',
  ACUPUNCTURE = 'ACUPUNCTURE',
}

/**
 * Diagnosis type for visit diagnoses
 */
export enum DiagnosisType {
  /** Provisional diagnosis (suspected) */
  PROVISIONAL = 'PROVISIONAL',
  /** Confirmed diagnosis */
  CONFIRMED = 'CONFIRMED',
  /** Differential diagnosis (one of several possibilities) */
  DIFFERENTIAL = 'DIFFERENTIAL',
  /** Diagnosis to rule out */
  RULE_OUT = 'RULE_OUT',
}

/**
 * Vital signs structure (all fields optional)
 * Ranges are validated on the backend
 */
export interface VitalSigns {
  /** Systolic blood pressure (mmHg) - range 70-250 */
  blood_pressure_systolic?: number;
  /** Diastolic blood pressure (mmHg) - range 40-150 */
  blood_pressure_diastolic?: number;
  /** Heart rate (bpm) - range 30-250 */
  heart_rate?: number;
  /** Respiratory rate (breaths per minute) - range 8-60 */
  respiratory_rate?: number;
  /** Body temperature (°C) - range 35-42 */
  temperature_celsius?: number;
  /** Weight (kg) - range 0.5-500 */
  weight_kg?: number;
  /** Height (cm) - range 20-300 */
  height_cm?: number;
  /** Body Mass Index (automatically calculated) */
  bmi?: number;
  /** Oxygen saturation (%) - range 70-100 */
  oxygen_saturation?: number;
}

/**
 * Calculate BMI from weight (kg) and height (cm)
 */
export function calculateBMI(weightKg?: number, heightCm?: number): number | undefined {
  if (!weightKg || !heightCm) return undefined;
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

/**
 * SOAP note structure (Subjective, Objective, Assessment, Plan)
 */
export interface SOAPNote {
  /** Subjective: Patient's description of symptoms */
  subjective?: string;
  /** Objective: Provider's observations and findings */
  objective?: string;
  /** Assessment: Provider's diagnosis and interpretation */
  assessment?: string;
  /** Plan: Treatment plan and follow-up */
  plan?: string;
}

/**
 * Visit diagnosis
 */
export interface VisitDiagnosis {
  id: string;
  visit_id: string;
  icd10_code: string;
  description: string;
  diagnosis_type: DiagnosisType;
  is_primary: boolean;
  notes?: string;
  created_at: string;
}

/**
 * Request to create a visit diagnosis
 */
export interface CreateVisitDiagnosisRequest {
  icd10_code: string;
  description: string;
  diagnosis_type: DiagnosisType;
  is_primary?: boolean;
  notes?: string;
}

/**
 * Main Visit interface (DTO from backend)
 */
export interface Visit {
  id: string;
  appointment_id?: string;
  patient_id: string;
  provider_id: string;

  // Patient name (from JOIN)
  patient_first_name?: string;
  patient_last_name?: string;

  // Provider name (from JOIN)
  provider_first_name?: string;
  provider_last_name?: string;

  visit_date: string; // ISO 8601 format

  // Visit details
  visit_type: VisitType;
  status: VisitStatus;

  // Vital signs (encrypted)
  vitals?: VitalSigns;

  // SOAP notes (encrypted)
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;

  // Additional documentation (encrypted)
  additional_notes?: string;
  follow_up_instructions?: string;

  // Digital signature
  signature_hash?: string;
  signed_at?: string;
  signed_by?: string;
  signed_by_name?: string;

  // Locking
  locked_at?: string;

  // Audit
  created_at: string;
  updated_at: string;
}

/**
 * Request to create a new visit
 */
export interface CreateVisitRequest {
  appointment_id?: string;
  patient_id: string;
  provider_id: string;
  visit_date: string; // ISO 8601 format
  type: VisitType;
  vitals?: VitalSigns;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  additional_notes?: string;
  follow_up_instructions?: string;
}

/**
 * Request to update an existing visit
 */
export interface UpdateVisitRequest {
  type?: VisitType;
  vitals?: VitalSigns;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  additional_notes?: string;
  follow_up_instructions?: string;
}

/**
 * Request to sign a visit
 */
export interface SignVisitRequest {
  // Password or PIN for digital signature verification
  credential: string;
}

/**
 * Search/filter parameters for visits
 */
export interface VisitSearchFilters {
  patient_id?: string;
  provider_id?: string;
  status?: VisitStatus;
  type?: VisitType;
  start_date?: string; // ISO 8601 format
  end_date?: string; // ISO 8601 format
  limit?: number;
  offset?: number;
}

/**
 * Paginated visit list response
 */
export interface VisitListResponse {
  visits: Visit[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Visit statistics
 */
export interface VisitStatistics {
  total: number;
  by_status: Record<string, number>;
  by_type: Record<string, number>;
  today: number;
  this_week: number;
  this_month: number;
}

/**
 * Visit template for quick note creation
 */
export interface VisitTemplate {
  id: string;
  name: string;
  description?: string;
  visit_type: VisitType;
  template_subjective?: string;
  template_objective?: string;
  template_assessment?: string;
  template_plan?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Request to create a visit template
 */
export interface CreateVisitTemplateRequest {
  name: string;
  description?: string;
  visit_type: VisitType;
  template_subjective?: string;
  template_objective?: string;
  template_assessment?: string;
  template_plan?: string;
}

/**
 * Visit version for version history
 */
export interface VisitVersion {
  id: string;
  visit_id: string;
  version_number: number;
  visit_data: Visit;
  changed_by: string;
  changed_at: string;
}

/**
 * Helper Functions
 */

/**
 * Check if transition from current status to new status is valid
 */
export function canTransitionStatus(currentStatus: VisitStatus, newStatus: VisitStatus): boolean {
  switch (currentStatus) {
    case VisitStatus.DRAFT:
      return [VisitStatus.DRAFT, VisitStatus.SIGNED].includes(newStatus);
    case VisitStatus.SIGNED:
      return [VisitStatus.SIGNED, VisitStatus.LOCKED].includes(newStatus);
    case VisitStatus.LOCKED:
      return newStatus === VisitStatus.LOCKED; // LOCKED is final
    default:
      return false;
  }
}

/**
 * Check if visit status is final (cannot be changed)
 */
export function isFinalStatus(status: VisitStatus): boolean {
  return status === VisitStatus.LOCKED;
}

/**
 * Check if visit can be edited in current status
 */
export function isEditable(status: VisitStatus): boolean {
  return status === VisitStatus.DRAFT;
}

/**
 * Get status display color for UI
 */
export function getStatusColor(status: VisitStatus): string {
  switch (status) {
    case VisitStatus.DRAFT:
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case VisitStatus.SIGNED:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case VisitStatus.LOCKED:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Get status badge variant for Shadcn UI Badge component
 */
export function getStatusBadgeColor(status: VisitStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case VisitStatus.DRAFT:
      return 'outline';
    case VisitStatus.SIGNED:
      return 'default';
    case VisitStatus.LOCKED:
      return 'secondary';
    default:
      return 'default';
  }
}

/**
 * Get visit type display color for UI
 */
export function getTypeColor(type: VisitType): string {
  switch (type) {
    case VisitType.NEW_PATIENT:
      return '#3B82F6'; // blue-500
    case VisitType.FOLLOW_UP:
      return '#10B981'; // emerald-500
    case VisitType.URGENT:
      return '#EF4444'; // red-500
    case VisitType.CONSULTATION:
      return '#8B5CF6'; // violet-500
    case VisitType.ROUTINE_CHECKUP:
      return '#6B7280'; // gray-500
    case VisitType.ACUPUNCTURE:
      return '#F59E0B'; // amber-500
    default:
      return '#6B7280';
  }
}

/**
 * Get diagnosis type display color for UI
 */
export function getDiagnosisTypeColor(type: DiagnosisType): string {
  switch (type) {
    case DiagnosisType.PROVISIONAL:
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case DiagnosisType.CONFIRMED:
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case DiagnosisType.DIFFERENTIAL:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case DiagnosisType.RULE_OUT:
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Format vital signs for display
 */
export function formatVitalSigns(vitals?: VitalSigns): string[] {
  if (!vitals) return [];

  const formatted: string[] = [];

  if (vitals.blood_pressure_systolic && vitals.blood_pressure_diastolic) {
    formatted.push(`BP: ${vitals.blood_pressure_systolic}/${vitals.blood_pressure_diastolic} mmHg`);
  }
  if (vitals.heart_rate) {
    formatted.push(`HR: ${vitals.heart_rate} bpm`);
  }
  if (vitals.temperature_celsius) {
    formatted.push(`Temp: ${vitals.temperature_celsius.toFixed(1)}°C`);
  }
  if (vitals.respiratory_rate) {
    formatted.push(`RR: ${vitals.respiratory_rate} /min`);
  }
  if (vitals.oxygen_saturation) {
    formatted.push(`O₂: ${vitals.oxygen_saturation}%`);
  }
  if (vitals.weight_kg) {
    formatted.push(`Weight: ${vitals.weight_kg} kg`);
  }
  if (vitals.height_cm) {
    formatted.push(`Height: ${vitals.height_cm} cm`);
  }
  if (vitals.bmi) {
    formatted.push(`BMI: ${vitals.bmi.toFixed(1)}`);
  }

  return formatted;
}

/**
 * Check if vitals are complete enough for a valid visit
 */
export function areVitalsComplete(vitals?: VitalSigns): boolean {
  if (!vitals) return false;
  // At minimum, require blood pressure and heart rate
  return !!(
    vitals.blood_pressure_systolic &&
    vitals.blood_pressure_diastolic &&
    vitals.heart_rate
  );
}
