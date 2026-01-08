/**
 * Drug Interactions API Service
 *
 * Provides methods for checking drug-drug interactions using the DDInter 2.0 database.
 * Used to warn prescribers about potential interactions when creating/editing prescriptions.
 */

import { apiClient } from './axios-instance';
import type {
  CheckInteractionsRequest,
  CheckInteractionsResponse,
  CheckNewMedicationRequest,
  CheckNewMedicationForPatientRequest,
  InteractionStatistics,
} from '../../types/prescription';

/**
 * Drug Interactions API methods
 */
export const drugInteractionsApi = {
  /**
   * Check interactions between multiple medications by ATC codes
   * @param request - Request containing ATC codes to check
   * @returns Response with found interactions and statistics
   */
  checkInteractions: async (
    request: CheckInteractionsRequest
  ): Promise<CheckInteractionsResponse> => {
    const response = await apiClient.post<CheckInteractionsResponse>(
      '/api/v1/drug-interactions/check',
      request
    );
    return response.data;
  },

  /**
   * Check interactions when adding a new medication to existing regimen (by ATC codes)
   * @param request - Request containing new ATC code and existing ATC codes
   * @returns Response with found interactions and statistics
   */
  checkNewMedication: async (
    request: CheckNewMedicationRequest
  ): Promise<CheckInteractionsResponse> => {
    const response = await apiClient.post<CheckInteractionsResponse>(
      '/api/v1/drug-interactions/check-new',
      request
    );
    return response.data;
  },

  /**
   * Check interactions when adding a new medication for a specific patient
   * Uses medication name with fuzzy matching (for AIFA medications)
   * @param request - Request containing new medication name and patient ID
   * @returns Response with found NEW interactions only
   */
  checkNewMedicationForPatient: async (
    request: CheckNewMedicationForPatientRequest
  ): Promise<CheckInteractionsResponse> => {
    const response = await apiClient.post<CheckInteractionsResponse>(
      '/api/v1/drug-interactions/check-new-for-patient',
      request
    );
    return response.data;
  },

  /**
   * Check interactions for a patient's active prescriptions
   * @param patientId - UUID of the patient
   * @param minSeverity - Optional minimum severity filter
   * @returns Response with found interactions and statistics
   */
  checkPatientInteractions: async (
    patientId: string,
    minSeverity?: string
  ): Promise<CheckInteractionsResponse> => {
    const params = minSeverity ? { min_severity: minSeverity } : {};
    const response = await apiClient.get<CheckInteractionsResponse>(
      `/api/v1/drug-interactions/patient/${patientId}`,
      { params }
    );
    return response.data;
  },

  /**
   * Get statistics about the drug interaction database
   * @returns Statistics including total counts by severity
   */
  getStatistics: async (): Promise<InteractionStatistics> => {
    const response = await apiClient.get<InteractionStatistics>(
      '/api/v1/drug-interactions/statistics'
    );
    return response.data;
  },
};
