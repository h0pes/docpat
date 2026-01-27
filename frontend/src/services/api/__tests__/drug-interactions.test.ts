/**
 * Drug Interactions API Service Tests
 *
 * Tests for drug-drug interaction checking API endpoints.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { drugInteractionsApi } from '../drug-interactions';
import { apiClient } from '../axios-instance';
import type { CheckInteractionsResponse, InteractionStatistics } from '@/types/prescription';

// Mock the axios client
vi.mock('../axios-instance', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

// Mock interaction data
const mockInteraction = {
  id: 'interaction-1',
  drug_a: {
    atc_code: 'A01AA01',
    name: 'Aspirin',
  },
  drug_b: {
    atc_code: 'A01AA02',
    name: 'Ibuprofen',
  },
  severity: 'MODERATE',
  description: 'Concurrent use may increase bleeding risk',
  mechanism: 'Both drugs inhibit platelet aggregation',
  clinical_effects: 'Increased risk of gastrointestinal bleeding',
  management: 'Consider alternative therapies. Monitor for signs of bleeding.',
};

const mockInteractionsResponse: CheckInteractionsResponse = {
  interactions: [mockInteraction],
  total_interactions: 1,
  by_severity: {
    MINOR: 0,
    MODERATE: 1,
    MAJOR: 0,
    CONTRAINDICATED: 0,
  },
  checked_medications: [
    { atc_code: 'A01AA01', name: 'Aspirin' },
    { atc_code: 'A01AA02', name: 'Ibuprofen' },
  ],
};

const mockEmptyResponse: CheckInteractionsResponse = {
  interactions: [],
  total_interactions: 0,
  by_severity: {
    MINOR: 0,
    MODERATE: 0,
    MAJOR: 0,
    CONTRAINDICATED: 0,
  },
  checked_medications: [],
};

const mockStatistics: InteractionStatistics = {
  total_interactions_in_database: 50000,
  by_severity: {
    MINOR: 15000,
    MODERATE: 25000,
    MAJOR: 8000,
    CONTRAINDICATED: 2000,
  },
  total_drugs: 3000,
  last_updated: '2024-01-01T00:00:00Z',
};

describe('drugInteractionsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkInteractions', () => {
    it('should check interactions between medications', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: mockInteractionsResponse });

      const result = await drugInteractionsApi.checkInteractions({
        atc_codes: ['A01AA01', 'A01AA02'],
      });

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/drug-interactions/check', {
        atc_codes: ['A01AA01', 'A01AA02'],
      });
      expect(result).toEqual(mockInteractionsResponse);
      expect(result.total_interactions).toBe(1);
    });

    it('should return empty response when no interactions found', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: mockEmptyResponse });

      const result = await drugInteractionsApi.checkInteractions({
        atc_codes: ['A01AA01', 'B01AA01'],
      });

      expect(result.interactions).toEqual([]);
      expect(result.total_interactions).toBe(0);
    });

    it('should handle check error', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Invalid ATC code'));

      await expect(
        drugInteractionsApi.checkInteractions({ atc_codes: ['INVALID'] })
      ).rejects.toThrow('Invalid ATC code');
    });

    it('should handle multiple medications', async () => {
      const responseWithMultiple = {
        ...mockInteractionsResponse,
        total_interactions: 3,
        interactions: [mockInteraction, mockInteraction, mockInteraction],
      };
      vi.mocked(apiClient.post).mockResolvedValue({ data: responseWithMultiple });

      const result = await drugInteractionsApi.checkInteractions({
        atc_codes: ['A01AA01', 'A01AA02', 'A01AA03', 'A01AA04'],
      });

      expect(result.total_interactions).toBe(3);
    });
  });

  describe('checkNewMedication', () => {
    it('should check interactions for new medication against existing regimen', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: mockInteractionsResponse });

      const result = await drugInteractionsApi.checkNewMedication({
        new_atc_code: 'A01AA02',
        existing_atc_codes: ['A01AA01', 'B01AA01'],
      });

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/drug-interactions/check-new', {
        new_atc_code: 'A01AA02',
        existing_atc_codes: ['A01AA01', 'B01AA01'],
      });
      expect(result).toEqual(mockInteractionsResponse);
    });

    it('should return no interactions when new med is safe', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: mockEmptyResponse });

      const result = await drugInteractionsApi.checkNewMedication({
        new_atc_code: 'C01AA01',
        existing_atc_codes: ['D01AA01'],
      });

      expect(result.interactions).toEqual([]);
    });

    it('should handle empty existing regimen', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: mockEmptyResponse });

      const result = await drugInteractionsApi.checkNewMedication({
        new_atc_code: 'A01AA01',
        existing_atc_codes: [],
      });

      expect(result.interactions).toEqual([]);
    });
  });

  describe('checkNewMedicationForPatient', () => {
    it('should check interactions for new medication for patient', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: mockInteractionsResponse });

      const result = await drugInteractionsApi.checkNewMedicationForPatient({
        medication_name: 'Ibuprofen',
        patient_id: 'patient-1',
      });

      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/v1/drug-interactions/check-new-for-patient',
        {
          medication_name: 'Ibuprofen',
          patient_id: 'patient-1',
        }
      );
      expect(result).toEqual(mockInteractionsResponse);
    });

    it('should handle medication name fuzzy matching', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: mockInteractionsResponse });

      await drugInteractionsApi.checkNewMedicationForPatient({
        medication_name: 'ibuprofene', // Italian spelling
        patient_id: 'patient-1',
      });

      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/v1/drug-interactions/check-new-for-patient',
        {
          medication_name: 'ibuprofene',
          patient_id: 'patient-1',
        }
      );
    });

    it('should handle patient not found', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Patient not found'));

      await expect(
        drugInteractionsApi.checkNewMedicationForPatient({
          medication_name: 'Aspirin',
          patient_id: 'invalid-patient',
        })
      ).rejects.toThrow('Patient not found');
    });

    it('should handle unknown medication', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Medication not found in database'));

      await expect(
        drugInteractionsApi.checkNewMedicationForPatient({
          medication_name: 'Unknown Drug XYZ',
          patient_id: 'patient-1',
        })
      ).rejects.toThrow('Medication not found in database');
    });
  });

  describe('checkPatientInteractions', () => {
    it('should check interactions for patient active prescriptions', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockInteractionsResponse });

      const result = await drugInteractionsApi.checkPatientInteractions('patient-1');

      expect(apiClient.get).toHaveBeenCalledWith(
        '/api/v1/drug-interactions/patient/patient-1',
        { params: {} }
      );
      expect(result).toEqual(mockInteractionsResponse);
    });

    it('should check interactions with minimum severity filter', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockInteractionsResponse });

      await drugInteractionsApi.checkPatientInteractions('patient-1', 'MODERATE');

      expect(apiClient.get).toHaveBeenCalledWith(
        '/api/v1/drug-interactions/patient/patient-1',
        { params: { min_severity: 'MODERATE' } }
      );
    });

    it('should filter by MAJOR severity', async () => {
      const majorOnlyResponse = {
        ...mockInteractionsResponse,
        interactions: [{ ...mockInteraction, severity: 'MAJOR' }],
        by_severity: { MINOR: 0, MODERATE: 0, MAJOR: 1, CONTRAINDICATED: 0 },
      };
      vi.mocked(apiClient.get).mockResolvedValue({ data: majorOnlyResponse });

      const result = await drugInteractionsApi.checkPatientInteractions('patient-1', 'MAJOR');

      expect(result.by_severity.MAJOR).toBe(1);
      expect(result.by_severity.MODERATE).toBe(0);
    });

    it('should return empty when patient has no interactions', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockEmptyResponse });

      const result = await drugInteractionsApi.checkPatientInteractions('patient-2');

      expect(result.interactions).toEqual([]);
      expect(result.total_interactions).toBe(0);
    });

    it('should handle patient not found', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Patient not found'));

      await expect(
        drugInteractionsApi.checkPatientInteractions('invalid-patient')
      ).rejects.toThrow('Patient not found');
    });
  });

  describe('getStatistics', () => {
    it('should fetch interaction database statistics', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockStatistics });

      const result = await drugInteractionsApi.getStatistics();

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/drug-interactions/statistics');
      expect(result).toEqual(mockStatistics);
    });

    it('should include severity breakdown', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockStatistics });

      const result = await drugInteractionsApi.getStatistics();

      expect(result.by_severity).toBeDefined();
      expect(result.by_severity.MINOR).toBe(15000);
      expect(result.by_severity.CONTRAINDICATED).toBe(2000);
    });

    it('should include total drugs count', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockStatistics });

      const result = await drugInteractionsApi.getStatistics();

      expect(result.total_drugs).toBe(3000);
    });

    it('should include last updated timestamp', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockStatistics });

      const result = await drugInteractionsApi.getStatistics();

      expect(result.last_updated).toBe('2024-01-01T00:00:00Z');
    });

    it('should handle fetch error', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Service unavailable'));

      await expect(drugInteractionsApi.getStatistics()).rejects.toThrow('Service unavailable');
    });
  });
});
