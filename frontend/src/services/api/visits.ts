/**
 * Visit API Service
 *
 * Provides methods for interacting with the clinical documentation API endpoints.
 * Handles visit notes, SOAP documentation, diagnoses, prescriptions, and templates.
 */

import { apiClient } from './axios-instance';
import type {
  Visit,
  CreateVisitRequest,
  UpdateVisitRequest,
  SignVisitRequest,
  VisitSearchFilters,
  VisitListResponse,
  VisitStatistics,
  VisitTemplate,
  CreateVisitTemplateRequest,
  VisitVersion,
  VisitDiagnosis,
  CreateVisitDiagnosisRequest,
} from '../../types/visit';
import type {
  Prescription,
  CreatePrescriptionRequest,
  UpdatePrescriptionRequest,
  DiscontinuePrescriptionRequest,
  PrescriptionSearchFilters,
  PrescriptionListResponse,
  PrescriptionTemplate,
  CreatePrescriptionTemplateRequest,
  MedicationSearchResult,
  CreateCustomMedicationRequest,
  CreateCustomMedicationResponse,
} from '../../types/prescription';

/**
 * Visit API methods for CRUD operations and clinical documentation
 */
export const visitsApi = {
  /**
   * Get all visits with optional pagination
   * @param params - Pagination parameters (limit, offset)
   * @returns Paginated list of visits
   */
  getAll: async (params?: {
    limit?: number;
    offset?: number;
  }): Promise<VisitListResponse> => {
    const response = await apiClient.get<VisitListResponse>('/api/v1/visits', {
      params,
    });
    return response.data;
  },

  /**
   * Search visits with filters
   * @param filters - Search and filter criteria
   * @returns Filtered list of visits
   */
  search: async (filters: VisitSearchFilters): Promise<VisitListResponse> => {
    const response = await apiClient.get<VisitListResponse>('/api/v1/visits', {
      params: filters,
    });
    return response.data;
  },

  /**
   * Get a single visit by ID
   * @param id - Visit UUID
   * @returns The visit details with all clinical data
   */
  getById: async (id: string): Promise<Visit> => {
    const response = await apiClient.get<Visit>(`/api/v1/visits/${id}`);
    return response.data;
  },

  /**
   * Create a new visit
   * @param data - Visit creation data with SOAP notes
   * @returns The created visit
   */
  create: async (data: CreateVisitRequest): Promise<Visit> => {
    const response = await apiClient.post<Visit>('/api/v1/visits', data);
    return response.data;
  },

  /**
   * Update an existing visit (only if status is DRAFT)
   * @param id - Visit UUID
   * @param data - Fields to update
   * @returns The updated visit
   */
  update: async (id: string, data: UpdateVisitRequest): Promise<Visit> => {
    const response = await apiClient.put<Visit>(`/api/v1/visits/${id}`, data);
    return response.data;
  },

  /**
   * Delete a draft visit
   * @param id - Visit UUID
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/visits/${id}`);
  },

  /**
   * Sign a visit (DRAFT → SIGNED)
   * @param id - Visit UUID
   * @param data - Credential for digital signature
   * @returns The signed visit
   */
  sign: async (id: string, data: SignVisitRequest): Promise<Visit> => {
    const response = await apiClient.post<Visit>(`/api/v1/visits/${id}/sign`, data);
    return response.data;
  },

  /**
   * Lock a visit (SIGNED → LOCKED)
   * @param id - Visit UUID
   * @returns The locked visit
   */
  lock: async (id: string): Promise<Visit> => {
    const response = await apiClient.post<Visit>(`/api/v1/visits/${id}/lock`);
    return response.data;
  },

  /**
   * Get visits for a specific patient
   * @param patientId - Patient UUID
   * @param params - Optional pagination and filter parameters
   * @returns Visits for the patient
   */
  getByPatient: async (
    patientId: string,
    params?: { limit?: number; offset?: number }
  ): Promise<VisitListResponse> => {
    const response = await apiClient.get<VisitListResponse>(`/api/v1/patients/${patientId}/visits`, {
      params,
    });
    return response.data;
  },

  /**
   * Get visit statistics
   * @returns Statistics including counts by status and type
   */
  getStatistics: async (): Promise<VisitStatistics> => {
    const response = await apiClient.get<VisitStatistics>('/api/v1/visits/statistics');
    return response.data;
  },
};

