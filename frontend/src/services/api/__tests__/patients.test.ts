/**
 * Patients API Service Tests
 *
 * Tests for patient management API endpoints including CRUD operations,
 * search, insurance, and photo upload.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { patientsApi } from '../patients';
import { apiClient } from '../axios-instance';
import type { Patient, PatientListResponse, PatientStatistics } from '@/types/patient';
import type { PatientInsurance } from '@/types/patientInsurance';

// Mock the axios client
vi.mock('../axios-instance', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock patient data
const mockPatient: Patient = {
  id: 'patient-1',
  first_name: 'John',
  last_name: 'Doe',
  date_of_birth: '1990-05-15',
  gender: 'male',
  email: 'john.doe@example.com',
  phone: '+1234567890',
  address: '123 Main St',
  city: 'New York',
  state: 'NY',
  zip_code: '10001',
  country: 'USA',
  emergency_contact_name: 'Jane Doe',
  emergency_contact_phone: '+1234567891',
  blood_type: 'O+',
  allergies: ['Penicillin'],
  chronic_conditions: ['Hypertension'],
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockPatientList: PatientListResponse = {
  patients: [mockPatient],
  total: 1,
  page: 1,
  page_size: 20,
};

const mockStatistics: PatientStatistics = {
  total_patients: 100,
  active_patients: 85,
  inactive_patients: 15,
  new_this_month: 10,
  gender_distribution: {
    male: 45,
    female: 50,
    other: 5,
  },
  age_distribution: {
    '0-17': 10,
    '18-35': 30,
    '36-55': 35,
    '56+': 25,
  },
};

const mockInsurance: PatientInsurance = {
  id: 'insurance-1',
  patient_id: 'patient-1',
  provider_name: 'Blue Cross',
  policy_number: 'BC123456',
  group_number: 'GRP001',
  subscriber_name: 'John Doe',
  subscriber_relationship: 'self',
  effective_date: '2024-01-01',
  expiration_date: '2024-12-31',
  is_primary: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('patientsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should fetch all patients with default params', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockPatientList });

      const result = await patientsApi.getAll();

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/patients', {
        params: {
          limit: 20,
          offset: 0,
        },
      });
      expect(result).toEqual(mockPatientList);
    });

    it('should fetch patients with custom pagination', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockPatientList });

      await patientsApi.getAll({ limit: 10, offset: 20 });

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/patients', {
        params: {
          limit: 10,
          offset: 20,
        },
      });
    });

    it('should handle fetch error', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Network error'));

      await expect(patientsApi.getAll()).rejects.toThrow('Network error');
    });
  });

  describe('search', () => {
    it('should search patients with filters', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockPatientList });

      const filters = {
        query: 'John',
        gender: 'male',
        is_active: true,
        limit: 10,
        offset: 0,
      };

      const result = await patientsApi.search(filters);

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/patients/search', {
        params: filters,
      });
      expect(result).toEqual(mockPatientList);
    });

    it('should handle search error', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Search failed'));

      await expect(patientsApi.search({ query: 'test' })).rejects.toThrow('Search failed');
    });
  });

  describe('getById', () => {
    it('should fetch patient by ID', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockPatient });

      const result = await patientsApi.getById('patient-1');

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/patients/patient-1');
      expect(result).toEqual(mockPatient);
    });

    it('should handle patient not found', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Patient not found'));

      await expect(patientsApi.getById('invalid-id')).rejects.toThrow('Patient not found');
    });
  });

  describe('create', () => {
    it('should create patient successfully', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: mockPatient });

      const createData = {
        first_name: 'John',
        last_name: 'Doe',
        date_of_birth: '1990-05-15',
        gender: 'male' as const,
        email: 'john.doe@example.com',
        phone: '+1234567890',
      };

      const result = await patientsApi.create(createData);

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/patients', createData);
      expect(result).toEqual(mockPatient);
    });

    it('should handle validation error', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Invalid email format'));

      await expect(
        patientsApi.create({
          first_name: 'John',
          last_name: 'Doe',
          date_of_birth: '1990-05-15',
          gender: 'male',
          email: 'invalid-email',
        })
      ).rejects.toThrow('Invalid email format');
    });
  });

  describe('update', () => {
    it('should update patient successfully', async () => {
      const updatedPatient = { ...mockPatient, first_name: 'Jane' };
      vi.mocked(apiClient.put).mockResolvedValue({ data: updatedPatient });

      const result = await patientsApi.update('patient-1', { first_name: 'Jane' });

      expect(apiClient.put).toHaveBeenCalledWith('/api/v1/patients/patient-1', {
        first_name: 'Jane',
      });
      expect(result.first_name).toBe('Jane');
    });

    it('should handle update error', async () => {
      vi.mocked(apiClient.put).mockRejectedValue(new Error('Update failed'));

      await expect(
        patientsApi.update('patient-1', { first_name: 'Jane' })
      ).rejects.toThrow('Update failed');
    });
  });

  describe('delete', () => {
    it('should delete patient successfully', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({ data: {} });

      await patientsApi.delete('patient-1');

      expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/patients/patient-1');
    });

    it('should handle delete error', async () => {
      vi.mocked(apiClient.delete).mockRejectedValue(new Error('Cannot delete patient'));

      await expect(patientsApi.delete('patient-1')).rejects.toThrow('Cannot delete patient');
    });
  });

  describe('reactivate', () => {
    it('should reactivate patient successfully', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: {} });

      await patientsApi.reactivate('patient-1');

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/patients/patient-1/reactivate');
    });

    it('should handle reactivation error', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Patient already active'));

      await expect(patientsApi.reactivate('patient-1')).rejects.toThrow('Patient already active');
    });
  });

  describe('getStatistics', () => {
    it('should fetch patient statistics', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockStatistics });

      const result = await patientsApi.getStatistics();

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/patients/statistics');
      expect(result).toEqual(mockStatistics);
    });

    it('should handle statistics fetch error', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Failed to fetch statistics'));

      await expect(patientsApi.getStatistics()).rejects.toThrow('Failed to fetch statistics');
    });
  });

  describe('getInsurance', () => {
    it('should fetch patient insurance', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: [mockInsurance] });

      const result = await patientsApi.getInsurance('patient-1');

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/patients/patient-1/insurance');
      expect(result).toEqual([mockInsurance]);
    });

    it('should return empty array when no insurance', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: [] });

      const result = await patientsApi.getInsurance('patient-1');

      expect(result).toEqual([]);
    });
  });

  describe('addInsurance', () => {
    it('should add insurance successfully', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: mockInsurance });

      const insuranceData = {
        patient_id: 'patient-1',
        provider_name: 'Blue Cross',
        policy_number: 'BC123456',
        subscriber_name: 'John Doe',
        subscriber_relationship: 'self' as const,
        effective_date: '2024-01-01',
        is_primary: true,
      };

      const result = await patientsApi.addInsurance(insuranceData);

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/patients/insurance', insuranceData);
      expect(result).toEqual(mockInsurance);
    });

    it('should handle add insurance error', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Invalid policy number'));

      await expect(
        patientsApi.addInsurance({
          patient_id: 'patient-1',
          provider_name: 'Test',
          policy_number: '',
          subscriber_name: 'John',
          subscriber_relationship: 'self',
          effective_date: '2024-01-01',
          is_primary: true,
        })
      ).rejects.toThrow('Invalid policy number');
    });
  });

  describe('updateInsurance', () => {
    it('should update insurance successfully', async () => {
      const updatedInsurance = { ...mockInsurance, policy_number: 'BC999999' };
      vi.mocked(apiClient.put).mockResolvedValue({ data: updatedInsurance });

      const result = await patientsApi.updateInsurance('insurance-1', {
        policy_number: 'BC999999',
      });

      expect(apiClient.put).toHaveBeenCalledWith('/api/v1/patients/insurance/insurance-1', {
        policy_number: 'BC999999',
      });
      expect(result.policy_number).toBe('BC999999');
    });
  });

  describe('deleteInsurance', () => {
    it('should delete insurance successfully', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({ data: {} });

      await patientsApi.deleteInsurance('insurance-1');

      expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/patients/insurance/insurance-1');
    });
  });

  describe('uploadPhoto', () => {
    it('should upload photo successfully', async () => {
      const photoUrl = { photo_url: 'https://example.com/photo.jpg' };
      vi.mocked(apiClient.post).mockResolvedValue({ data: photoUrl });

      const file = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' });
      const result = await patientsApi.uploadPhoto('patient-1', file);

      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/v1/patients/patient-1/photo',
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      expect(result).toEqual(photoUrl);
    });

    it('should handle upload error', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('File too large'));

      const file = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' });

      await expect(patientsApi.uploadPhoto('patient-1', file)).rejects.toThrow('File too large');
    });
  });

  describe('deletePhoto', () => {
    it('should delete photo successfully', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({ data: {} });

      await patientsApi.deletePhoto('patient-1');

      expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/patients/patient-1/photo');
    });
  });
});
