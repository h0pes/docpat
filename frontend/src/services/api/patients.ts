/**
 * Patient API Service
 *
 * API methods for patient management, including CRUD operations,
 * search, filters, and statistics.
 */

import { apiClient } from './axios-instance';
import type {
  Patient,
  CreatePatientRequest,
  UpdatePatientRequest,
  PatientListResponse,
  PatientSearchFilters,
  PatientStatistics,
} from '../../types/patient';
import type {
  PatientInsurance,
  CreatePatientInsuranceRequest,
  UpdatePatientInsuranceRequest,
} from '../../types/patientInsurance';

/**
 * Patient API endpoints
 */
export const patientsApi = {
  /**
   * Get all patients with pagination
   *
   * @param params - Pagination parameters (limit, offset)
   * @returns Paginated list of patients
   */
  getAll: async (params?: {
    limit?: number;
    offset?: number;
  }): Promise<PatientListResponse> => {
    const response = await apiClient.get<PatientListResponse>(
      '/api/v1/patients',
      {
        params: {
          limit: params?.limit || 20,
          offset: params?.offset || 0,
        },
      }
    );
    return response.data;
  },

  /**
   * Search patients with filters
   *
   * @param filters - Search filters
   * @returns Paginated list of matching patients
   */
  search: async (filters: PatientSearchFilters): Promise<PatientListResponse> => {
    const response = await apiClient.get<PatientListResponse>(
      '/api/v1/patients/search',
      {
        params: filters,
      }
    );
    return response.data;
  },

  /**
   * Get patient by ID
   *
   * @param id - Patient UUID
   * @returns Patient details
   */
  getById: async (id: string): Promise<Patient> => {
    const response = await apiClient.get<Patient>(`/api/v1/patients/${id}`);
    return response.data;
  },

  /**
   * Create new patient
   *
   * @param data - Patient creation data
   * @returns Created patient
   */
  create: async (data: CreatePatientRequest): Promise<Patient> => {
    const response = await apiClient.post<Patient>('/api/v1/patients', data);
    return response.data;
  },

  /**
   * Update existing patient
   *
   * @param id - Patient UUID
   * @param data - Patient update data
   * @returns Updated patient
   */
  update: async (
    id: string,
    data: UpdatePatientRequest
  ): Promise<Patient> => {
    const response = await apiClient.put<Patient>(
      `/api/v1/patients/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete/deactivate patient (soft delete)
   *
   * @param id - Patient UUID
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/patients/${id}`);
  },

  /**
   * Get patient statistics
   *
   * @returns Patient statistics
   */
  getStatistics: async (): Promise<PatientStatistics> => {
    const response = await apiClient.get<PatientStatistics>(
      '/api/v1/patients/statistics'
    );
    return response.data;
  },

  /**
   * Get patient insurance information
   *
   * @param patientId - Patient UUID
   * @returns List of patient insurance records
   */
  getInsurance: async (patientId: string): Promise<PatientInsurance[]> => {
    const response = await apiClient.get<PatientInsurance[]>(
      `/api/v1/patients/${patientId}/insurance`
    );
    return response.data;
  },

  /**
   * Add insurance to patient
   *
   * @param data - Insurance creation data
   * @returns Created insurance record
   */
  addInsurance: async (
    data: CreatePatientInsuranceRequest
  ): Promise<PatientInsurance> => {
    const response = await apiClient.post<PatientInsurance>(
      '/api/v1/patients/insurance',
      data
    );
    return response.data;
  },

  /**
   * Update patient insurance
   *
   * @param id - Insurance UUID
   * @param data - Insurance update data
   * @returns Updated insurance record
   */
  updateInsurance: async (
    id: string,
    data: UpdatePatientInsuranceRequest
  ): Promise<PatientInsurance> => {
    const response = await apiClient.put<PatientInsurance>(
      `/api/v1/patients/insurance/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete patient insurance
   *
   * @param id - Insurance UUID
   */
  deleteInsurance: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/patients/insurance/${id}`);
  },

  /**
   * Upload patient photo
   *
   * @param patientId - Patient UUID
   * @param file - Photo file
   * @returns Photo URL
   */
  uploadPhoto: async (
    patientId: string,
    file: File
  ): Promise<{ photo_url: string }> => {
    const formData = new FormData();
    formData.append('photo', file);

    const response = await apiClient.post<{ photo_url: string }>(
      `/api/v1/patients/${patientId}/photo`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  /**
   * Delete patient photo
   *
   * @param patientId - Patient UUID
   */
  deletePhoto: async (patientId: string): Promise<void> => {
    await apiClient.delete(`/api/v1/patients/${patientId}/photo`);
  },
};
