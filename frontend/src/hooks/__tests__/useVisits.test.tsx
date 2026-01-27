/**
 * useVisits Hook Tests
 *
 * Tests for visit and clinical documentation React Query hooks including
 * visits, diagnoses, prescriptions, templates, and version history.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  useVisits,
  useVisitSearch,
  useVisit,
  usePatientVisits,
  useVisitStatistics,
  useCreateVisit,
  useUpdateVisit,
  useDeleteVisit,
  useSignVisit,
  useLockVisit,
  useVisitDiagnoses,
  useICD10Search,
  useCreateVisitDiagnosis,
  useDeleteVisitDiagnosis,
  usePrescriptions,
  usePrescription,
  usePatientPrescriptions,
  useVisitPrescriptions,
  useMedicationSearch,
  useCreatePrescription,
  useUpdatePrescription,
  useDiscontinuePrescription,
  useCancelPrescription,
  useDeletePrescription,
  useVisitTemplates,
  usePrescriptionTemplates,
  useVisitVersions,
  visitKeys,
  prescriptionKeys,
} from '../useVisits';
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
  VisitListResponse,
  VisitStatistics,
  VisitTemplate,
  VisitVersion,
  VisitDiagnosis,
} from '@/types/visit';
import type {
  Prescription,
  PrescriptionListResponse,
  PrescriptionTemplate,
  MedicationSearchResult,
} from '@/types/prescription';

// Mock the APIs
vi.mock('@/services/api', () => ({
  visitsApi: {
    getAll: vi.fn(),
    search: vi.fn(),
    getById: vi.fn(),
    getByPatient: vi.fn(),
    getStatistics: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    sign: vi.fn(),
    lock: vi.fn(),
  },
  visitDiagnosesApi: {
    getByVisit: vi.fn(),
    searchICD10: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  prescriptionsApi: {
    getAll: vi.fn(),
    search: vi.fn(),
    getById: vi.fn(),
    getByPatient: vi.fn(),
    getByVisit: vi.fn(),
    searchMedications: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    discontinue: vi.fn(),
    cancel: vi.fn(),
    hold: vi.fn(),
    resume: vi.fn(),
    complete: vi.fn(),
    delete: vi.fn(),
    createCustomMedication: vi.fn(),
  },
  visitTemplatesApi: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  prescriptionTemplatesApi: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  visitVersionsApi: {
    getByVisit: vi.fn(),
    restore: vi.fn(),
  },
}));

// Mock data
const mockVisit: Visit = {
  id: 'visit-1',
  patient_id: 'patient-1',
  provider_id: 'provider-1',
  visit_date: '2024-01-01T10:00:00Z',
  visit_type: 'ROUTINE',
  status: 'DRAFT',
  chief_complaint: 'Annual checkup',
  created_at: '2024-01-01T10:00:00Z',
  updated_at: '2024-01-01T10:00:00Z',
};

const mockVisitList: VisitListResponse = {
  visits: [mockVisit],
  total: 1,
};

const mockStatistics: VisitStatistics = {
  total_visits: 500,
  by_status: { DRAFT: 50, SIGNED: 400, LOCKED: 50 },
  by_type: { ROUTINE: 300, FOLLOWUP: 150, EMERGENCY: 50 },
  this_month: 80,
  last_month: 75,
};

const mockDiagnosis: VisitDiagnosis = {
  id: 'diagnosis-1',
  visit_id: 'visit-1',
  icd10_code: 'J00',
  description: 'Acute nasopharyngitis',
  is_primary: true,
  created_at: '2024-01-01T10:00:00Z',
};

const mockPrescription: Prescription = {
  id: 'prescription-1',
  patient_id: 'patient-1',
  visit_id: 'visit-1',
  prescriber_id: 'provider-1',
  medication_name: 'Amoxicillin',
  dosage: '500mg',
  frequency: 'TID',
  duration_days: 7,
  status: 'ACTIVE',
  created_at: '2024-01-01T10:00:00Z',
  updated_at: '2024-01-01T10:00:00Z',
};

const mockPrescriptionList: PrescriptionListResponse = {
  prescriptions: [mockPrescription],
  total: 1,
};

const mockTemplate: VisitTemplate = {
  id: 'template-1',
  name: 'Standard Visit',
  content: {},
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockPrescriptionTemplate: PrescriptionTemplate = {
  id: 'rx-template-1',
  name: 'Antibiotic Course',
  medication_name: 'Amoxicillin',
  dosage: '500mg',
  frequency: 'TID',
  duration_days: 7,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockVersion: VisitVersion = {
  id: 'version-1',
  visit_id: 'visit-1',
  version_number: 1,
  content: mockVisit,
  created_at: '2024-01-01T10:00:00Z',
  created_by: 'provider-1',
};

const mockMedicationResult: MedicationSearchResult = {
  id: 'med-1',
  name: 'Amoxicillin 500mg',
  active_ingredient: 'Amoxicillin',
  atc_code: 'J01CA04',
  form: 'tablet',
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

describe('visitKeys', () => {
  it('should generate correct keys', () => {
    expect(visitKeys.all).toEqual(['visits']);
    expect(visitKeys.lists()).toEqual(['visits', 'list']);
    expect(visitKeys.details()).toEqual(['visits', 'detail']);
    expect(visitKeys.detail('id-1')).toEqual(['visits', 'detail', 'id-1']);
    expect(visitKeys.byPatient('patient-1')).toEqual(['visits', 'patient', 'patient-1']);
    expect(visitKeys.statistics()).toEqual(['visits', 'statistics']);
    expect(visitKeys.diagnoses('visit-1')).toEqual(['visits', 'detail', 'visit-1', 'diagnoses']);
    expect(visitKeys.templates()).toEqual(['visits', 'templates']);
    expect(visitKeys.versions('visit-1')).toEqual(['visits', 'detail', 'visit-1', 'versions']);
  });
});

describe('prescriptionKeys', () => {
  it('should generate correct keys', () => {
    expect(prescriptionKeys.all).toEqual(['prescriptions']);
    expect(prescriptionKeys.lists()).toEqual(['prescriptions', 'list']);
    expect(prescriptionKeys.details()).toEqual(['prescriptions', 'detail']);
    expect(prescriptionKeys.detail('id-1')).toEqual(['prescriptions', 'detail', 'id-1']);
    expect(prescriptionKeys.byPatient('patient-1')).toEqual([
      'prescriptions',
      'patient',
      'patient-1',
    ]);
    expect(prescriptionKeys.templates()).toEqual(['prescriptions', 'templates']);
  });
});

describe('useVisits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(visitsApi.getAll).mockResolvedValue(mockVisitList);
  });

  it('should fetch visits successfully', async () => {
    const { result } = renderHook(() => useVisits(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockVisitList);
    expect(visitsApi.getAll).toHaveBeenCalled();
  });
});

describe('useVisit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(visitsApi.getById).mockResolvedValue(mockVisit);
  });

  it('should fetch visit by id', async () => {
    const { result } = renderHook(() => useVisit('visit-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockVisit);
    expect(visitsApi.getById).toHaveBeenCalledWith('visit-1');
  });
});

describe('usePatientVisits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(visitsApi.getByPatient).mockResolvedValue(mockVisitList);
  });

  it('should fetch patient visits', async () => {
    const { result } = renderHook(() => usePatientVisits('patient-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockVisitList);
    expect(visitsApi.getByPatient).toHaveBeenCalledWith('patient-1', undefined);
  });
});

describe('useVisitStatistics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(visitsApi.getStatistics).mockResolvedValue(mockStatistics);
  });

  it('should fetch visit statistics', async () => {
    const { result } = renderHook(() => useVisitStatistics(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockStatistics);
  });
});

describe('useCreateVisit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(visitsApi.create).mockResolvedValue(mockVisit);
  });

  it('should create visit successfully', async () => {
    const { result } = renderHook(() => useCreateVisit(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      patient_id: 'patient-1',
      provider_id: 'provider-1',
      visit_date: '2024-01-01T10:00:00Z',
      visit_type: 'ROUTINE',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(visitsApi.create).toHaveBeenCalled();
  });
});

describe('useUpdateVisit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(visitsApi.update).mockResolvedValue(mockVisit);
  });

  it('should update visit successfully', async () => {
    const { result } = renderHook(() => useUpdateVisit(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      id: 'visit-1',
      data: { chief_complaint: 'Updated complaint' },
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(visitsApi.update).toHaveBeenCalledWith('visit-1', {
      chief_complaint: 'Updated complaint',
    });
  });
});

describe('useDeleteVisit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(visitsApi.delete).mockResolvedValue(undefined);
  });

  it('should delete visit successfully', async () => {
    const { result } = renderHook(() => useDeleteVisit(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('visit-1');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(visitsApi.delete).toHaveBeenCalledWith('visit-1');
  });
});

describe('useSignVisit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(visitsApi.sign).mockResolvedValue({ ...mockVisit, status: 'SIGNED' });
  });

  it('should sign visit successfully', async () => {
    const { result } = renderHook(() => useSignVisit(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ id: 'visit-1', data: { signature: 'signature-data' } });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(visitsApi.sign).toHaveBeenCalledWith('visit-1', { signature: 'signature-data' });
  });
});

describe('useLockVisit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(visitsApi.lock).mockResolvedValue({ ...mockVisit, status: 'LOCKED' });
  });

  it('should lock visit successfully', async () => {
    const { result } = renderHook(() => useLockVisit(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('visit-1');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(visitsApi.lock).toHaveBeenCalledWith('visit-1');
  });
});

describe('useVisitDiagnoses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(visitDiagnosesApi.getByVisit).mockResolvedValue([mockDiagnosis]);
  });

  it('should fetch visit diagnoses', async () => {
    const { result } = renderHook(() => useVisitDiagnoses('visit-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([mockDiagnosis]);
    expect(visitDiagnosesApi.getByVisit).toHaveBeenCalledWith('visit-1');
  });
});

describe('useICD10Search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(visitDiagnosesApi.searchICD10).mockResolvedValue([
      { code: 'J00', description: 'Acute nasopharyngitis' },
    ]);
  });

  it('should search ICD-10 codes', async () => {
    const { result } = renderHook(() => useICD10Search('J00'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(visitDiagnosesApi.searchICD10).toHaveBeenCalledWith('J00', undefined);
  });

  it('should not search with less than 2 characters', () => {
    const { result } = renderHook(() => useICD10Search('J'), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(visitDiagnosesApi.searchICD10).not.toHaveBeenCalled();
  });
});

describe('usePrescriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prescriptionsApi.getAll).mockResolvedValue(mockPrescriptionList);
  });

  it('should fetch prescriptions', async () => {
    const { result } = renderHook(() => usePrescriptions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockPrescriptionList);
  });
});

describe('usePrescription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prescriptionsApi.getById).mockResolvedValue(mockPrescription);
  });

  it('should fetch prescription by id', async () => {
    const { result } = renderHook(() => usePrescription('prescription-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockPrescription);
  });
});

describe('usePatientPrescriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prescriptionsApi.getByPatient).mockResolvedValue(mockPrescriptionList);
  });

  it('should fetch patient prescriptions', async () => {
    const { result } = renderHook(() => usePatientPrescriptions('patient-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockPrescriptionList);
  });
});

describe('useVisitPrescriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prescriptionsApi.getByVisit).mockResolvedValue([mockPrescription]);
  });

  it('should fetch visit prescriptions', async () => {
    const { result } = renderHook(() => useVisitPrescriptions('visit-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([mockPrescription]);
  });
});

describe('useMedicationSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prescriptionsApi.searchMedications).mockResolvedValue([mockMedicationResult]);
  });

  it('should search medications', async () => {
    const { result } = renderHook(() => useMedicationSearch('amox'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(prescriptionsApi.searchMedications).toHaveBeenCalledWith('amox', undefined);
  });

  it('should not search with less than 2 characters', () => {
    const { result } = renderHook(() => useMedicationSearch('a'), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useCreatePrescription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prescriptionsApi.create).mockResolvedValue(mockPrescription);
  });

  it('should create prescription successfully', async () => {
    const { result } = renderHook(() => useCreatePrescription(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      patient_id: 'patient-1',
      visit_id: 'visit-1',
      medication_name: 'Amoxicillin',
      dosage: '500mg',
      frequency: 'TID',
      duration_days: 7,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(prescriptionsApi.create).toHaveBeenCalled();
  });
});

describe('useDiscontinuePrescription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prescriptionsApi.discontinue).mockResolvedValue({
      ...mockPrescription,
      status: 'DISCONTINUED',
    });
  });

  it('should discontinue prescription successfully', async () => {
    const { result } = renderHook(() => useDiscontinuePrescription(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      id: 'prescription-1',
      data: { reason: 'Adverse reaction' },
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(prescriptionsApi.discontinue).toHaveBeenCalledWith('prescription-1', {
      reason: 'Adverse reaction',
    });
  });
});

describe('useCancelPrescription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prescriptionsApi.cancel).mockResolvedValue({
      ...mockPrescription,
      status: 'CANCELLED',
    });
  });

  it('should cancel prescription successfully', async () => {
    const { result } = renderHook(() => useCancelPrescription(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ id: 'prescription-1', data: { reason: 'Patient request' } });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(prescriptionsApi.cancel).toHaveBeenCalledWith('prescription-1', {
      reason: 'Patient request',
    });
  });
});

describe('useVisitTemplates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(visitTemplatesApi.getAll).mockResolvedValue([mockTemplate]);
  });

  it('should fetch visit templates', async () => {
    const { result } = renderHook(() => useVisitTemplates(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([mockTemplate]);
  });
});

describe('usePrescriptionTemplates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prescriptionTemplatesApi.getAll).mockResolvedValue([mockPrescriptionTemplate]);
  });

  it('should fetch prescription templates', async () => {
    const { result } = renderHook(() => usePrescriptionTemplates(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([mockPrescriptionTemplate]);
  });
});

describe('useVisitVersions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(visitVersionsApi.getByVisit).mockResolvedValue([mockVersion]);
  });

  it('should fetch visit versions', async () => {
    const { result } = renderHook(() => useVisitVersions('visit-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([mockVersion]);
    expect(visitVersionsApi.getByVisit).toHaveBeenCalledWith('visit-1');
  });
});
