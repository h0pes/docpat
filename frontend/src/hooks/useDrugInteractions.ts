/**
 * Drug Interactions Hooks
 *
 * React Query hooks for drug-drug interaction checking.
 * Uses DDInter 2.0 database for interaction data with ATC code matching.
 */

import { useMutation, useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { drugInteractionsApi } from '@/services/api';
import type {
  CheckInteractionsRequest,
  CheckInteractionsResponse,
  CheckNewMedicationRequest,
  CheckNewMedicationForPatientRequest,
  InteractionStatistics,
} from '@/types/prescription';

/**
 * Query keys for drug interaction data
 */
export const drugInteractionKeys = {
  all: ['drug-interactions'] as const,
  patient: (patientId: string) => [...drugInteractionKeys.all, 'patient', patientId] as const,
  check: (atcCodes: string[]) => [...drugInteractionKeys.all, 'check', atcCodes.sort().join('-')] as const,
  statistics: () => [...drugInteractionKeys.all, 'statistics'] as const,
};

/**
 * Check drug interactions for a patient's active prescriptions
 *
 * @param patientId - UUID of the patient
 * @param minSeverity - Optional minimum severity filter
 * @param options - React Query options
 */
export function usePatientDrugInteractions(
  patientId: string | undefined,
  minSeverity?: string,
  options?: Omit<UseQueryOptions<CheckInteractionsResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery<CheckInteractionsResponse>({
    queryKey: [...drugInteractionKeys.patient(patientId || ''), minSeverity],
    queryFn: () => drugInteractionsApi.checkPatientInteractions(patientId!, minSeverity),
    enabled: !!patientId,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    ...options,
  });
}

/**
 * Check interactions between multiple ATC codes
 *
 * @param request - Request containing ATC codes to check
 * @param options - React Query options
 */
export function useDrugInteractions(
  request: CheckInteractionsRequest | null,
  options?: Omit<UseQueryOptions<CheckInteractionsResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery<CheckInteractionsResponse>({
    queryKey: request ? drugInteractionKeys.check(request.atc_codes) : ['disabled'],
    queryFn: () => drugInteractionsApi.checkInteractions(request!),
    enabled: !!request && request.atc_codes.length > 0,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    ...options,
  });
}

/**
 * Mutation hook for checking interactions when adding a new medication (by ATC code)
 * Useful for real-time checking in prescription forms
 */
export function useCheckNewMedication() {
  return useMutation<CheckInteractionsResponse, Error, CheckNewMedicationRequest>({
    mutationFn: (request) => drugInteractionsApi.checkNewMedication(request),
  });
}

/**
 * Mutation hook for checking NEW interactions when adding a medication for a patient
 * Uses medication name with fuzzy matching (works with AIFA medications)
 * Returns ONLY the new interactions the medication would create
 */
export function useCheckNewMedicationForPatient() {
  return useMutation<CheckInteractionsResponse, Error, CheckNewMedicationForPatientRequest>({
    mutationFn: (request) => drugInteractionsApi.checkNewMedicationForPatient(request),
  });
}

/**
 * Get drug interaction database statistics
 */
export function useDrugInteractionStatistics(
  options?: Omit<UseQueryOptions<InteractionStatistics>, 'queryKey' | 'queryFn'>
) {
  return useQuery<InteractionStatistics>({
    queryKey: drugInteractionKeys.statistics(),
    queryFn: () => drugInteractionsApi.getStatistics(),
    staleTime: 60 * 60 * 1000, // Statistics don't change often, cache for 1 hour
    ...options,
  });
}
