/**
 * Visit Hooks
 *
 * React Query hooks for clinical documentation (visits, diagnoses, prescriptions).
 * Provides declarative data fetching and mutations with caching and optimistic updates.
 */

import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import {
  visitsApi,
  visitDiagnosesApi,
  prescriptionsApi,
  visitTemplatesApi,
  prescriptionTemplatesApi,
  visitVersionsApi,
} from '@/services/api';
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
} from '@/types/visit';
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
} from '@/types/prescription';

/**
 * Query keys for visit-related data
 * Following React Query best practices for key structure
 */
export const visitKeys = {
  all: ['visits'] as const,
  lists: () => [...visitKeys.all, 'list'] as const,
  list: (filters: VisitSearchFilters) => [...visitKeys.lists(), filters] as const,
  details: () => [...visitKeys.all, 'detail'] as const,
  detail: (id: string) => [...visitKeys.details(), id] as const,
  byPatient: (patientId: string) => [...visitKeys.all, 'patient', patientId] as const,
  statistics: () => [...visitKeys.all, 'statistics'] as const,

  // Diagnoses
  diagnoses: (visitId: string) => [...visitKeys.detail(visitId), 'diagnoses'] as const,

  // Prescriptions (by visit)
  visitPrescriptions: (visitId: string) => [...visitKeys.detail(visitId), 'prescriptions'] as const,

  // Templates
  templates: () => [...visitKeys.all, 'templates'] as const,
  template: (id: string) => [...visitKeys.templates(), id] as const,

  // Versions
  versions: (visitId: string) => [...visitKeys.detail(visitId), 'versions'] as const,
  version: (visitId: string, versionId: string) => [...visitKeys.versions(visitId), versionId] as const,
};

export const prescriptionKeys = {
  all: ['prescriptions'] as const,
  lists: () => [...prescriptionKeys.all, 'list'] as const,
  list: (filters: PrescriptionSearchFilters) => [...prescriptionKeys.lists(), filters] as const,
  details: () => [...prescriptionKeys.all, 'detail'] as const,
  detail: (id: string) => [...prescriptionKeys.details(), id] as const,
  byPatient: (patientId: string) => [...prescriptionKeys.all, 'patient', patientId] as const,
  templates: () => [...prescriptionKeys.all, 'templates'] as const,
  template: (id: string) => [...prescriptionKeys.templates(), id] as const,
};

/**
 * Fetch all visits with optional pagination
 */
export function useVisits(
  params?: { limit?: number; offset?: number },
  options?: Omit<UseQueryOptions<VisitListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery<VisitListResponse>({
    queryKey: visitKeys.list(params || {}),
    queryFn: () => visitsApi.getAll(params),
    ...options,
  });
}

/**
 * Search/filter visits
 */
export function useVisitSearch(
  filters: VisitSearchFilters,
  options?: Omit<UseQueryOptions<VisitListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery<VisitListResponse>({
    queryKey: visitKeys.list(filters),
    queryFn: () => visitsApi.search(filters),
    ...options,
  });
}

/**
 * Fetch a single visit by ID
 */
export function useVisit(
  id: string,
  options?: Omit<UseQueryOptions<Visit>, 'queryKey' | 'queryFn'>
) {
  return useQuery<Visit>({
    queryKey: visitKeys.detail(id),
    queryFn: () => visitsApi.getById(id),
    ...options,
  });
}

/**
 * Fetch visits for a specific patient
 */
export function usePatientVisits(
  patientId: string,
  params?: { limit?: number; offset?: number },
  options?: Omit<UseQueryOptions<VisitListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery<VisitListResponse>({
    queryKey: visitKeys.byPatient(patientId),
    queryFn: () => visitsApi.getByPatient(patientId, params),
    ...options,
  });
}

/**
 * Fetch visit statistics
 */
