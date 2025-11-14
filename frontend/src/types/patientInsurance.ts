/**
 * Patient Insurance type definitions
 * Mirrors backend PatientInsuranceDto structure
 * All types use snake_case to match backend API responses
 */

/**
 * Insurance type enumeration
 */
export enum InsuranceType {
  PRIMARY = 'PRIMARY',
  SECONDARY = 'SECONDARY',
  TERTIARY = 'TERTIARY',
}

/**
 * Policyholder relationship enumeration
 */
export enum PolicyholderRelationship {
  SELF = 'SELF',
  SPOUSE = 'SPOUSE',
  PARENT = 'PARENT',
  CHILD = 'CHILD',
  OTHER = 'OTHER',
}

/**
 * Provider address structure
 */
export interface ProviderAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

/**
 * Patient Insurance data transfer object
 * Matches backend PatientInsuranceDto structure
 */
export interface PatientInsurance {
  id: string;
  patient_id: string;
  insurance_type: InsuranceType;

  // Insurance Provider Information
  provider_name: string;
  policy_number: string;
  group_number?: string;
  plan_name?: string;

  // Policyholder Information
  policyholder_name?: string;
  policyholder_relationship?: PolicyholderRelationship;
  policyholder_dob?: string; // ISO date string

  // Coverage Details
  effective_date: string; // ISO date string
  expiration_date?: string; // ISO date string
  coverage_type?: string;

  // Contact Information
  provider_phone?: string;
  provider_address?: ProviderAddress;

  // Additional Information
  notes?: string;

  // Status
  is_active: boolean;

  // Audit fields
  created_at: string; // ISO datetime string
  updated_at: string; // ISO datetime string
  created_by?: string;
  updated_by?: string;
}

/**
 * Create patient insurance request payload
 */
export interface CreatePatientInsuranceRequest {
  patient_id: string;
  insurance_type: InsuranceType;

  // Insurance Provider Information (required)
  provider_name: string;
  policy_number: string;
  group_number?: string;
  plan_name?: string;

  // Policyholder Information
  policyholder_name?: string;
  policyholder_relationship?: PolicyholderRelationship;
  policyholder_dob?: string; // ISO date string (YYYY-MM-DD)

  // Coverage Details
  effective_date: string; // ISO date string (YYYY-MM-DD)
  expiration_date?: string; // ISO date string (YYYY-MM-DD)
  coverage_type?: string;

  // Contact Information
  provider_phone?: string;
  provider_address?: ProviderAddress;

  // Additional Information
  notes?: string;
}

/**
 * Update patient insurance request payload
 * All fields optional
 */
export interface UpdatePatientInsuranceRequest {
  insurance_type?: InsuranceType;
  provider_name?: string;
  policy_number?: string;
  group_number?: string;
  plan_name?: string;
  policyholder_name?: string;
  policyholder_relationship?: PolicyholderRelationship;
  policyholder_dob?: string;
  effective_date?: string;
  expiration_date?: string;
  coverage_type?: string;
  provider_phone?: string;
  provider_address?: ProviderAddress;
  notes?: string;
  is_active?: boolean;
}
