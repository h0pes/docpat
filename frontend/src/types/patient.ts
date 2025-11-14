/**
 * Patient-related type definitions
 * Mirrors backend PatientDto and related structures
 * All types use snake_case to match backend API responses
 */

/**
 * Patient status enumeration
 */
export enum PatientStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DECEASED = 'DECEASED',
}

/**
 * Gender enumeration
 */
export enum Gender {
  M = 'M',
  F = 'F',
  OTHER = 'OTHER',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Preferred contact method enumeration
 */
export enum ContactMethod {
  PHONE = 'PHONE',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  WHATSAPP = 'WHATSAPP',
}

/**
 * Address structure
 */
export interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

/**
 * Emergency contact structure
 */
export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

/**
 * Medication structure
 */
export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  start_date?: string; // ISO date string
}

/**
 * Patient data transfer object
 * Matches backend PatientDto structure
 */
export interface Patient {
  id: string;
  medical_record_number: string;

  // Demographics
  first_name: string;
  last_name: string;
  middle_name?: string;
  date_of_birth: string; // ISO date string
  gender: Gender;
  fiscal_code?: string; // Italian tax code (16 chars)

  // Contact Information
  phone_primary?: string;
  phone_secondary?: string;
  email?: string;
  preferred_contact_method: ContactMethod;

  // Address and Emergency Contact
  address?: Address;
  emergency_contact?: EmergencyContact;

  // Medical Information
  blood_type?: string;
  allergies?: string[];
  chronic_conditions?: string[];
  current_medications?: Medication[];

  // Health Card & Photo
  health_card_expire?: string; // ISO date string
  photo_url?: string;

  // Status
  status: PatientStatus;
  deceased_date?: string; // ISO date string

  // Notes
  notes?: string;

  // Audit fields
  created_at: string; // ISO datetime string
  updated_at: string; // ISO datetime string
  created_by?: string;
  updated_by?: string;
}

/**
 * Create patient request payload
 */
export interface CreatePatientRequest {
  // Demographics (required)
  first_name: string;
  last_name: string;
  middle_name?: string;
  date_of_birth: string; // ISO date string (YYYY-MM-DD)
  gender: Gender;
  fiscal_code?: string;

  // Contact Information
  phone_primary?: string;
  phone_secondary?: string;
  email?: string;
  preferred_contact_method?: ContactMethod;

  // Address and Emergency Contact
  address?: Address;
  emergency_contact?: EmergencyContact;

  // Medical Information
  blood_type?: string;
  allergies?: string[];
  chronic_conditions?: string[];
  current_medications?: Medication[];

  // Health Card
  health_card_expire?: string; // ISO date string (YYYY-MM-DD)

  // Photo
  photo_url?: string;

  // Notes
  notes?: string;
}

/**
 * Update patient request payload
 * All fields optional except those needed for validation
 */
export interface UpdatePatientRequest {
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  date_of_birth?: string;
  gender?: Gender;
  fiscal_code?: string;
  phone_primary?: string;
  phone_secondary?: string;
  email?: string;
  preferred_contact_method?: ContactMethod;
  address?: Address;
  emergency_contact?: EmergencyContact;
  blood_type?: string;
  allergies?: string[];
  chronic_conditions?: string[];
  current_medications?: Medication[];
  health_card_expire?: string;
  photo_url?: string;
  status?: PatientStatus;
  deceased_date?: string;
  notes?: string;
}

/**
 * Patient list response with pagination
 */
export interface PatientListResponse {
  patients: Patient[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Patient search filters
 */
export interface PatientSearchFilters {
  query?: string; // Search query (name, fiscal_code, phone, email)
  status?: PatientStatus;
  gender?: Gender;
  min_age?: number;
  max_age?: number;
  has_allergies?: boolean;
  has_chronic_conditions?: boolean;
  has_insurance?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Patient statistics response
 */
export interface PatientStatistics {
  total_patients: number;
  active_patients: number;
  inactive_patients: number;
  deceased_patients: number;
  patients_with_insurance: number;
  patients_without_insurance: number;
  patients_by_gender: {
    M: number;
    F: number;
    OTHER: number;
    UNKNOWN: number;
  };
  average_age: number;
}