export function useVisitStatistics(
  options?: Omit<UseQueryOptions<VisitStatistics>, 'queryKey' | 'queryFn'>
) {
  return useQuery<VisitStatistics>({
    queryKey: visitKeys.statistics(),
    queryFn: () => visitsApi.getStatistics(),
    ...options,
  });
}

/**
 * Create a new visit
 */
export function useCreateVisit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateVisitRequest) => visitsApi.create(data),
    onSuccess: (newVisit) => {
      // Invalidate lists to refetch
      queryClient.invalidateQueries({ queryKey: visitKeys.lists() });
      queryClient.invalidateQueries({ queryKey: visitKeys.byPatient(newVisit.patient_id) });
      queryClient.invalidateQueries({ queryKey: visitKeys.statistics() });

      // Set the new visit in cache
      queryClient.setQueryData(visitKeys.detail(newVisit.id), newVisit);
    },
  });
}

/**
 * Update an existing visit (only DRAFT status)
 */
export function useUpdateVisit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateVisitRequest }) =>
      visitsApi.update(id, data),
    onSuccess: (updatedVisit) => {
      // Update the visit in cache
      queryClient.setQueryData(visitKeys.detail(updatedVisit.id), updatedVisit);

      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: visitKeys.lists() });
      queryClient.invalidateQueries({ queryKey: visitKeys.byPatient(updatedVisit.patient_id) });
    },
  });
}

/**
 * Delete a draft visit
 */
export function useDeleteVisit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => visitsApi.delete(id),
    onSuccess: (_, deletedId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: visitKeys.detail(deletedId) });

      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: visitKeys.lists() });
      queryClient.invalidateQueries({ queryKey: visitKeys.statistics() });
    },
  });
}

/**
 * Sign a visit (DRAFT → SIGNED)
 */
export function useSignVisit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SignVisitRequest }) =>
      visitsApi.sign(id, data),
    onSuccess: (signedVisit) => {
      // Update the visit in cache
      queryClient.setQueryData(visitKeys.detail(signedVisit.id), signedVisit);

      // Invalidate lists and statistics
      queryClient.invalidateQueries({ queryKey: visitKeys.lists() });
      queryClient.invalidateQueries({ queryKey: visitKeys.byPatient(signedVisit.patient_id) });
      queryClient.invalidateQueries({ queryKey: visitKeys.statistics() });
    },
  });
}

/**
 * Lock a visit (SIGNED → LOCKED)
 */
export function useLockVisit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => visitsApi.lock(id),
    onSuccess: (lockedVisit) => {
      // Update the visit in cache
      queryClient.setQueryData(visitKeys.detail(lockedVisit.id), lockedVisit);

      // Invalidate lists and statistics
      queryClient.invalidateQueries({ queryKey: visitKeys.lists() });
      queryClient.invalidateQueries({ queryKey: visitKeys.byPatient(lockedVisit.patient_id) });
      queryClient.invalidateQueries({ queryKey: visitKeys.statistics() });
    },
  });
}

/**
 * Diagnoses Hooks
 */

/**
 * Fetch diagnoses for a visit
 */
export function useVisitDiagnoses(
  visitId: string,
  options?: Omit<UseQueryOptions<VisitDiagnosis[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery<VisitDiagnosis[]>({
    queryKey: visitKeys.diagnoses(visitId),
    queryFn: () => visitDiagnosesApi.getByVisit(visitId),
    ...options,
  });
}

/**
 * Search ICD-10 codes
 */
export function useICD10Search(
  query: string,
  limit?: number,
  options?: Omit<UseQueryOptions<{ code: string; description: string }[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery<{ code: string; description: string }[]>({
    queryKey: ['icd10', query, limit],
    queryFn: () => visitDiagnosesApi.searchICD10(query, limit),
    enabled: query.length >= 2, // Only search with at least 2 characters
    ...options,
  });
}

/**
 * Create a diagnosis for a visit
 */
export function useCreateVisitDiagnosis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ visitId, data }: { visitId: string; data: CreateVisitDiagnosisRequest }) =>
      visitDiagnosesApi.create(visitId, data),
    onSuccess: (_, { visitId }) => {
      // Invalidate diagnoses list for this visit
      queryClient.invalidateQueries({ queryKey: visitKeys.diagnoses(visitId) });
    },
  });
}

