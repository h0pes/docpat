/**
 * Appointments API Service Tests
 *
 * Tests for appointment management API endpoints including scheduling,
 * availability checking, and appointment lifecycle management.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { appointmentsApi } from '../appointments';
import { apiClient } from '../axios-instance';
import type {
  Appointment,
  AppointmentListResponse,
  AppointmentStatistics,
  AvailabilityResponse,
  DailyScheduleResponse,
  WeeklyScheduleResponse,
  MonthlyScheduleResponse,
} from '@/types/appointment';

// Mock the axios client
vi.mock('../axios-instance', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

// Mock appointment data
const mockAppointment: Appointment = {
  id: 'appointment-1',
  patient_id: 'patient-1',
  provider_id: 'provider-1',
  appointment_date: '2024-01-15',
  start_time: '09:00',
  end_time: '09:30',
  duration_minutes: 30,
  status: 'scheduled',
  appointment_type: 'consultation',
  reason: 'Regular checkup',
  notes: '',
  patient: {
    id: 'patient-1',
    first_name: 'John',
    last_name: 'Doe',
  },
  provider: {
    id: 'provider-1',
    first_name: 'Dr. Jane',
    last_name: 'Smith',
  },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockAppointmentList: AppointmentListResponse = {
  appointments: [mockAppointment],
  total: 1,
  page: 1,
  page_size: 20,
};

const mockStatistics: AppointmentStatistics = {
  total_appointments: 100,
  scheduled: 60,
  completed: 30,
  cancelled: 10,
  no_show: 5,
  today_appointments: 8,
  upcoming_appointments: 25,
  average_duration: 25,
  by_type: {
    consultation: 50,
    followup: 30,
    procedure: 20,
  },
};

const mockAvailability: AvailabilityResponse = {
  provider_id: 'provider-1',
  date: '2024-01-15',
  available_slots: [
    { start_time: '09:00', end_time: '09:30' },
    { start_time: '10:00', end_time: '10:30' },
    { start_time: '14:00', end_time: '14:30' },
  ],
};

const mockDailySchedule: DailyScheduleResponse = {
  date: '2024-01-15',
  appointments: [mockAppointment],
};

const mockWeeklySchedule: WeeklyScheduleResponse = {
  start_date: '2024-01-15',
  end_date: '2024-01-21',
  days: [
    { date: '2024-01-15', appointments: [mockAppointment] },
  ],
};

const mockMonthlySchedule: MonthlyScheduleResponse = {
  year: 2024,
  month: 1,
  days: [
    { date: '2024-01-15', appointment_count: 1 },
  ],
};

describe('appointmentsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should fetch all appointments', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockAppointmentList });

      const result = await appointmentsApi.getAll();

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/appointments', {
        params: undefined,
      });
      expect(result).toEqual(mockAppointmentList);
    });

    it('should fetch appointments with pagination', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockAppointmentList });

      await appointmentsApi.getAll({ limit: 10, offset: 20 });

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/appointments', {
        params: { limit: 10, offset: 20 },
      });
    });

    it('should handle fetch error', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Network error'));

      await expect(appointmentsApi.getAll()).rejects.toThrow('Network error');
    });
  });

  describe('search', () => {
    it('should search appointments with filters', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockAppointmentList });

      const filters = {
        patient_id: 'patient-1',
        status: 'scheduled' as const,
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      };

      const result = await appointmentsApi.search(filters);

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/appointments', {
        params: filters,
      });
      expect(result).toEqual(mockAppointmentList);
    });
  });

  describe('getById', () => {
    it('should fetch appointment by ID', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockAppointment });

      const result = await appointmentsApi.getById('appointment-1');

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/appointments/appointment-1');
      expect(result).toEqual(mockAppointment);
    });

    it('should handle appointment not found', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Appointment not found'));

      await expect(appointmentsApi.getById('invalid-id')).rejects.toThrow('Appointment not found');
    });
  });

  describe('create', () => {
    it('should create appointment successfully', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: mockAppointment });

      const createData = {
        patient_id: 'patient-1',
        provider_id: 'provider-1',
        appointment_date: '2024-01-15',
        start_time: '09:00',
        duration_minutes: 30,
        appointment_type: 'consultation' as const,
        reason: 'Regular checkup',
      };

      const result = await appointmentsApi.create(createData);

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/appointments', createData);
      expect(result).toEqual(mockAppointment);
    });

    it('should handle time slot conflict', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Time slot already booked'));

      await expect(
        appointmentsApi.create({
          patient_id: 'patient-1',
          provider_id: 'provider-1',
          appointment_date: '2024-01-15',
          start_time: '09:00',
          duration_minutes: 30,
          appointment_type: 'consultation',
        })
      ).rejects.toThrow('Time slot already booked');
    });
  });

  describe('update', () => {
    it('should update appointment successfully', async () => {
      const updatedAppointment = { ...mockAppointment, notes: 'Updated notes' };
      vi.mocked(apiClient.put).mockResolvedValue({ data: updatedAppointment });

      const result = await appointmentsApi.update('appointment-1', {
        notes: 'Updated notes',
      });

      expect(apiClient.put).toHaveBeenCalledWith('/api/v1/appointments/appointment-1', {
        notes: 'Updated notes',
      });
      expect(result.notes).toBe('Updated notes');
    });

    it('should handle update error', async () => {
      vi.mocked(apiClient.put).mockRejectedValue(new Error('Cannot update past appointments'));

      await expect(
        appointmentsApi.update('appointment-1', { notes: 'test' })
      ).rejects.toThrow('Cannot update past appointments');
    });
  });

  describe('cancel', () => {
    it('should cancel appointment successfully', async () => {
      const cancelledAppointment = { ...mockAppointment, status: 'cancelled' as const };
      vi.mocked(apiClient.post).mockResolvedValue({ data: cancelledAppointment });

      const result = await appointmentsApi.cancel('appointment-1', {
        reason: 'Patient request',
      });

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/appointments/appointment-1/cancel', {
        reason: 'Patient request',
      });
      expect(result.status).toBe('cancelled');
    });

    it('should handle cancellation error', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Appointment already cancelled'));

      await expect(
        appointmentsApi.cancel('appointment-1', { reason: 'test' })
      ).rejects.toThrow('Appointment already cancelled');
    });
  });

  describe('checkAvailability', () => {
    it('should check availability successfully', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockAvailability });

      const result = await appointmentsApi.checkAvailability(
        'provider-1',
        '2024-01-15',
        30
      );

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/appointments/availability', {
        params: {
          provider_id: 'provider-1',
          date: '2024-01-15',
          duration_minutes: 30,
        },
      });
      expect(result.available_slots).toHaveLength(3);
    });

    it('should handle no availability', async () => {
      const emptyAvailability = { ...mockAvailability, available_slots: [] };
      vi.mocked(apiClient.get).mockResolvedValue({ data: emptyAvailability });

      const result = await appointmentsApi.checkAvailability('provider-1', '2024-01-15', 30);

      expect(result.available_slots).toHaveLength(0);
    });
  });

  describe('getStatistics', () => {
    it('should fetch appointment statistics', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockStatistics });

      const result = await appointmentsApi.getStatistics();

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/appointments/statistics');
      expect(result).toEqual(mockStatistics);
    });
  });

  describe('getDailySchedule', () => {
    it('should fetch daily schedule', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockDailySchedule });

      const result = await appointmentsApi.getDailySchedule('2024-01-15');

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/appointments/schedule/daily', {
        params: { date: '2024-01-15' },
      });
      expect(result.date).toBe('2024-01-15');
    });
  });

  describe('getWeeklySchedule', () => {
    it('should fetch weekly schedule', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockWeeklySchedule });

      const result = await appointmentsApi.getWeeklySchedule('2024-01-15');

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/appointments/schedule/weekly', {
        params: { start_date: '2024-01-15' },
      });
      expect(result.days).toHaveLength(1);
    });
  });

  describe('getMonthlySchedule', () => {
    it('should fetch monthly schedule', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockMonthlySchedule });

      const result = await appointmentsApi.getMonthlySchedule(2024, 1);

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/appointments/schedule/monthly', {
        params: { year: 2024, month: 1 },
      });
      expect(result.year).toBe(2024);
      expect(result.month).toBe(1);
    });
  });

  describe('getByPatient', () => {
    it('should fetch appointments for a patient', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockAppointmentList });

      const result = await appointmentsApi.getByPatient('patient-1');

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/appointments', {
        params: { patient_id: 'patient-1' },
      });
      expect(result).toEqual(mockAppointmentList);
    });

    it('should fetch patient appointments with pagination', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockAppointmentList });

      await appointmentsApi.getByPatient('patient-1', { limit: 10, offset: 5 });

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/appointments', {
        params: { patient_id: 'patient-1', limit: 10, offset: 5 },
      });
    });
  });

  describe('getByDateRange', () => {
    it('should fetch appointments for date range', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockAppointmentList });

      const result = await appointmentsApi.getByDateRange('2024-01-01', '2024-01-31');

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/appointments', {
        params: { start_date: '2024-01-01', end_date: '2024-01-31' },
      });
      expect(result).toEqual(mockAppointmentList);
    });
  });
});
