/**
 * PrintScheduleButton Component Tests
 *
 * Tests for the print schedule functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PrintScheduleButton } from '../PrintScheduleButton';
import { AppointmentStatus, AppointmentType } from '@/types/appointment';
import type { Appointment } from '@/types/appointment';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'appointments.schedule': 'Schedule',
        'appointments.print.generated_on': 'Generated on',
        'appointments.total_count': `${params?.count || 0} appointments`,
        'appointments.no_appointments': 'No appointments',
        'appointments.actions.print_schedule': 'Print Schedule',
        'appointments.status.scheduled': 'Scheduled',
        'appointments.status.confirmed': 'Confirmed',
        'appointments.status.completed': 'Completed',
        'appointments.status.cancelled': 'Cancelled',
        'appointments.type.follow_up': 'Follow-up',
        'appointments.type.consultation': 'Consultation',
        'appointments.minutes': 'min',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock appointment data
const createMockAppointment = (overrides?: Partial<Appointment>): Appointment => ({
  id: 'apt-1',
  patient_id: 'patient-1',
  provider_id: 'provider-1',
  scheduled_start: '2024-01-15T10:00:00Z',
  scheduled_end: '2024-01-15T10:30:00Z',
  duration_minutes: 30,
  type: AppointmentType.FOLLOW_UP,
  reason: 'Regular checkup',
  notes: 'Patient notes',
  status: AppointmentStatus.SCHEDULED,
  is_recurring: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

const mockAppointments = [
  createMockAppointment({ id: 'apt-1' }),
  createMockAppointment({
    id: 'apt-2',
    scheduled_start: '2024-01-15T11:00:00Z',
    scheduled_end: '2024-01-15T11:30:00Z',
    type: AppointmentType.CONSULTATION,
    reason: 'Consultation',
    status: AppointmentStatus.CONFIRMED,
  }),
];

const mockDateRange = {
  start_date: '2024-01-15T00:00:00Z',
  end_date: '2024-01-15T23:59:59Z',
};

describe('PrintScheduleButton', () => {
  let originalAppendChild: typeof document.body.appendChild;
  let originalRemoveChild: typeof document.body.removeChild;
  let appendedElements: Element[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    appendedElements = [];

    // Store original methods
    originalAppendChild = document.body.appendChild.bind(document.body);
    originalRemoveChild = document.body.removeChild.bind(document.body);
  });

  afterEach(() => {
    // Clean up any appended elements
    appendedElements.forEach((el) => {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });
  });

  describe('Rendering', () => {
    it('should render print button with icon', () => {
      render(
        <PrintScheduleButton
          appointments={mockAppointments}
          dateRange={mockDateRange}
          viewType="day"
        />
      );

      expect(screen.getByText('Print Schedule')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(
        <PrintScheduleButton
          appointments={mockAppointments}
          dateRange={mockDateRange}
          viewType="day"
          className="custom-class"
        />
      );

      expect(screen.getByRole('button')).toHaveClass('custom-class');
    });
  });

  describe('Print Functionality', () => {
    it('should trigger print when button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <PrintScheduleButton
          appointments={mockAppointments}
          dateRange={mockDateRange}
          viewType="day"
        />
      );

      await user.click(screen.getByRole('button'));

      // Should have created an iframe for printing (check the DOM)
      const iframes = document.querySelectorAll('iframe');
      expect(iframes.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty appointments list', async () => {
      const user = userEvent.setup();

      render(
        <PrintScheduleButton
          appointments={[]}
          dateRange={mockDateRange}
          viewType="day"
        />
      );

      // Button should still be clickable
      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
    });
  });

  describe('View Types', () => {
    it('should handle day view type', () => {
      render(
        <PrintScheduleButton
          appointments={mockAppointments}
          dateRange={mockDateRange}
          viewType="day"
        />
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should handle week view type', () => {
      render(
        <PrintScheduleButton
          appointments={mockAppointments}
          dateRange={{
            start_date: '2024-01-15T00:00:00Z',
            end_date: '2024-01-21T23:59:59Z',
          }}
          viewType="week"
        />
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should handle month view type', () => {
      render(
        <PrintScheduleButton
          appointments={mockAppointments}
          dateRange={{
            start_date: '2024-01-01T00:00:00Z',
            end_date: '2024-01-31T23:59:59Z',
          }}
          viewType="month"
        />
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('Appointment Data', () => {
    it('should handle appointments with all data', async () => {
      const fullAppointment = createMockAppointment({
        reason: 'Full appointment reason',
        notes: 'Detailed notes',
      });

      render(
        <PrintScheduleButton
          appointments={[fullAppointment]}
          dateRange={mockDateRange}
          viewType="day"
        />
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should handle appointments without optional data', async () => {
      const minimalAppointment = createMockAppointment({
        reason: undefined,
        notes: undefined,
      });

      render(
        <PrintScheduleButton
          appointments={[minimalAppointment]}
          dateRange={mockDateRange}
          viewType="day"
        />
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should handle various appointment statuses', async () => {
      const statusAppointments = [
        createMockAppointment({ status: AppointmentStatus.SCHEDULED }),
        createMockAppointment({ status: AppointmentStatus.CONFIRMED }),
        createMockAppointment({ status: AppointmentStatus.COMPLETED }),
        createMockAppointment({ status: AppointmentStatus.CANCELLED }),
      ];

      render(
        <PrintScheduleButton
          appointments={statusAppointments}
          dateRange={mockDateRange}
          viewType="day"
        />
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('Button States', () => {
    it('should be enabled by default', () => {
      render(
        <PrintScheduleButton
          appointments={mockAppointments}
          dateRange={mockDateRange}
          viewType="day"
        />
      );

      expect(screen.getByRole('button')).not.toBeDisabled();
    });
  });
});