/**
 * Delete a diagnosis
 */
export function useDeleteVisitDiagnosis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ visitId, diagnosisId }: { visitId: string; diagnosisId: string }) =>
      visitDiagnosesApi.delete(visitId, diagnosisId),
    onSuccess: (_, { visitId }) => {
      // Invalidate diagnoses list for this visit
      queryClient.invalidateQueries({ queryKey: visitKeys.diagnoses(visitId) });
    },
  });
}

/**
 * Prescription Hooks
 */

/**
 * Fetch all prescriptions with optional pagination
 */
export function usePrescriptions(
  params?: { limit?: number; offset?: number },
  options?: Omit<UseQueryOptions<PrescriptionListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery<PrescriptionListResponse>({
    queryKey: prescriptionKeys.list(params || {}),
    queryFn: () => prescriptionsApi.getAll(params),
    ...options,
  });
}

/**
 * Search/filter prescriptions
 */
export function usePrescriptionSearch(
  filters: PrescriptionSearchFilters,
  options?: Omit<UseQueryOptions<PrescriptionListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery<PrescriptionListResponse>({
    queryKey: prescriptionKeys.list(filters),
    queryFn: () => prescriptionsApi.search(filters),
    ...options,
  });
}

/**
 * Fetch a single prescription by ID
 */
export function usePrescription(
  id: string,
  options?: Omit<UseQueryOptions<Prescription>, 'queryKey' | 'queryFn'>
) {
  return useQuery<Prescription>({
    queryKey: prescriptionKeys.detail(id),
    queryFn: () => prescriptionsApi.getById(id),
    ...options,
  });
}

/**
 * Fetch prescriptions for a specific patient
 */
export function usePatientPrescriptions(
  patientId: string,
  params?: { limit?: number; offset?: number },
  options?: Omit<UseQueryOptions<PrescriptionListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery<PrescriptionListResponse>({
    queryKey: prescriptionKeys.byPatient(patientId),
    queryFn: () => prescriptionsApi.getByPatient(patientId, params),
    ...options,
  });
}

/**
 * Fetch prescriptions for a visit
 */
export function useVisitPrescriptions(
  visitId: string,
  options?: Omit<UseQueryOptions<Prescription[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery<Prescription[]>({
    queryKey: visitKeys.visitPrescriptions(visitId),
    queryFn: () => prescriptionsApi.getByVisit(visitId),
    ...options,
  });
}

/**
 * Search medications
 */
export function useMedicationSearch(
  query: string,
  limit?: number,
  options?: Omit<UseQueryOptions<MedicationSearchResult[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery<MedicationSearchResult[]>({
    queryKey: ['medications', query, limit],
    queryFn: () => prescriptionsApi.searchMedications(query, limit),
    enabled: query.length >= 2, // Only search with at least 2 characters
    ...options,
  });
}

/**
 * Create a new prescription
 */
export function useCreatePrescription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePrescriptionRequest) => prescriptionsApi.create(data),
    onSuccess: (newPrescription) => {
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: prescriptionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: prescriptionKeys.byPatient(newPrescription.patient_id) });

      // If associated with a visit, invalidate visit prescriptions
      if (newPrescription.visit_id) {
        queryClient.invalidateQueries({ queryKey: visitKeys.visitPrescriptions(newPrescription.visit_id) });
      }

      // Set the new prescription in cache
      queryClient.setQueryData(prescriptionKeys.detail(newPrescription.id), newPrescription);
    },
  });
}

/**
 * Update an existing prescription
 */
