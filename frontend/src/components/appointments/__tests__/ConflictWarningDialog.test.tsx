/**
 * ConflictWarningDialog Component Tests
 *
 * Comprehensive test suite for ConflictWarningDialog component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConflictWarningDialog } from '../ConflictWarningDialog';
import {
  Appointment,
  AppointmentStatus,
  AppointmentType,
} from '@/types/appointment';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'appointments.messages.conflictWarning': 'Scheduling Conflict Detected',
        'appointments.messages.conflictWarningDescription':
          'The selected time slot overlaps with existing appointments',
        'appointments.proposed_time': 'Proposed Time',
        'appointments.conflicting_appointments': 'Conflicting Appointments',
        'appointments.conflict_warning_message':
          'Scheduling this appointment will create a double-booking. Please review the conflicts.',
        'appointments.proceed_anyway': 'Proceed Anyway',
        'appointments.status.scheduled': 'Scheduled',
        'appointments.status.confirmed': 'Confirmed',
        'common.cancel': 'Cancel',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock conflicting appointment data
const createMockConflict = (overrides?: Partial<Appointment>): Appointment => ({
  id: 'conflict-123',
  patient_id: 'patient-456',
  provider_id: 'provider-789',
  scheduled_start: '2025-12-01T10:00:00Z',
  scheduled_end: '2025-12-01T10:30:00Z',
  duration_minutes: 30,
  type: AppointmentType.FOLLOW_UP,
  reason: 'Follow-up consultation',
  status: AppointmentStatus.CONFIRMED,
  confirmation_code: 'APT-2025-002',
  is_recurring: false,
  reminder_sent_email: false,
  reminder_sent_sms: false,
  reminder_sent_whatsapp: false,
  created_at: '2025-11-01T10:00:00Z',
  updated_at: '2025-11-01T10:00:00Z',
  ...overrides,
});

describe('ConflictWarningDialog', () => {
  const proposedStart = new Date('2025-12-01T10:15:00Z');
  const proposedEnd = new Date('2025-12-01T10:45:00Z');

  describe('Basic Rendering', () => {
    it('renders dialog when open is true', () => {
      const conflicts = [createMockConflict()];
      const onProceed = vi.fn();
      const onCancel = vi.fn();
      const onOpenChange = vi.fn();

      render(
        <ConflictWarningDialog
          open={true}
          onOpenChange={onOpenChange}
          conflicts={conflicts}
          proposedStart={proposedStart}
          proposedEnd={proposedEnd}
          onProceed={onProceed}
          onCancel={onCancel}
        />
      );

      expect(screen.getByText('Scheduling Conflict Detected')).toBeInTheDocument();
    });

    it('does not render dialog when open is false', () => {
      const conflicts = [createMockConflict()];
      const onProceed = vi.fn();
      const onCancel = vi.fn();
      const onOpenChange = vi.fn();

      render(
        <ConflictWarningDialog
          open={false}
          onOpenChange={onOpenChange}
          conflicts={conflicts}
          proposedStart={proposedStart}
          proposedEnd={proposedEnd}
          onProceed={onProceed}
          onCancel={onCancel}
        />
      );

      expect(screen.queryByText('Scheduling Conflict Detected')).not.toBeInTheDocument();
    });

    it('displays warning description', () => {
      const conflicts = [createMockConflict()];
      const onProceed = vi.fn();
      const onCancel = vi.fn();
      const onOpenChange = vi.fn();

      render(
        <ConflictWarningDialog
          open={true}
          onOpenChange={onOpenChange}
          conflicts={conflicts}
          proposedStart={proposedStart}
          proposedEnd={proposedEnd}
          onProceed={onProceed}
          onCancel={onCancel}
        />
      );

      expect(
        screen.getByText('The selected time slot overlaps with existing appointments')
      ).toBeInTheDocument();
    });

    it('displays proposed time section', () => {
      const conflicts = [createMockConflict()];
      const onProceed = vi.fn();
      const onCancel = vi.fn();
      const onOpenChange = vi.fn();

      render(
        <ConflictWarningDialog
          open={true}
          onOpenChange={onOpenChange}
          conflicts={conflicts}
          proposedStart={proposedStart}
          proposedEnd={proposedEnd}
          onProceed={onProceed}
          onCancel={onCancel}
        />
      );

      expect(screen.getByText('Proposed Time')).toBeInTheDocument();
    });

    it('displays warning message', () => {
      const conflicts = [createMockConflict()];
      const onProceed = vi.fn();
      const onCancel = vi.fn();
      const onOpenChange = vi.fn();

      render(
        <ConflictWarningDialog
          open={true}
          onOpenChange={onOpenChange}
          conflicts={conflicts}
          proposedStart={proposedStart}
          proposedEnd={proposedEnd}
          onProceed={onProceed}
          onCancel={onCancel}
        />
      );

      expect(
        screen.getByText(/Scheduling this appointment will create a double-booking/)
      ).toBeInTheDocument();
    });
  });

  describe('Conflict Display', () => {
    it('displays count of conflicting appointments', () => {
      const conflicts = [
        createMockConflict(),
        createMockConflict({
          id: 'conflict-456',
          scheduled_start: '2025-12-01T10:20:00Z',
          scheduled_end: '2025-12-01T10:50:00Z',
        }),
      ];
      const onProceed = vi.fn();
      const onCancel = vi.fn();
      const onOpenChange = vi.fn();

      render(
        <ConflictWarningDialog
          open={true}
          onOpenChange={onOpenChange}
          conflicts={conflicts}
          proposedStart={proposedStart}
          proposedEnd={proposedEnd}
          onProceed={onProceed}
          onCancel={onCancel}
        />
      );

      expect(screen.getByText(/Conflicting Appointments.*\(2\)/)).toBeInTheDocument();
    });

    it('displays conflict time ranges', () => {
      const conflicts = [createMockConflict()];
      const onProceed = vi.fn();
      const onCancel = vi.fn();
      const onOpenChange = vi.fn();

      render(
        <ConflictWarningDialog
          open={true}
          onOpenChange={onOpenChange}
          conflicts={conflicts}
          proposedStart={proposedStart}
          proposedEnd={proposedEnd}
          onProceed={onProceed}
          onCancel={onCancel}
        />
      );

      // Time will be formatted as HH:mm - HH:mm (timezone may affect exact time displayed)
      // Use getAllByText as there may be multiple time ranges displayed (proposed + conflicts)
      const timeRanges = screen.getAllByText(/\d{1,2}:\d{2} - \d{1,2}:\d{2}/);
      expect(timeRanges.length).toBeGreaterThan(0);
    });

    it('displays conflict status badges', () => {
      const conflicts = [
        createMockConflict({ status: AppointmentStatus.CONFIRMED }),
      ];
      const onProceed = vi.fn();
      const onCancel = vi.fn();
      const onOpenChange = vi.fn();

      render(
        <ConflictWarningDialog
          open={true}
          onOpenChange={onOpenChange}
          conflicts={conflicts}
          proposedStart={proposedStart}
          proposedEnd={proposedEnd}
          onProceed={onProceed}
          onCancel={onCancel}
        />
      );

      expect(screen.getByText('Confirmed')).toBeInTheDocument();
    });

    it('displays conflict reason when available', () => {
      const conflicts = [
        createMockConflict({ reason: 'Follow-up consultation' }),
      ];
      const onProceed = vi.fn();
      const onCancel = vi.fn();
      const onOpenChange = vi.fn();

      render(
        <ConflictWarningDialog
          open={true}
          onOpenChange={onOpenChange}
          conflicts={conflicts}
          proposedStart={proposedStart}
          proposedEnd={proposedEnd}
          onProceed={onProceed}
          onCancel={onCancel}
        />
      );

      expect(screen.getByText('Follow-up consultation')).toBeInTheDocument();
    });

    it('does not display reason when not available', () => {
      const conflicts = [
        createMockConflict({ reason: undefined }),
      ];
      const onProceed = vi.fn();
      const onCancel = vi.fn();
      const onOpenChange = vi.fn();

      render(
        <ConflictWarningDialog
          open={true}
          onOpenChange={onOpenChange}
          conflicts={conflicts}
          proposedStart={proposedStart}
          proposedEnd={proposedEnd}
          onProceed={onProceed}
          onCancel={onCancel}
        />
      );

      expect(screen.queryByText('Follow-up consultation')).not.toBeInTheDocument();
    });

    it('displays multiple conflicts correctly', () => {
      const conflicts = [
        createMockConflict({
          id: 'conflict-1',
          scheduled_start: '2025-12-01T10:00:00Z',
          scheduled_end: '2025-12-01T10:30:00Z',
          reason: 'First conflict',
        }),
        createMockConflict({
          id: 'conflict-2',
          scheduled_start: '2025-12-01T10:20:00Z',
          scheduled_end: '2025-12-01T10:50:00Z',
          reason: 'Second conflict',
        }),
        createMockConflict({
          id: 'conflict-3',
          scheduled_start: '2025-12-01T10:30:00Z',
          scheduled_end: '2025-12-01T11:00:00Z',
          reason: 'Third conflict',
        }),
      ];
      const onProceed = vi.fn();
      const onCancel = vi.fn();
      const onOpenChange = vi.fn();

      render(
        <ConflictWarningDialog
          open={true}
          onOpenChange={onOpenChange}
          conflicts={conflicts}
          proposedStart={proposedStart}
          proposedEnd={proposedEnd}
          onProceed={onProceed}
          onCancel={onCancel}
        />
      );

      expect(screen.getByText('First conflict')).toBeInTheDocument();
      expect(screen.getByText('Second conflict')).toBeInTheDocument();
      expect(screen.getByText('Third conflict')).toBeInTheDocument();
      expect(screen.getByText(/Conflicting Appointments.*\(3\)/)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('calls onCancel when Cancel button is clicked', async () => {
      const user = userEvent.setup();
      const conflicts = [createMockConflict()];
      const onProceed = vi.fn();
      const onCancel = vi.fn();
      const onOpenChange = vi.fn();

      render(
        <ConflictWarningDialog
          open={true}
          onOpenChange={onOpenChange}
          conflicts={conflicts}
          proposedStart={proposedStart}
          proposedEnd={proposedEnd}
          onProceed={onProceed}
          onCancel={onCancel}
        />
      );

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('calls onProceed when Proceed Anyway button is clicked', async () => {
      const user = userEvent.setup();
      const conflicts = [createMockConflict()];
      const onProceed = vi.fn();
      const onCancel = vi.fn();
      const onOpenChange = vi.fn();

      render(
        <ConflictWarningDialog
          open={true}
          onOpenChange={onOpenChange}
          conflicts={conflicts}
          proposedStart={proposedStart}
          proposedEnd={proposedEnd}
          onProceed={onProceed}
          onCancel={onCancel}
        />
      );

      const proceedButton = screen.getByText('Proceed Anyway');
      await user.click(proceedButton);

      expect(onProceed).toHaveBeenCalledTimes(1);
    });

    it('does not call callbacks on initial render', () => {
      const conflicts = [createMockConflict()];
      const onProceed = vi.fn();
      const onCancel = vi.fn();
      const onOpenChange = vi.fn();

      render(
        <ConflictWarningDialog
          open={true}
          onOpenChange={onOpenChange}
          conflicts={conflicts}
          proposedStart={proposedStart}
          proposedEnd={proposedEnd}
          onProceed={onProceed}
          onCancel={onCancel}
        />
      );

      expect(onProceed).not.toHaveBeenCalled();
      expect(onCancel).not.toHaveBeenCalled();
    });
  });

  describe('Action Buttons', () => {
    it('displays both action buttons', () => {
      const conflicts = [createMockConflict()];
      const onProceed = vi.fn();
      const onCancel = vi.fn();
      const onOpenChange = vi.fn();

      render(
        <ConflictWarningDialog
          open={true}
          onOpenChange={onOpenChange}
          conflicts={conflicts}
          proposedStart={proposedStart}
          proposedEnd={proposedEnd}
          onProceed={onProceed}
          onCancel={onCancel}
        />
      );

      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Proceed Anyway')).toBeInTheDocument();
    });

    it('renders Proceed button with warning styling', () => {
      const conflicts = [createMockConflict()];
      const onProceed = vi.fn();
      const onCancel = vi.fn();
      const onOpenChange = vi.fn();

      render(
        <ConflictWarningDialog
          open={true}
          onOpenChange={onOpenChange}
          conflicts={conflicts}
          proposedStart={proposedStart}
          proposedEnd={proposedEnd}
          onProceed={onProceed}
          onCancel={onCancel}
        />
      );

      const proceedButton = screen.getByText('Proceed Anyway');
      expect(proceedButton).toHaveClass('bg-orange-600');
    });
  });

  describe('Empty State', () => {
    it('handles empty conflicts array', () => {
      const conflicts: Appointment[] = [];
      const onProceed = vi.fn();
      const onCancel = vi.fn();
      const onOpenChange = vi.fn();

      render(
        <ConflictWarningDialog
          open={true}
          onOpenChange={onOpenChange}
          conflicts={conflicts}
          proposedStart={proposedStart}
          proposedEnd={proposedEnd}
          onProceed={onProceed}
          onCancel={onCancel}
        />
      );

      expect(screen.getByText(/Conflicting Appointments.*\(0\)/)).toBeInTheDocument();
    });
  });
});
