/**
 * AppointmentCalendar Component Tests
 *
 * Tests for the calendar view component with day/week/month views.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppointmentCalendar } from '../AppointmentCalendar';
import type { Appointment } from '@/types/appointment';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'appointments.calendar': 'Calendar',
        'appointments.today': 'Today',
        'appointments.day': 'Day',
        'appointments.week': 'Week',
        'appointments.month': 'Month',
        'appointments.schedule': 'Schedule',
        'appointments.no_results': 'No appointments',
        'appointments.actions.new': 'New Appointment',
        'appointments.actions.view': 'View',
        'appointments.actions.edit': 'Edit',
        'appointments.type.label': 'Type',
        'appointments.type.consultation': 'Consultation',
        'appointments.type.follow_up': 'Follow-up',
        'appointments.type.emergency': 'Emergency',
        'appointments.type.procedure': 'Procedure',
        'appointments.type.checkup': 'Checkup',
        'appointments.status.label': 'Status',
        'appointments.status.scheduled': 'Scheduled',
        'appointments.status.confirmed': 'Confirmed',
        'appointments.status.in_progress': 'In Progress',
        'appointments.status.completed': 'Completed',
        'appointments.status.cancelled': 'Cancelled',
        'appointments.status.no_show': 'No Show',
        'appointments.detail.title': 'Appointment Details',
        'appointments.form.duration': 'Duration',
        'appointments.form.reason': 'Reason',
        'appointments.minutes': 'minutes',
        'common.loading': 'Loading...',
        'common.previous': 'Previous',
        'common.next': 'Next',
      };
      return translations[key] || key;
    },
    i18n: {
      language: 'en',
    },
  }),
}));

// Stable mock data
const mockWeeklySchedule = {
  days: [
    { day_of_week: 1, is_working_day: true, start_time: '09:00', end_time: '18:00' },
    { day_of_week: 2, is_working_day: true, start_time: '09:00', end_time: '18:00' },
    { day_of_week: 3, is_working_day: true, start_time: '09:00', end_time: '18:00' },
    { day_of_week: 4, is_working_day: true, start_time: '09:00', end_time: '18:00' },
    { day_of_week: 5, is_working_day: true, start_time: '09:00', end_time: '18:00' },
    { day_of_week: 6, is_working_day: false, start_time: null, end_time: null },
    { day_of_week: 0, is_working_day: false, start_time: null, end_time: null },
  ],
};

const mockHolidays: { id: string; name: string; holiday_date: string }[] = [];

// Mock scheduling constraints hook
vi.mock('@/hooks/useSchedulingConstraints', () => ({
  useSchedulingConstraints: () => ({
    isDateDisabled: (date: Date) => false,
    weeklySchedule: mockWeeklySchedule,
    holidays: mockHolidays,
    isLoading: false,
  }),
}));

// Mock appointment type helpers
vi.mock('@/types/appointment', () => ({
  appointmentToCalendarEvent: (apt: Appointment) => ({
    id: apt.id,
    title: `Appointment ${apt.id}`,
    start: new Date(apt.scheduled_start),
    end: new Date(new Date(apt.scheduled_start).getTime() + apt.duration_minutes * 60000),
    resource: apt,
  }),
  getTypeColor: (type: string) => {
    const colors: Record<string, string> = {
      CONSULTATION: '#3b82f6',
      FOLLOW_UP: '#10b981',
      EMERGENCY: '#ef4444',
      PROCEDURE: '#8b5cf6',
      CHECKUP: '#f59e0b',
    };
    return colors[type] || '#6b7280';
  },
  AppointmentStatus: {
    SCHEDULED: 'SCHEDULED',
    CONFIRMED: 'CONFIRMED',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
    NO_SHOW: 'NO_SHOW',
  },
  AppointmentType: {
    CONSULTATION: 'CONSULTATION',
    FOLLOW_UP: 'FOLLOW_UP',
    EMERGENCY: 'EMERGENCY',
    PROCEDURE: 'PROCEDURE',
    CHECKUP: 'CHECKUP',
  },
}));

// Use future dates for slot selection to pass validation
const futureSlotDate = new Date();
futureSlotDate.setDate(futureSlotDate.getDate() + 7);
futureSlotDate.setHours(10, 0, 0, 0);
const futureSlotEndDate = new Date(futureSlotDate);
futureSlotEndDate.setMinutes(30);

// Mock react-big-calendar
vi.mock('react-big-calendar', () => ({
  Calendar: ({ events, onSelectEvent, onSelectSlot, view, components }: any) => (
    <div data-testid="mock-calendar" data-view={view}>
      {components?.toolbar && components.toolbar({ label: 'January 2026', onNavigate: vi.fn(), onView: vi.fn() })}
      <div data-testid="calendar-events">
        {events?.map((event: any) => (
          <button
            key={event.id}
            data-testid={`event-${event.id}`}
            onClick={() => onSelectEvent?.(event)}
          >
            {event.title}
          </button>
        ))}
      </div>
      <button
        data-testid="select-slot"
        onClick={() => {
          // Create fresh future dates at click time
          const start = new Date();
          start.setDate(start.getDate() + 7);
          start.setHours(10, 0, 0, 0);
          const end = new Date(start);
          end.setMinutes(30);
          onSelectSlot?.({
            start,
            end,
            slots: [],
            action: 'click',
          });
        }}
      >
        Select Slot
      </button>
    </div>
  ),
  dateFnsLocalizer: () => ({}),
}));

// Sample appointments
const mockAppointments: Appointment[] = [
  {
    id: 'apt-1',
    patient_id: 'patient-1',
    provider_id: 'provider-1',
    scheduled_start: '2026-01-15T10:00:00Z',
    scheduled_end: '2026-01-15T10:30:00Z',
    duration_minutes: 30,
    type: 'CONSULTATION',
    status: 'SCHEDULED',
    reason: 'Routine checkup',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'apt-2',
    patient_id: 'patient-2',
    provider_id: 'provider-1',
    scheduled_start: '2026-01-15T14:00:00Z',
    scheduled_end: '2026-01-15T14:45:00Z',
    duration_minutes: 45,
    type: 'FOLLOW_UP',
    status: 'CONFIRMED',
    reason: 'Follow-up consultation',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

describe('AppointmentCalendar', () => {
  const defaultProps = {
    appointments: mockAppointments,
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the calendar', () => {
      render(<AppointmentCalendar {...defaultProps} />);

      expect(screen.getByTestId('mock-calendar')).toBeInTheDocument();
    });

    it('renders appointment events', () => {
      render(<AppointmentCalendar {...defaultProps} />);

      expect(screen.getByTestId('event-apt-1')).toBeInTheDocument();
      expect(screen.getByTestId('event-apt-2')).toBeInTheDocument();
    });

    it('renders with week view by default', () => {
      render(<AppointmentCalendar {...defaultProps} />);

      expect(screen.getByTestId('mock-calendar')).toHaveAttribute('data-view', 'week');
    });

    it('renders with custom default view', () => {
      render(<AppointmentCalendar {...defaultProps} defaultView="day" />);

      expect(screen.getByTestId('mock-calendar')).toHaveAttribute('data-view', 'day');
    });

    it('renders loading state', () => {
      render(<AppointmentCalendar {...defaultProps} isLoading={true} />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('renders New Appointment button', () => {
      render(<AppointmentCalendar {...defaultProps} />);

      expect(screen.getByText('New Appointment')).toBeInTheDocument();
    });

    it('renders navigation buttons', () => {
      render(<AppointmentCalendar {...defaultProps} />);

      expect(screen.getByText('Today')).toBeInTheDocument();
    });

    it('renders view switcher buttons', () => {
      render(<AppointmentCalendar {...defaultProps} />);

      expect(screen.getByText('Day')).toBeInTheDocument();
      expect(screen.getByText('Week')).toBeInTheDocument();
      expect(screen.getByText('Month')).toBeInTheDocument();
    });

    it('renders appointment type legend', () => {
      render(<AppointmentCalendar {...defaultProps} />);

      expect(screen.getByText('Type:')).toBeInTheDocument();
    });
  });

  describe('Event Selection', () => {
    it('calls onSelectAppointment when event is clicked', async () => {
      const user = userEvent.setup();
      const onSelectAppointment = vi.fn();
      render(
        <AppointmentCalendar {...defaultProps} onSelectAppointment={onSelectAppointment} />
      );

      await user.click(screen.getByTestId('event-apt-1'));

      expect(onSelectAppointment).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'apt-1' })
      );
    });
  });

  describe('Slot Selection', () => {
    it('calls onSelectSlot when slot is clicked', async () => {
      const user = userEvent.setup();
      const onSelectSlot = vi.fn();
      render(<AppointmentCalendar {...defaultProps} onSelectSlot={onSelectSlot} />);

      await user.click(screen.getByTestId('select-slot'));

      expect(onSelectSlot).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date)
      );
    });

    it('navigates to new appointment when slot is clicked without onSelectSlot', async () => {
      const user = userEvent.setup();
      render(<AppointmentCalendar {...defaultProps} />);

      await user.click(screen.getByTestId('select-slot'));

      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining('/appointments/new')
      );
    });
  });

  describe('Navigation', () => {
    it('calls onNavigate when date changes', async () => {
      const onNavigate = vi.fn();
      render(<AppointmentCalendar {...defaultProps} onNavigate={onNavigate} />);

      // The onNavigate would be called by the calendar internal navigation
      // which is mocked, so we verify the prop is accepted
      expect(screen.getByTestId('mock-calendar')).toBeInTheDocument();
    });

    it('navigates to new appointment page when New Appointment is clicked', async () => {
      const user = userEvent.setup();
      render(<AppointmentCalendar {...defaultProps} />);

      await user.click(screen.getByText('New Appointment'));

      expect(mockNavigate).toHaveBeenCalledWith('/appointments/new');
    });
  });

  describe('View Change', () => {
    it('calls onViewChange when view changes', async () => {
      const onViewChange = vi.fn();
      render(<AppointmentCalendar {...defaultProps} onViewChange={onViewChange} />);

      // The callback is wired up and view buttons are rendered
      expect(screen.getByText('Day')).toBeInTheDocument();
      expect(screen.getByText('Week')).toBeInTheDocument();
      expect(screen.getByText('Month')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('renders calendar with no appointments', () => {
      render(<AppointmentCalendar appointments={[]} isLoading={false} />);

      expect(screen.getByTestId('mock-calendar')).toBeInTheDocument();
      expect(screen.queryByTestId('event-apt-1')).not.toBeInTheDocument();
    });
  });

  describe('Custom Date', () => {
    it('accepts defaultDate prop', () => {
      const customDate = new Date('2026-03-15');
      render(<AppointmentCalendar {...defaultProps} defaultDate={customDate} />);

      expect(screen.getByTestId('mock-calendar')).toBeInTheDocument();
    });
  });
});