export function useUpdatePrescription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePrescriptionRequest }) =>
      prescriptionsApi.update(id, data),
    onSuccess: (updatedPrescription) => {
      // Update in cache
      queryClient.setQueryData(prescriptionKeys.detail(updatedPrescription.id), updatedPrescription);

      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: prescriptionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: prescriptionKeys.byPatient(updatedPrescription.patient_id) });
    },
  });
}

/**
 * Discontinue a prescription
 */
export function useDiscontinuePrescription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: DiscontinuePrescriptionRequest }) =>
      prescriptionsApi.discontinue(id, data),
    onSuccess: (discontinuedPrescription) => {
      // Update in cache
      queryClient.setQueryData(prescriptionKeys.detail(discontinuedPrescription.id), discontinuedPrescription);

      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: prescriptionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: prescriptionKeys.byPatient(discontinuedPrescription.patient_id) });
    },
  });
}

/**
 * Delete a prescription
 */
export function useDeletePrescription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => prescriptionsApi.delete(id),
    onSuccess: (_, deletedId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: prescriptionKeys.detail(deletedId) });

      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: prescriptionKeys.lists() });
    },
  });
}

/**
 * Template Hooks
 */

/**
 * Fetch all visit templates
 */
export function useVisitTemplates(
  options?: Omit<UseQueryOptions<VisitTemplate[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery<VisitTemplate[]>({
    queryKey: visitKeys.templates(),
    queryFn: () => visitTemplatesApi.getAll(),
    ...options,
  });
}

/**
 * Fetch all prescription templates
 */
export function usePrescriptionTemplates(
  options?: Omit<UseQueryOptions<PrescriptionTemplate[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery<PrescriptionTemplate[]>({
    queryKey: prescriptionKeys.templates(),
    queryFn: () => prescriptionTemplatesApi.getAll(),
    ...options,
  });
}

/**
 * Create a visit template
 */
export function useCreateVisitTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateVisitTemplateRequest) => visitTemplatesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitKeys.templates() });
    },
  });
}

/**
 * Update a visit template
 */
export function useUpdateVisitTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateVisitTemplateRequest }) =>
      visitTemplatesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitKeys.templates() });
    },
  });
}

/**
 * Delete a visit template
 */
export function useDeleteVisitTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => visitTemplatesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitKeys.templates() });
    },
  });
}

/**
 * Create a prescription template
 */
export function useCreatePrescriptionTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePrescriptionTemplateRequest) => prescriptionTemplatesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: prescriptionKeys.templates() });
    },
  });
}

/**
 * Update a prescription template
 */
export function useUpdatePrescriptionTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreatePrescriptionTemplateRequest }) =>
      prescriptionTemplatesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: prescriptionKeys.templates() });
    },
  });
}

/**
 * Delete a prescription template
 */
export function useDeletePrescriptionTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => prescriptionTemplatesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: prescriptionKeys.templates() });
    },
  });
}

/**
 * Version History Hooks
 */

/**
 * Fetch all versions for a visit
 */
export function useVisitVersions(
  visitId: string,
  options?: Omit<UseQueryOptions<VisitVersion[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery<VisitVersion[]>({
    queryKey: visitKeys.versions(visitId),
    queryFn: () => visitVersionsApi.getByVisit(visitId),
    ...options,
  });
}

/**
 * Restore a visit to a previous version
 */
export function useRestoreVisitVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ visitId, versionId }: { visitId: string; versionId: string }) =>
      visitVersionsApi.restore(visitId, versionId),
    onSuccess: (restoredVisit) => {
      // Update the visit in cache
      queryClient.setQueryData(visitKeys.detail(restoredVisit.id), restoredVisit);

      // Invalidate versions to refetch history
      queryClient.invalidateQueries({ queryKey: visitKeys.versions(restoredVisit.id) });

      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: visitKeys.lists() });
    },
  });
}
