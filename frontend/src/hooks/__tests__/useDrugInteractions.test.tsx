/**
 * useDrugInteractions Hook Tests
 *
 * Tests for drug interaction checking React Query hooks.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  usePatientDrugInteractions,
  useDrugInteractions,
  useCheckNewMedication,
  useCheckNewMedicationForPatient,
  useDrugInteractionStatistics,
  drugInteractionKeys,
} from '../useDrugInteractions';
import { drugInteractionsApi } from '@/services/api';
import type {
  CheckInteractionsResponse,
  InteractionStatistics,
} from '@/types/prescription';

// Mock the drug interactions API
vi.mock('@/services/api', () => ({
  drugInteractionsApi: {
    checkPatientInteractions: vi.fn(),
    checkInteractions: vi.fn(),
    checkNewMedication: vi.fn(),
    checkNewMedicationForPatient: vi.fn(),
    getStatistics: vi.fn(),
  },
}));

// Mock data
const mockInteractionsResponse: CheckInteractionsResponse = {
  interactions: [
    {
      drug_a: 'A01AA01',
      drug_b: 'B02BC01',
      severity: 'MODERATE',
      description: 'May increase bleeding risk',
      mechanism: 'CYP450 interaction',
      recommendation: 'Monitor closely',
    },
  ],
  total_interactions: 1,
  has_severe: false,
  has_moderate: true,
};

const mockStatistics: InteractionStatistics = {
  total_drugs: 5000,
  total_interactions: 10000,
  by_severity: { SEVERE: 2000, MODERATE: 5000, MINOR: 3000 },
  database_version: 'DDInter 2.0',
  last_updated: '2024-01-01T00:00:00Z',
};

/**
 * Create a test query client
 */
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Wrapper component for tests
 */
function createWrapper() {
  const queryClient = createTestQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('drugInteractionKeys', () => {
  it('should generate correct keys', () => {
    expect(drugInteractionKeys.all).toEqual(['drug-interactions']);
    expect(drugInteractionKeys.patient('patient-1')).toEqual([
      'drug-interactions',
      'patient',
      'patient-1',
    ]);
    expect(drugInteractionKeys.statistics()).toEqual(['drug-interactions', 'statistics']);
  });

  it('should generate correct check key with sorted ATC codes', () => {
    const atcCodes = ['C01AA01', 'A01BC02', 'B03AB04'];
    // Keys should be sorted for consistent caching
    expect(drugInteractionKeys.check(atcCodes)).toEqual([
      'drug-interactions',
      'check',
      'A01BC02-B03AB04-C01AA01',
    ]);
  });
});

describe('usePatientDrugInteractions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(drugInteractionsApi.checkPatientInteractions).mockResolvedValue(
      mockInteractionsResponse
    );
  });

  it('should fetch patient drug interactions', async () => {
    const { result } = renderHook(() => usePatientDrugInteractions('patient-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockInteractionsResponse);
    expect(drugInteractionsApi.checkPatientInteractions).toHaveBeenCalledWith(
      'patient-1',
      undefined
    );
  });

  it('should fetch with minimum severity filter', async () => {
    const { result } = renderHook(
      () => usePatientDrugInteractions('patient-1', 'MODERATE'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(drugInteractionsApi.checkPatientInteractions).toHaveBeenCalledWith(
      'patient-1',
      'MODERATE'
    );
  });

  it('should not fetch when patientId is undefined', () => {
    const { result } = renderHook(() => usePatientDrugInteractions(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(drugInteractionsApi.checkPatientInteractions).not.toHaveBeenCalled();
  });

  it('should handle fetch error', async () => {
    vi.mocked(drugInteractionsApi.checkPatientInteractions).mockRejectedValue(
      new Error('Network error')
    );

    const { result } = renderHook(() => usePatientDrugInteractions('patient-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useDrugInteractions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(drugInteractionsApi.checkInteractions).mockResolvedValue(mockInteractionsResponse);
  });

  it('should check interactions for ATC codes', async () => {
    const request = { atc_codes: ['A01AA01', 'B02BC01'] };

    const { result } = renderHook(() => useDrugInteractions(request), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockInteractionsResponse);
    expect(drugInteractionsApi.checkInteractions).toHaveBeenCalledWith(request);
  });

  it('should not fetch when request is null', () => {
    const { result } = renderHook(() => useDrugInteractions(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(drugInteractionsApi.checkInteractions).not.toHaveBeenCalled();
  });

  it('should not fetch when ATC codes array is empty', () => {
    const { result } = renderHook(() => useDrugInteractions({ atc_codes: [] }), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(drugInteractionsApi.checkInteractions).not.toHaveBeenCalled();
  });
});

describe('useCheckNewMedication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(drugInteractionsApi.checkNewMedication).mockResolvedValue(mockInteractionsResponse);
  });

  it('should check new medication interactions', async () => {
    const { result } = renderHook(() => useCheckNewMedication(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      new_atc_code: 'C01AA01',
      existing_atc_codes: ['A01AA01', 'B02BC01'],
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(drugInteractionsApi.checkNewMedication).toHaveBeenCalledWith({
      new_atc_code: 'C01AA01',
      existing_atc_codes: ['A01AA01', 'B02BC01'],
    });
  });

  it('should handle mutation error', async () => {
    vi.mocked(drugInteractionsApi.checkNewMedication).mockRejectedValue(
      new Error('Check failed')
    );

    const { result } = renderHook(() => useCheckNewMedication(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      new_atc_code: 'INVALID',
      existing_atc_codes: [],
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useCheckNewMedicationForPatient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(drugInteractionsApi.checkNewMedicationForPatient).mockResolvedValue(
      mockInteractionsResponse
    );
  });

  it('should check new medication for patient', async () => {
    const { result } = renderHook(() => useCheckNewMedicationForPatient(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      patient_id: 'patient-1',
      medication_name: 'Aspirin',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(drugInteractionsApi.checkNewMedicationForPatient).toHaveBeenCalledWith({
      patient_id: 'patient-1',
      medication_name: 'Aspirin',
    });
  });
});

describe('useDrugInteractionStatistics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(drugInteractionsApi.getStatistics).mockResolvedValue(mockStatistics);
  });

  it('should fetch drug interaction statistics', async () => {
    const { result } = renderHook(() => useDrugInteractionStatistics(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockStatistics);
    expect(drugInteractionsApi.getStatistics).toHaveBeenCalled();
  });
});
