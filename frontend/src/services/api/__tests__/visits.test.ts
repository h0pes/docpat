/**
 * Visits API Service Tests
 *
 * Tests for clinical documentation API endpoints including visits,
 * diagnoses, prescriptions, and templates.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  visitsApi,
  visitDiagnosesApi,
  prescriptionsApi,
  visitTemplatesApi,
  prescriptionTemplatesApi,
  visitVersionsApi,
} from '../visits';
import { apiClient } from '../axios-instance';
import type { Visit, VisitListResponse, VisitStatistics, VisitDiagnosis, VisitTemplate, VisitVersion } from '@/types/visit';
import type { Prescription, PrescriptionListResponse, PrescriptionTemplate, MedicationSearchResult } from '@/types/prescription';

// Mock the axios client
vi.mock('../axios-instance', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock visit data
const mockVisit: Visit = {
  id: 'visit-1',
  patient_id: 'patient-1',
  provider_id: 'provider-1',
  appointment_id: 'appointment-1',
  visit_date: '2024-01-15',
  visit_type: 'CONSULTATION',
  status: 'DRAFT',
  chief_complaint: 'Headache',
  subjective: 'Patient reports headache for 3 days',
  objective: 'Vital signs normal',
  assessment: 'Tension headache',
  plan: 'Rest and OTC pain relief',
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
};

const mockVisitListResponse: VisitListResponse = {
  visits: [mockVisit],
  total: 1,
  page: 1,
  page_size: 20,
};

const mockStatistics: VisitStatistics = {
  total_visits: 500,
  by_status: { DRAFT: 50, SIGNED: 400, LOCKED: 50 },
  by_type: { CONSULTATION: 200, FOLLOWUP: 150, PROCEDURE: 100, CHECKUP: 50 },
  visits_today: 10,
  visits_this_week: 50,
};

const mockDiagnosis: VisitDiagnosis = {
  id: 'diagnosis-1',
  visit_id: 'visit-1',
  icd10_code: 'J06.9',
  description: 'Acute upper respiratory infection',
  is_primary: true,
  created_at: '2024-01-15T10:00:00Z',
};

const mockPrescription: Prescription = {
  id: 'prescription-1',
  visit_id: 'visit-1',
  patient_id: 'patient-1',
  provider_id: 'provider-1',
  medication_name: 'Ibuprofen',
  dosage: '400mg',
  frequency: 'Every 8 hours',
  duration: '5 days',
  quantity: 15,
  refills: 0,
  instructions: 'Take with food',
  status: 'ACTIVE',
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
};

const mockPrescriptionListResponse: PrescriptionListResponse = {
  prescriptions: [mockPrescription],
  total: 1,
  page: 1,
  page_size: 20,
};

const mockVisitTemplate: VisitTemplate = {
  id: 'template-1',
  name: 'General Consultation',
  visit_type: 'CONSULTATION',
  subjective_template: 'Patient presents with...',
  objective_template: 'Physical examination...',
  assessment_template: 'Assessment...',
  plan_template: 'Plan...',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockPrescriptionTemplate: PrescriptionTemplate = {
  id: 'template-1',
  name: 'Pain Relief',
  medication_name: 'Ibuprofen',
  dosage: '400mg',
  frequency: 'Every 8 hours',
  duration: '5 days',
  instructions: 'Take with food',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockVisitVersion: VisitVersion = {
  id: 'version-1',
  visit_id: 'visit-1',
  version_number: 1,
  content: mockVisit,
  created_by: 'provider-1',
  created_at: '2024-01-15T10:00:00Z',
};

describe('visitsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should fetch all visits', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockVisitListResponse });

      const result = await visitsApi.getAll();

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/visits', { params: undefined });
      expect(result).toEqual(mockVisitListResponse);
    });

    it('should fetch visits with pagination', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockVisitListResponse });

      await visitsApi.getAll({ limit: 10, offset: 20 });

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/visits', {
        params: { limit: 10, offset: 20 },
      });
    });
  });

  describe('search', () => {
    it('should search visits with filters', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockVisitListResponse });

      await visitsApi.search({
        patient_id: 'patient-1',
        status: 'DRAFT',
        visit_type: 'CONSULTATION',
      });

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/visits', {
        params: {
          patient_id: 'patient-1',
          status: 'DRAFT',
          visit_type: 'CONSULTATION',
        },
      });
    });
  });

  describe('getById', () => {
    it('should fetch visit by ID', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockVisit });

      const result = await visitsApi.getById('visit-1');

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/visits/visit-1');
      expect(result).toEqual(mockVisit);
    });
  });

  describe('create', () => {
    it('should create visit successfully', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: mockVisit });

      const createData = {
        patient_id: 'patient-1',
        provider_id: 'provider-1',
        appointment_id: 'appointment-1',
        visit_date: '2024-01-15',
        visit_type: 'CONSULTATION' as const,
        chief_complaint: 'Headache',
      };

      const result = await visitsApi.create(createData);

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/visits', createData);
      expect(result).toEqual(mockVisit);
    });
  });

  describe('update', () => {
    it('should update visit successfully', async () => {
      const updatedVisit = { ...mockVisit, subjective: 'Updated notes' };
      vi.mocked(apiClient.put).mockResolvedValue({ data: updatedVisit });

      const result = await visitsApi.update('visit-1', { subjective: 'Updated notes' });

      expect(apiClient.put).toHaveBeenCalledWith('/api/v1/visits/visit-1', {
        subjective: 'Updated notes',
      });
      expect(result.subjective).toBe('Updated notes');
    });
  });

  describe('delete', () => {
    it('should delete visit successfully', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({ data: {} });

      await visitsApi.delete('visit-1');

      expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/visits/visit-1');
    });
  });

  describe('sign', () => {
    it('should sign visit successfully', async () => {
      const signedVisit = { ...mockVisit, status: 'SIGNED' as const };
      vi.mocked(apiClient.post).mockResolvedValue({ data: signedVisit });

      const result = await visitsApi.sign('visit-1', { password: 'password123' });

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/visits/visit-1/sign', {
        password: 'password123',
      });
      expect(result.status).toBe('SIGNED');
    });
  });

  describe('lock', () => {
    it('should lock visit successfully', async () => {
      const lockedVisit = { ...mockVisit, status: 'LOCKED' as const };
      vi.mocked(apiClient.post).mockResolvedValue({ data: lockedVisit });

      const result = await visitsApi.lock('visit-1');

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/visits/visit-1/lock');
      expect(result.status).toBe('LOCKED');
    });
  });

  describe('getByPatient', () => {
    it('should fetch visits for patient', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockVisitListResponse });

      const result = await visitsApi.getByPatient('patient-1');

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/patients/patient-1/visits', {
        params: undefined,
      });
      expect(result).toEqual(mockVisitListResponse);
    });
  });

  describe('getStatistics', () => {
    it('should fetch visit statistics', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockStatistics });

      const result = await visitsApi.getStatistics();

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/visits/statistics');
      expect(result).toEqual(mockStatistics);
    });
  });
});

describe('visitDiagnosesApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getByVisit', () => {
    it('should fetch diagnoses for visit', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: [mockDiagnosis] });

      const result = await visitDiagnosesApi.getByVisit('visit-1');

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/visits/visit-1/diagnoses');
      expect(result).toEqual([mockDiagnosis]);
    });
  });

  describe('create', () => {
    it('should create diagnosis successfully', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: mockDiagnosis });

      const result = await visitDiagnosesApi.create('visit-1', {
        icd10_code: 'J06.9',
        description: 'Acute upper respiratory infection',
        is_primary: true,
      });

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/visits/visit-1/diagnoses', {
        icd10_code: 'J06.9',
        description: 'Acute upper respiratory infection',
        is_primary: true,
      });
      expect(result).toEqual(mockDiagnosis);
    });
  });

  describe('update', () => {
    it('should update diagnosis successfully', async () => {
      const updatedDiagnosis = { ...mockDiagnosis, is_primary: false };
      vi.mocked(apiClient.put).mockResolvedValue({ data: updatedDiagnosis });

      const result = await visitDiagnosesApi.update('visit-1', 'diagnosis-1', {
        is_primary: false,
      });

      expect(apiClient.put).toHaveBeenCalledWith('/api/v1/visits/visit-1/diagnoses/diagnosis-1', {
        is_primary: false,
      });
      expect(result.is_primary).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete diagnosis successfully', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({ data: {} });

      await visitDiagnosesApi.delete('visit-1', 'diagnosis-1');

      expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/visits/visit-1/diagnoses/diagnosis-1');
    });
  });

  describe('searchICD10', () => {
    it('should search ICD-10 codes', async () => {
      const mockResults = [
        { code: 'J06.9', description: 'Acute upper respiratory infection' },
        { code: 'J06.0', description: 'Acute laryngopharyngitis' },
      ];
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockResults });

      const result = await visitDiagnosesApi.searchICD10('J06', 10);

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/diagnoses/search', {
        params: { query: 'J06', limit: 10 },
      });
      expect(result).toEqual(mockResults);
    });
  });
});

describe('prescriptionsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should fetch all prescriptions', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockPrescriptionListResponse });

      const result = await prescriptionsApi.getAll();

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/prescriptions', { params: undefined });
      expect(result).toEqual(mockPrescriptionListResponse);
    });
  });

  describe('search', () => {
    it('should search prescriptions with filters', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockPrescriptionListResponse });

      await prescriptionsApi.search({
        patient_id: 'patient-1',
        status: 'ACTIVE',
      });

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/prescriptions', {
        params: { patient_id: 'patient-1', status: 'ACTIVE' },
      });
    });
  });

  describe('getById', () => {
    it('should fetch prescription by ID', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockPrescription });

      const result = await prescriptionsApi.getById('prescription-1');

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/prescriptions/prescription-1');
      expect(result).toEqual(mockPrescription);
    });
  });

  describe('create', () => {
    it('should create prescription successfully', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: mockPrescription });

      const createData = {
        visit_id: 'visit-1',
        patient_id: 'patient-1',
        medication_name: 'Ibuprofen',
        dosage: '400mg',
        frequency: 'Every 8 hours',
        duration: '5 days',
        quantity: 15,
      };

      const result = await prescriptionsApi.create(createData);

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/prescriptions', createData);
      expect(result).toEqual(mockPrescription);
    });
  });

  describe('update', () => {
    it('should update prescription successfully', async () => {
      const updatedPrescription = { ...mockPrescription, dosage: '600mg' };
      vi.mocked(apiClient.put).mockResolvedValue({ data: updatedPrescription });

      const result = await prescriptionsApi.update('prescription-1', { dosage: '600mg' });

      expect(apiClient.put).toHaveBeenCalledWith('/api/v1/prescriptions/prescription-1', {
        dosage: '600mg',
      });
      expect(result.dosage).toBe('600mg');
    });
  });

  describe('discontinue', () => {
    it('should discontinue prescription', async () => {
      const discontinuedPrescription = { ...mockPrescription, status: 'DISCONTINUED' as const };
      vi.mocked(apiClient.post).mockResolvedValue({ data: discontinuedPrescription });

      const result = await prescriptionsApi.discontinue('prescription-1', {
        reason: 'Patient request',
      });

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/prescriptions/prescription-1/discontinue', {
        reason: 'Patient request',
      });
      expect(result.status).toBe('DISCONTINUED');
    });
  });

  describe('cancel', () => {
    it('should cancel prescription', async () => {
      const cancelledPrescription = { ...mockPrescription, status: 'CANCELLED' as const };
      vi.mocked(apiClient.post).mockResolvedValue({ data: cancelledPrescription });

      const result = await prescriptionsApi.cancel('prescription-1');

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/prescriptions/prescription-1/cancel', {});
      expect(result.status).toBe('CANCELLED');
    });
  });

  describe('hold', () => {
    it('should put prescription on hold', async () => {
      const heldPrescription = { ...mockPrescription, status: 'ON_HOLD' as const };
      vi.mocked(apiClient.post).mockResolvedValue({ data: heldPrescription });

      const result = await prescriptionsApi.hold('prescription-1', {
        reason: 'Lab work needed',
      });

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/prescriptions/prescription-1/hold', {
        reason: 'Lab work needed',
      });
      expect(result.status).toBe('ON_HOLD');
    });
  });

  describe('resume', () => {
    it('should resume prescription', async () => {
      const resumedPrescription = { ...mockPrescription, status: 'ACTIVE' as const };
      vi.mocked(apiClient.post).mockResolvedValue({ data: resumedPrescription });

      const result = await prescriptionsApi.resume('prescription-1');

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/prescriptions/prescription-1/resume');
      expect(result.status).toBe('ACTIVE');
    });
  });

  describe('complete', () => {
    it('should mark prescription as completed', async () => {
      const completedPrescription = { ...mockPrescription, status: 'COMPLETED' as const };
      vi.mocked(apiClient.post).mockResolvedValue({ data: completedPrescription });

      const result = await prescriptionsApi.complete('prescription-1');

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/prescriptions/prescription-1/complete');
      expect(result.status).toBe('COMPLETED');
    });
  });

  describe('delete', () => {
    it('should delete prescription', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({ data: {} });

      await prescriptionsApi.delete('prescription-1');

      expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/prescriptions/prescription-1');
    });
  });

  describe('getByPatient', () => {
    it('should fetch prescriptions for patient', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockPrescriptionListResponse });

      await prescriptionsApi.getByPatient('patient-1');

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/prescriptions', {
        params: { patient_id: 'patient-1' },
      });
    });
  });

  describe('getByVisit', () => {
    it('should fetch prescriptions for visit', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: [mockPrescription] });

      const result = await prescriptionsApi.getByVisit('visit-1');

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/visits/visit-1/prescriptions');
      expect(result).toEqual([mockPrescription]);
    });
  });

  describe('searchMedications', () => {
    it('should search medications', async () => {
      const mockMedications: MedicationSearchResult[] = [
        { id: '1', name: 'Ibuprofen', form: 'Tablet', strength: '400mg' },
        { id: '2', name: 'Ibuprofen', form: 'Capsule', strength: '200mg' },
      ];
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockMedications });

      const result = await prescriptionsApi.searchMedications('Ibuprofen', 10);

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/prescriptions/medications/search', {
        params: { query: 'Ibuprofen', limit: 10 },
      });
      expect(result).toEqual(mockMedications);
    });
  });

  describe('createCustomMedication', () => {
    it('should create custom medication', async () => {
      const mockResponse = { id: 'custom-1', message: 'Medication created' };
      vi.mocked(apiClient.post).mockResolvedValue({ data: mockResponse });

      const result = await prescriptionsApi.createCustomMedication({
        name: 'Custom Med',
        form: 'Tablet',
        strength: '100mg',
      });

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/prescriptions/medications/custom', {
        name: 'Custom Med',
        form: 'Tablet',
        strength: '100mg',
      });
      expect(result).toEqual(mockResponse);
    });
  });
});

describe('visitTemplatesApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should fetch all visit templates', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: [mockVisitTemplate] });

      const result = await visitTemplatesApi.getAll();

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/visit-templates');
      expect(result).toEqual([mockVisitTemplate]);
    });
  });

  describe('getById', () => {
    it('should fetch template by ID', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockVisitTemplate });

      const result = await visitTemplatesApi.getById('template-1');

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/visit-templates/template-1');
      expect(result).toEqual(mockVisitTemplate);
    });
  });

  describe('create', () => {
    it('should create template successfully', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: mockVisitTemplate });

      const createData = {
        name: 'General Consultation',
        visit_type: 'CONSULTATION' as const,
        subjective_template: 'Patient presents with...',
      };

      const result = await visitTemplatesApi.create(createData);

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/visit-templates', createData);
      expect(result).toEqual(mockVisitTemplate);
    });
  });

  describe('update', () => {
    it('should update template successfully', async () => {
      const updatedTemplate = { ...mockVisitTemplate, name: 'Updated Name' };
      vi.mocked(apiClient.put).mockResolvedValue({ data: updatedTemplate });

      const result = await visitTemplatesApi.update('template-1', { name: 'Updated Name' });

      expect(apiClient.put).toHaveBeenCalledWith('/api/v1/visit-templates/template-1', {
        name: 'Updated Name',
      });
      expect(result.name).toBe('Updated Name');
    });
  });

  describe('delete', () => {
    it('should delete template successfully', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({ data: {} });

      await visitTemplatesApi.delete('template-1');

      expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/visit-templates/template-1');
    });
  });
});

describe('prescriptionTemplatesApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should fetch all prescription templates', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: [mockPrescriptionTemplate] });

      const result = await prescriptionTemplatesApi.getAll();

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/prescription-templates');
      expect(result).toEqual([mockPrescriptionTemplate]);
    });
  });

  describe('getById', () => {
    it('should fetch template by ID', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockPrescriptionTemplate });

      const result = await prescriptionTemplatesApi.getById('template-1');

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/prescription-templates/template-1');
      expect(result).toEqual(mockPrescriptionTemplate);
    });
  });

  describe('create', () => {
    it('should create template successfully', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: mockPrescriptionTemplate });

      const createData = {
        name: 'Pain Relief',
        medication_name: 'Ibuprofen',
        dosage: '400mg',
        frequency: 'Every 8 hours',
      };

      const result = await prescriptionTemplatesApi.create(createData);

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/prescription-templates', createData);
      expect(result).toEqual(mockPrescriptionTemplate);
    });
  });

  describe('update', () => {
    it('should update template successfully', async () => {
      const updatedTemplate = { ...mockPrescriptionTemplate, dosage: '600mg' };
      vi.mocked(apiClient.put).mockResolvedValue({ data: updatedTemplate });

      const result = await prescriptionTemplatesApi.update('template-1', { dosage: '600mg' });

      expect(apiClient.put).toHaveBeenCalledWith('/api/v1/prescription-templates/template-1', {
        dosage: '600mg',
      });
      expect(result.dosage).toBe('600mg');
    });
  });

  describe('delete', () => {
    it('should delete template successfully', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({ data: {} });

      await prescriptionTemplatesApi.delete('template-1');

      expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/prescription-templates/template-1');
    });
  });
});

describe('visitVersionsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getByVisit', () => {
    it('should fetch versions for visit', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: [mockVisitVersion] });

      const result = await visitVersionsApi.getByVisit('visit-1');

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/visits/visit-1/versions');
      expect(result).toEqual([mockVisitVersion]);
    });
  });

  describe('getVersion', () => {
    it('should fetch specific version', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockVisitVersion });

      const result = await visitVersionsApi.getVersion('visit-1', 'version-1');

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/visits/visit-1/versions/version-1');
      expect(result).toEqual(mockVisitVersion);
    });
  });

  describe('restore', () => {
    it('should restore visit to previous version', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: mockVisit });

      const result = await visitVersionsApi.restore('visit-1', 'version-1');

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/visits/visit-1/versions/version-1/restore');
      expect(result).toEqual(mockVisit);
    });
  });
});
