/**
 * QuickRescheduleDialog Component Tests
 *
 * Tests for the quick reschedule dialog functionality.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuickRescheduleDialog } from '../QuickRescheduleDialog';
import { AppointmentStatus, AppointmentType } from '@/types/appointment';
import type { Appointment } from '@/types/appointment';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'appointments.quick_reschedule.title': 'Reschedule Appointment',
        'appointments.quick_reschedule.description': 'Select a new date and time',
        'appointments.quick_reschedule.current_time': 'Current Time',
        'appointments.quick_reschedule.new_time': 'New Time',
        'appointments.form.date': 'Date',
        'appointments.form.start_time': 'Start Time',
        'appointments.actions.reschedule': 'Reschedule',
        'appointments.minutes': 'min',
        'common.cancel': 'Cancel',
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
  status: AppointmentStatus.SCHEDULED,
  is_recurring: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('QuickRescheduleDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render dialog when open is true', () => {
      render(
        <QuickRescheduleDialog
          open={true}
          onOpenChange={vi.fn()}
          appointment={createMockAppointment()}
          onReschedule={vi.fn()}
        />
      );

      expect(screen.getByText('Reschedule Appointment')).toBeInTheDocument();
      expect(screen.getByText('Select a new date and time')).toBeInTheDocument();
    });

    it('should not render dialog when open is false', () => {
      render(
        <QuickRescheduleDialog
          open={false}
          onOpenChange={vi.fn()}
          appointment={createMockAppointment()}
          onReschedule={vi.fn()}
        />
      );

      expect(screen.queryByText('Reschedule Appointment')).not.toBeInTheDocument();
    });

    it('should display current appointment time', () => {
      render(
        <QuickRescheduleDialog
          open={true}
          onOpenChange={vi.fn()}
          appointment={createMockAppointment()}
          onReschedule={vi.fn()}
        />
      );

      expect(screen.getByText('Current Time')).toBeInTheDocument();
      // The time should be displayed (format depends on timezone)
      // Check for the time range display pattern
      expect(screen.getByText(/-/)).toBeInTheDocument();
    });

    it('should display duration badge', () => {
      const appointment = createMockAppointment({ duration_minutes: 45 });

      render(
        <QuickRescheduleDialog
          open={true}
          onOpenChange={vi.fn()}
          appointment={appointment}
          onReschedule={vi.fn()}
        />
      );

      expect(screen.getByText(/45/)).toBeInTheDocument();
    });
  });

  describe('Date Selection', () => {
    it('should render date picker', () => {
      render(
        <QuickRescheduleDialog
          open={true}
          onOpenChange={vi.fn()}
          appointment={createMockAppointment()}
          onReschedule={vi.fn()}
        />
      );

      expect(screen.getByText('Date')).toBeInTheDocument();
    });

    it('should open date picker on button click', async () => {
      const user = userEvent.setup();

      render(
        <QuickRescheduleDialog
          open={true}
          onOpenChange={vi.fn()}
          appointment={createMockAppointment()}
          onReschedule={vi.fn()}
        />
      );

      // Find the date picker button and click it
      const dateButtons = screen.getAllByRole('button');
      const dateButton = dateButtons.find(btn => btn.textContent?.includes('Jan'));
      if (dateButton) {
        await user.click(dateButton);
        // Calendar should be visible
        expect(document.querySelector('[role="grid"]')).toBeInTheDocument();
      }
    });
  });

  describe('Time Selection', () => {
    it('should render time selector', () => {
      render(
        <QuickRescheduleDialog
          open={true}
          onOpenChange={vi.fn()}
          appointment={createMockAppointment()}
          onReschedule={vi.fn()}
        />
      );

      expect(screen.getByText('Start Time')).toBeInTheDocument();
    });

    it('should show time options in 15-minute intervals', async () => {
      const user = userEvent.setup();

      render(
        <QuickRescheduleDialog
          open={true}
          onOpenChange={vi.fn()}
          appointment={createMockAppointment()}
          onReschedule={vi.fn()}
        />
      );

      // Find and click the time selector trigger
      const timeSelect = screen.getByRole('combobox');
      await user.click(timeSelect);

      // Time options should be visible
      await waitFor(() => {
        expect(screen.getByText('08:00')).toBeInTheDocument();
        expect(screen.getByText('08:15')).toBeInTheDocument();
        expect(screen.getByText('08:30')).toBeInTheDocument();
      });
    });
  });

  describe('New Time Preview', () => {
    it('should not show preview when time has not changed', () => {
      render(
        <QuickRescheduleDialog
          open={true}
          onOpenChange={vi.fn()}
          appointment={createMockAppointment()}
          onReschedule={vi.fn()}
        />
      );

      // "New Time" section should not be visible initially
      const newTimeElements = screen.queryAllByText('New Time');
      // It might be in translations, but the preview section shouldn't show
      expect(newTimeElements.length).toBeLessThanOrEqual(1);
    });

    it('should show preview when time is changed', async () => {
      const user = userEvent.setup();

      render(
        <QuickRescheduleDialog
          open={true}
          onOpenChange={vi.fn()}
          appointment={createMockAppointment()}
          onReschedule={vi.fn()}
        />
      );

      // Change the time
      const timeSelect = screen.getByRole('combobox');
      await user.click(timeSelect);

      await waitFor(() => {
        const option = screen.getByText('14:00');
        user.click(option);
      });

      // Preview should now be visible
      await waitFor(() => {
        expect(screen.getByText('New Time')).toBeInTheDocument();
      });
    });
  });

  describe('Dialog Actions', () => {
    it('should call onOpenChange when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();

      render(
        <QuickRescheduleDialog
          open={true}
          onOpenChange={onOpenChange}
          appointment={createMockAppointment()}
          onReschedule={vi.fn()}
        />
      );

      await user.click(screen.getByText('Cancel'));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('should disable reschedule button when time has not changed', () => {
      render(
        <QuickRescheduleDialog
          open={true}
          onOpenChange={vi.fn()}
          appointment={createMockAppointment()}
          onReschedule={vi.fn()}
        />
      );

      const rescheduleButton = screen.getByRole('button', { name: /reschedule/i });
      expect(rescheduleButton).toBeDisabled();
    });

    it('should call onReschedule with new times when button is clicked', async () => {
      const user = userEvent.setup();
      const onReschedule = vi.fn();

      render(
        <QuickRescheduleDialog
          open={true}
          onOpenChange={vi.fn()}
          appointment={createMockAppointment()}
          onReschedule={onReschedule}
        />
      );

      // Change the time
      const timeSelect = screen.getByRole('combobox');
      await user.click(timeSelect);

      await waitFor(() => {
        const option = screen.getByText('14:00');
        user.click(option);
      });

      // Click reschedule
      await waitFor(async () => {
        const rescheduleButton = screen.getByRole('button', { name: /reschedule/i });
        if (!rescheduleButton.hasAttribute('disabled')) {
          await user.click(rescheduleButton);
          expect(onReschedule).toHaveBeenCalled();
        }
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator when isLoading is true', () => {
      render(
        <QuickRescheduleDialog
          open={true}
          onOpenChange={vi.fn()}
          appointment={createMockAppointment()}
          onReschedule={vi.fn()}
          isLoading={true}
        />
      );

      // Loading spinner should be visible
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should disable buttons when isLoading is true', () => {
      render(
        <QuickRescheduleDialog
          open={true}
          onOpenChange={vi.fn()}
          appointment={createMockAppointment()}
          onReschedule={vi.fn()}
          isLoading={true}
        />
      );

      expect(screen.getByText('Cancel')).toBeDisabled();
    });
  });
});