/**
 * Visit Diagnosis API methods
 */
export const visitDiagnosesApi = {
  /**
   * Get all diagnoses for a visit
   * @param visitId - Visit UUID
   * @returns List of diagnoses
   */
  getByVisit: async (visitId: string): Promise<VisitDiagnosis[]> => {
    const response = await apiClient.get<VisitDiagnosis[]>(`/api/v1/visits/${visitId}/diagnoses`);
    return response.data;
  },

  /**
   * Create a new diagnosis for a visit
   * @param visitId - Visit UUID
   * @param data - Diagnosis data with ICD-10 code
   * @returns The created diagnosis
   */
  create: async (visitId: string, data: CreateVisitDiagnosisRequest): Promise<VisitDiagnosis> => {
    const response = await apiClient.post<VisitDiagnosis>(
      `/api/v1/visits/${visitId}/diagnoses`,
      data
    );
    return response.data;
  },

  /**
   * Update an existing diagnosis
   * @param visitId - Visit UUID
   * @param diagnosisId - Diagnosis UUID
   * @param data - Fields to update
   * @returns The updated diagnosis
   */
  update: async (
    visitId: string,
    diagnosisId: string,
    data: Partial<CreateVisitDiagnosisRequest>
  ): Promise<VisitDiagnosis> => {
    const response = await apiClient.put<VisitDiagnosis>(
      `/api/v1/visits/${visitId}/diagnoses/${diagnosisId}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a diagnosis
   * @param visitId - Visit UUID
   * @param diagnosisId - Diagnosis UUID
   */
  delete: async (visitId: string, diagnosisId: string): Promise<void> => {
    await apiClient.delete(`/api/v1/visits/${visitId}/diagnoses/${diagnosisId}`);
  },

  /**
   * Search ICD-10 codes
   * @param query - Search term
   * @param limit - Maximum number of results
   * @returns Matching ICD-10 codes
   */
  searchICD10: async (query: string, limit?: number): Promise<{ code: string; description: string }[]> => {
    const response = await apiClient.get<{ code: string; description: string }[]>(
      '/api/v1/diagnoses/search',
      {
        params: { query, limit },
      }
    );
    return response.data;
  },
};

/**
 * Prescription API methods
 */
export const prescriptionsApi = {
  /**
   * Get all prescriptions with optional pagination
   * @param params - Pagination parameters
   * @returns Paginated list of prescriptions
   */
  getAll: async (params?: {
    limit?: number;
    offset?: number;
  }): Promise<PrescriptionListResponse> => {
    const response = await apiClient.get<PrescriptionListResponse>('/api/v1/prescriptions', {
      params,
    });
    return response.data;
  },

  /**
   * Search prescriptions with filters
   * @param filters - Search and filter criteria
   * @returns Filtered list of prescriptions
   */
  search: async (filters: PrescriptionSearchFilters): Promise<PrescriptionListResponse> => {
    const response = await apiClient.get<PrescriptionListResponse>('/api/v1/prescriptions', {
      params: filters,
    });
    return response.data;
  },

  /**
   * Get a single prescription by ID
   * @param id - Prescription UUID
   * @returns The prescription details
   */
  getById: async (id: string): Promise<Prescription> => {
    const response = await apiClient.get<Prescription>(`/api/v1/prescriptions/${id}`);
    return response.data;
  },

  /**
   * Create a new prescription
   * @param data - Prescription data
   * @returns The created prescription
   */
  create: async (data: CreatePrescriptionRequest): Promise<Prescription> => {
    const response = await apiClient.post<Prescription>('/api/v1/prescriptions', data);
    return response.data;
  },

  /**
   * Update an existing prescription
   * @param id - Prescription UUID
   * @param data - Fields to update
   * @returns The updated prescription
   */
  update: async (id: string, data: UpdatePrescriptionRequest): Promise<Prescription> => {
    const response = await apiClient.put<Prescription>(`/api/v1/prescriptions/${id}`, data);
    return response.data;
  },

  /**
   * Discontinue a prescription
   * @param id - Prescription UUID
   * @param data - Discontinuation reason
   * @returns The discontinued prescription
   */
  discontinue: async (id: string, data: DiscontinuePrescriptionRequest): Promise<Prescription> => {
    const response = await apiClient.post<Prescription>(
      `/api/v1/prescriptions/${id}/discontinue`,
      data
    );
    return response.data;
  },

  /**
   * Cancel a prescription
   * @param id - Prescription UUID
   * @param data - Optional cancellation reason
   * @returns The cancelled prescription
   */
  cancel: async (id: string, data?: { reason?: string }): Promise<Prescription> => {
    const response = await apiClient.post<Prescription>(
      `/api/v1/prescriptions/${id}/cancel`,
      data || {}
    );
    return response.data;
  },

  /**
   * Put a prescription on hold
   * @param id - Prescription UUID
   * @param data - Hold reason (required)
   * @returns The prescription on hold
   */
  hold: async (id: string, data: { reason: string }): Promise<Prescription> => {
    const response = await apiClient.post<Prescription>(
      `/api/v1/prescriptions/${id}/hold`,
      data
    );
    return response.data;
  },

  /**
   * Resume a prescription from hold
   * @param id - Prescription UUID
   * @returns The resumed prescription
   */
  resume: async (id: string): Promise<Prescription> => {
    const response = await apiClient.post<Prescription>(
      `/api/v1/prescriptions/${id}/resume`
    );
    return response.data;
  },

  /**
   * Mark a prescription as completed
   * @param id - Prescription UUID
   * @returns The completed prescription
   */
  complete: async (id: string): Promise<Prescription> => {
    const response = await apiClient.post<Prescription>(
      `/api/v1/prescriptions/${id}/complete`
    );
    return response.data;
  },

  /**
   * Delete a prescription
   * @param id - Prescription UUID
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/prescriptions/${id}`);
  },

  /**
   * Get prescriptions for a specific patient
   * @param patientId - Patient UUID
   * @param params - Optional pagination parameters
   * @returns Prescriptions for the patient
   */
  getByPatient: async (
    patientId: string,
    params?: { limit?: number; offset?: number }
  ): Promise<PrescriptionListResponse> => {
    const response = await apiClient.get<PrescriptionListResponse>('/api/v1/prescriptions', {
      params: { patient_id: patientId, ...params },
    });
    return response.data;
  },

  /**
   * Get prescriptions for a specific visit
   * @param visitId - Visit UUID
   * @returns Prescriptions for the visit
   */
  getByVisit: async (visitId: string): Promise<Prescription[]> => {
    const response = await apiClient.get<Prescription[]>(`/api/v1/visits/${visitId}/prescriptions`);
    return response.data;
  },

  /**
   * Search medications
   * @param query - Medication name search term
   * @param limit - Maximum number of results
   * @returns Matching medications
   */
  searchMedications: async (query: string, limit?: number): Promise<MedicationSearchResult[]> => {
    const response = await apiClient.get<MedicationSearchResult[]>(
      '/api/v1/prescriptions/medications/search',
      {
        params: { query, limit },
      }
    );
    return response.data;
  },

  /**
   * Create a custom medication
   * Custom medications are stored in the database and appear in future medication searches.
   * @param data - Custom medication data
   * @returns The created medication ID and confirmation message
   */
  createCustomMedication: async (
    data: CreateCustomMedicationRequest
  ): Promise<CreateCustomMedicationResponse> => {
    const response = await apiClient.post<CreateCustomMedicationResponse>(
      '/api/v1/prescriptions/medications/custom',
      data
    );
    return response.data;
  },
};

/**
 * Visit Template API methods
 */
export const visitTemplatesApi = {
  /**
   * Get all visit templates
   * @returns List of visit templates
   */
  getAll: async (): Promise<VisitTemplate[]> => {
    const response = await apiClient.get<VisitTemplate[]>('/api/v1/visit-templates');
    return response.data;
  },

  /**
   * Get a single visit template by ID
   * @param id - Template UUID
   * @returns The template details
   */
  getById: async (id: string): Promise<VisitTemplate> => {
    const response = await apiClient.get<VisitTemplate>(`/api/v1/visit-templates/${id}`);
    return response.data;
  },

  /**
   * Create a new visit template
   * @param data - Template data
   * @returns The created template
   */
  create: async (data: CreateVisitTemplateRequest): Promise<VisitTemplate> => {
    const response = await apiClient.post<VisitTemplate>('/api/v1/visit-templates', data);
    return response.data;
  },

  /**
   * Update an existing visit template
   * @param id - Template UUID
   * @param data - Fields to update
   * @returns The updated template
   */
  update: async (id: string, data: Partial<CreateVisitTemplateRequest>): Promise<VisitTemplate> => {
    const response = await apiClient.put<VisitTemplate>(`/api/v1/visit-templates/${id}`, data);
    return response.data;
  },

  /**
   * Delete a visit template
   * @param id - Template UUID
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/visit-templates/${id}`);
  },
};

/**
 * Prescription Template API methods
 */
export const prescriptionTemplatesApi = {
  /**
   * Get all prescription templates
   * @returns List of prescription templates
   */
  getAll: async (): Promise<PrescriptionTemplate[]> => {
    const response = await apiClient.get<PrescriptionTemplate[]>('/api/v1/prescription-templates');
    return response.data;
  },

  /**
   * Get a single prescription template by ID
   * @param id - Template UUID
   * @returns The template details
   */
  getById: async (id: string): Promise<PrescriptionTemplate> => {
    const response = await apiClient.get<PrescriptionTemplate>(
      `/api/v1/prescription-templates/${id}`
    );
    return response.data;
  },

  /**
   * Create a new prescription template
   * @param data - Template data
   * @returns The created template
   */
  create: async (data: CreatePrescriptionTemplateRequest): Promise<PrescriptionTemplate> => {
    const response = await apiClient.post<PrescriptionTemplate>(
      '/api/v1/prescription-templates',
      data
    );
    return response.data;
  },

  /**
   * Update an existing prescription template
   * @param id - Template UUID
   * @param data - Fields to update
   * @returns The updated template
   */
  update: async (
    id: string,
    data: Partial<CreatePrescriptionTemplateRequest>
  ): Promise<PrescriptionTemplate> => {
    const response = await apiClient.put<PrescriptionTemplate>(
      `/api/v1/prescription-templates/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a prescription template
   * @param id - Template UUID
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/prescription-templates/${id}`);
  },
};

/**
 * Visit Version History API methods
 */
export const visitVersionsApi = {
  /**
   * Get all versions for a visit
   * @param visitId - Visit UUID
   * @returns List of visit versions
   */
  getByVisit: async (visitId: string): Promise<VisitVersion[]> => {
    const response = await apiClient.get<VisitVersion[]>(`/api/v1/visits/${visitId}/versions`);
    return response.data;
  },

  /**
   * Get a specific visit version
   * @param visitId - Visit UUID
   * @param versionId - Version UUID
   * @returns The version details
   */
  getVersion: async (visitId: string, versionId: string): Promise<VisitVersion> => {
    const response = await apiClient.get<VisitVersion>(
      `/api/v1/visits/${visitId}/versions/${versionId}`
    );
    return response.data;
  },

  /**
   * Restore a visit to a previous version
   * @param visitId - Visit UUID
   * @param versionId - Version UUID to restore
   * @returns The restored visit
   */
  restore: async (visitId: string, versionId: string): Promise<Visit> => {
    const response = await apiClient.post<Visit>(
      `/api/v1/visits/${visitId}/versions/${versionId}/restore`
    );
    return response.data;
  },
};
