/**
 * AppointmentCalendar Component
 *
 * A full-featured calendar component for displaying and managing appointments.
 * Supports day, week, and month views with drag-and-drop rescheduling.
 *
 * Design: Modern, clean aesthetic with:
 * - Event cards with left-border color accent
 * - Soft shadows and rounded corners
 * - Subtle grid lines
 * - Holiday column highlighting
 */

import { useCallback, useMemo, useState } from 'react';
import { Calendar, dateFnsLocalizer, View, SlotInfo } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, startOfDay, isSameDay } from 'date-fns';
import { enUS, it } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import 'react-big-calendar/lib/css/react-big-calendar.css';

import type { Appointment, CalendarEvent } from '../../types/appointment';
import { useSchedulingConstraints } from '../../hooks/useSchedulingConstraints';
import {
  appointmentToCalendarEvent,
  getTypeColor,
  AppointmentStatus,
  AppointmentType,
} from '../../types/appointment';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Calendar as CalendarIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

// Setup date-fns localizer
const locales = {
  'en-US': enUS,
  en: enUS,
  it: it,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }), // Monday
  getDay,
  locales,
});

interface AppointmentCalendarProps {
  appointments: Appointment[];
  isLoading?: boolean;
  onSelectAppointment?: (appointment: Appointment) => void;
  onSelectSlot?: (start: Date, end: Date) => void;
  onNavigate?: (date: Date) => void;
  onViewChange?: (view: View) => void;
  defaultView?: View;
  defaultDate?: Date;
}

/**
 * AppointmentCalendar provides a visual calendar interface for viewing and managing appointments.
 * Supports day, week, and month views with color-coded appointment types.
 */
export function AppointmentCalendar({
  appointments,
  isLoading = false,
  onSelectAppointment,
  onSelectSlot,
  onNavigate,
  onViewChange,
  defaultView = 'week',
  defaultDate = new Date(),
}: AppointmentCalendarProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [currentDate, setCurrentDate] = useState(defaultDate);
  const [currentView, setCurrentView] = useState<View>(defaultView);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventDialog, setShowEventDialog] = useState(false);

  // Fetch scheduling constraints (working hours and holidays)
  const {
    isDateDisabled,
    weeklySchedule,
    holidays,
    isLoading: constraintsLoading,
  } = useSchedulingConstraints({
    currentMonth: currentDate,
    monthsToPreload: 2,
  });

  // Convert appointments to calendar events
  const events = useMemo(() => {
    return appointments.map(appointmentToCalendarEvent);
  }, [appointments]);

  // Calculate min/max times from working hours
  const { minTime, maxTime } = useMemo(() => {
    if (!weeklySchedule?.days) {
      // Default fallback if no schedule
      return {
        minTime: new Date(0, 0, 0, 8, 0, 0),
        maxTime: new Date(0, 0, 0, 20, 0, 0),
      };
    }

    // Find earliest start time and latest end time across all working days
    let earliestStart = '09:00';
    let latestEnd = '18:00';

    for (const day of weeklySchedule.days) {
      if (day.is_working_day && day.start_time && day.end_time) {
        if (day.start_time < earliestStart) {
          earliestStart = day.start_time;
        }
        if (day.end_time > latestEnd) {
          latestEnd = day.end_time;
        }
      }
    }

    const [startHour, startMin] = earliestStart.split(':').map(Number);
    const [endHour, endMin] = latestEnd.split(':').map(Number);

    return {
      minTime: new Date(0, 0, 0, startHour, startMin, 0),
      maxTime: new Date(0, 0, 0, endHour, endMin, 0),
    };
  }, [weeklySchedule]);

  // Create holiday events for display - span working hours for better visibility
  const holidayEvents = useMemo((): CalendarEvent[] => {
    return holidays.map((holiday) => {
      const holidayDate = new Date(holiday.holiday_date);
      // Create event that spans the working hours
      const startHour = minTime.getHours();
      const startMin = minTime.getMinutes();
      const endHour = maxTime.getHours();
      const endMin = maxTime.getMinutes();

      const eventStart = new Date(holidayDate);
      eventStart.setHours(startHour, startMin, 0, 0);

      const eventEnd = new Date(holidayDate);
      eventEnd.setHours(endHour, endMin, 0, 0);

      return {
        id: `holiday-${holiday.id}`,
        title: `🏖️ ${holiday.name}`,
        start: eventStart,
        end: eventEnd,
        allDay: false,
        resource: undefined,
      };
    });
  }, [holidays, minTime, maxTime]);

  // Get list of holiday dates for column styling
  const holidayDates = useMemo(() => {
    return holidays.map((h) => new Date(h.holiday_date));
  }, [holidays]);

  // Combine appointment events with holiday events
  const allEvents = useMemo(() => {
    return [...events, ...holidayEvents];
  }, [events, holidayEvents]);

  // Handle event selection
  const handleSelectEvent = useCallback(
    (event: CalendarEvent) => {
      // Skip showing dialog for holiday events (they have no resource)
      if (!event.resource) {
        return;
      }

      setSelectedEvent(event);
      setShowEventDialog(true);

      if (onSelectAppointment) {
        onSelectAppointment(event.resource);
      }
    },
    [onSelectAppointment]
  );

  // Handle slot selection (for creating new appointments)
  const handleSelectSlot = useCallback(
    (slotInfo: SlotInfo) => {
      // Block selection on holidays or non-working days
      if (isDateDisabled(slotInfo.start)) {
        return;
      }

      if (onSelectSlot) {
        onSelectSlot(slotInfo.start, slotInfo.end);
      } else {
        // Default: navigate to new appointment page with selected time
        const startTime = slotInfo.start.toISOString();
        navigate(`/appointments/new?start=${startTime}`);
      }
    },
    [onSelectSlot, navigate, isDateDisabled]
  );

  // Handle navigation
  const handleNavigate = useCallback(
    (date: Date) => {
      setCurrentDate(date);
      if (onNavigate) {
        onNavigate(date);
      }
    },
    [onNavigate]
  );

  // Handle view change
  const handleViewChange = useCallback(
    (view: View) => {
      setCurrentView(view);
      if (onViewChange) {
        onViewChange(view);
      }
    },
    [onViewChange]
  );

  // Custom event styling based on appointment type or holiday
  // Modern design: left-border color accent, subtle background, rounded corners
  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    // Check if this is a holiday event
    if (event.id.toString().startsWith('holiday-')) {
      return {
        style: {
          backgroundColor: 'hsl(220 14% 20%)',
          backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
          borderRadius: '8px',
          border: 'none',
          borderLeft: '4px solid hsl(220 10% 50%)',
          color: 'hsl(220 10% 70%)',
          fontSize: '0.8rem',
          fontWeight: '500',
          padding: '4px 8px',
          cursor: 'default', // Not clickable
          pointerEvents: 'none', // Prevent any interaction
        },
      };
    }

    const appointment = event.resource;
    if (!appointment) {
      return {};
    }

    const accentColor = getTypeColor(appointment.type);
    const isCancelled = appointment.status === AppointmentStatus.CANCELLED;

    return {
      style: {
        // Modern card style: dark background with colored left border
        backgroundColor: 'hsl(222 47% 11%)',
        borderRadius: '8px',
        border: '1px solid hsl(217 19% 27%)',
        borderLeft: `4px solid ${accentColor}`,
        color: 'hsl(210 40% 98%)',
        fontSize: '0.8rem',
        fontWeight: '500',
        opacity: isCancelled ? 0.5 : 1,
        textDecoration: isCancelled ? 'line-through' : 'none',
        boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.2)',
        overflow: 'hidden',
        cursor: 'pointer', // Clickable
      },
    };
  }, []);

  // Custom toolbar component - modern design
  const CustomToolbar = useCallback(
    ({ label, onNavigate: toolbarNavigate, onView }: any) => (
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Navigation controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg border border-border/50 bg-muted/30 p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toolbarNavigate('PREV')}
              aria-label={t('common.previous')}
              className="h-8 w-8 p-0 hover:bg-background"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toolbarNavigate('TODAY')}
              className="px-3 hover:bg-background"
            >
              {t('appointments.today')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toolbarNavigate('NEXT')}
              aria-label={t('common.next')}
              className="h-8 w-8 p-0 hover:bg-background"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <h2 className="text-xl font-semibold tracking-tight">{label}</h2>
        </div>

        {/* View switcher and new appointment button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg border border-border/50 bg-muted/30 p-1">
            <Button
              variant={currentView === 'day' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onView('day')}
              className={currentView === 'day' ? 'bg-background shadow-sm' : 'hover:bg-background'}
            >
              {t('appointments.day')}
            </Button>
            <Button
              variant={currentView === 'week' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onView('week')}
              className={currentView === 'week' ? 'bg-background shadow-sm' : 'hover:bg-background'}
            >
              {t('appointments.week')}
            </Button>
            <Button
              variant={currentView === 'month' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onView('month')}
              className={currentView === 'month' ? 'bg-background shadow-sm' : 'hover:bg-background'}
            >
              {t('appointments.month')}
            </Button>
          </div>
          <Button
            onClick={() => navigate('/appointments/new')}
            className="gap-2 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            {t('appointments.actions.new')}
          </Button>
        </div>
      </div>
    ),
    [currentView, navigate, t]
  );

  // Get status label for the dialog
  const getStatusLabel = (status: AppointmentStatus): string => {
    const statusMap: Record<AppointmentStatus, string> = {
      [AppointmentStatus.SCHEDULED]: t('appointments.status.scheduled'),
      [AppointmentStatus.CONFIRMED]: t('appointments.status.confirmed'),
      [AppointmentStatus.IN_PROGRESS]: t('appointments.status.in_progress'),
      [AppointmentStatus.COMPLETED]: t('appointments.status.completed'),
      [AppointmentStatus.CANCELLED]: t('appointments.status.cancelled'),
      [AppointmentStatus.NO_SHOW]: t('appointments.status.no_show'),
    };
    return statusMap[status] || status;
  };

  // Day column styling - highlight holidays with subtle background
  const dayPropGetter = useCallback(
    (date: Date) => {
      const isHoliday = holidayDates.some((holidayDate) => isSameDay(date, holidayDate));
      if (isHoliday) {
        return {
          style: {
            background: 'repeating-linear-gradient(135deg, hsl(var(--muted) / 0.15), hsl(var(--muted) / 0.15) 10px, hsl(var(--muted) / 0.25) 10px, hsl(var(--muted) / 0.25) 20px)',
          },
          className: 'holiday-column',
        };
      }
      return {};
    },
    [holidayDates]
  );

  // Slot styling for time slots in holidays
  const slotPropGetter = useCallback(
    (date: Date) => {
      const isHoliday = holidayDates.some((holidayDate) => isSameDay(date, holidayDate));
      if (isHoliday) {
        return {
          style: {
            background: 'hsl(var(--muted) / 0.1)',
            cursor: 'not-allowed', // Cannot schedule on holidays
          },
        };
      }
      return {};
    },
    [holidayDates]
  );

  // Messages for calendar localization
  const messages = useMemo(
    () => ({
      today: t('appointments.today'),
      previous: t('common.previous'),
      next: t('common.next'),
      month: t('appointments.month'),
      week: t('appointments.week'),
      day: t('appointments.day'),
      agenda: t('appointments.schedule'),
      noEventsInRange: t('appointments.no_results'),
    }),
    [t]
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            {t('appointments.calendar')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[600px] items-center justify-center">
            <div className="text-muted-foreground">{t('common.loading')}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="calendar-card overflow-hidden border-border/50 shadow-sm">
        <CardContent className="p-6">
          <Calendar
            localizer={localizer}
            events={allEvents}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 600 }}
            view={currentView}
            date={currentDate}
            onNavigate={handleNavigate}
            onView={handleViewChange}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            selectable
            eventPropGetter={eventStyleGetter}
            dayPropGetter={dayPropGetter}
            slotPropGetter={slotPropGetter}
            components={{
              toolbar: CustomToolbar,
            }}
            messages={messages}
            culture={i18n.language}
            min={minTime}
            max={maxTime}
            step={15} // 15-minute time slots
            timeslots={4} // 4 slots per hour (every 15 minutes)
          />
        </CardContent>

        {/* Appointment Type Legend */}
        <div className="border-t border-border/30 px-6 py-3">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="text-muted-foreground font-medium">{t('appointments.type.label')}:</span>
            {Object.values(AppointmentType).map((type) => (
              <div key={type} className="flex items-center gap-1.5">
                <div
                  className="h-3 w-3 rounded-sm"
                  style={{ backgroundColor: getTypeColor(type) }}
                />
                <span className="text-muted-foreground">
                  {t(`appointments.type.${type.toLowerCase()}`)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Event Detail Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('appointments.detail.title')}</DialogTitle>
            <DialogDescription>
              {selectedEvent?.resource &&
                format(new Date(selectedEvent.resource.scheduled_start), 'PPPp', {
                  locale: i18n.language === 'it' ? it : enUS,
                })}
            </DialogDescription>
          </DialogHeader>
          {selectedEvent?.resource && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">
                  {t('appointments.type.label')}
                </h4>
                <p className="text-sm">
                  {t(
                    `appointments.type.${selectedEvent.resource.type.toLowerCase()}`
                  )}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">
                  {t('appointments.status.label')}
                </h4>
                <Badge variant="secondary">
                  {getStatusLabel(selectedEvent.resource.status)}
                </Badge>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">
                  {t('appointments.form.duration')}
                </h4>
                <p className="text-sm">
                  {selectedEvent.resource.duration_minutes} {t('appointments.minutes')}
                </p>
              </div>
              {selectedEvent.resource.reason && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">
                    {t('appointments.form.reason')}
                  </h4>
                  <p className="text-sm">{selectedEvent.resource.reason}</p>
                </div>
              )}
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    navigate(`/appointments/${selectedEvent.resource!.id}`);
                    setShowEventDialog(false);
                  }}
                >
                  {t('appointments.actions.view')}
                </Button>
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={() => {
                    navigate(`/appointments/${selectedEvent.resource!.id}/edit`);
                    setShowEventDialog(false);
                  }}
                >
                  {t('appointments.actions.edit')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modern Calendar Styles */}
      <style>{`
        /* Base calendar styling */
        .calendar-card .rbc-calendar {
          font-family: inherit;
          background: transparent;
        }

        /* Header row - day names */
        .calendar-card .rbc-header {
          padding: 12px 8px;
          font-weight: 600;
          font-size: 0.875rem;
          color: hsl(var(--muted-foreground));
          border-bottom: 1px solid hsl(var(--border) / 0.3);
          background: transparent;
        }
        .calendar-card .rbc-header + .rbc-header {
          border-left: 1px solid hsl(var(--border) / 0.2);
        }

        /* Time gutter (left column with times) */
        .calendar-card .rbc-time-gutter {
          background: transparent;
        }
        .calendar-card .rbc-time-gutter .rbc-timeslot-group {
          border-bottom: none;
        }
        .calendar-card .rbc-label {
          font-size: 0.7rem;
          font-weight: 500;
          color: hsl(var(--muted-foreground) / 0.7);
          padding: 0 8px;
        }

        /* Time slots - softer grid */
        .calendar-card .rbc-time-slot {
          min-height: 20px;
          border-top: 1px solid hsl(var(--border) / 0.15);
        }
        .calendar-card .rbc-timeslot-group {
          border-bottom: 1px solid hsl(var(--border) / 0.25);
        }
        .calendar-card .rbc-day-slot .rbc-time-slot {
          border-top: 1px solid hsl(var(--border) / 0.1);
        }

        /* Day columns */
        .calendar-card .rbc-time-content {
          border-top: none;
        }
        .calendar-card .rbc-time-content > * + * > * {
          border-left: 1px solid hsl(var(--border) / 0.15);
        }

        /* Today highlight - subtle accent */
        .calendar-card .rbc-today {
          background: linear-gradient(180deg, hsl(var(--primary) / 0.08) 0%, hsl(var(--primary) / 0.03) 100%);
        }
        .calendar-card .rbc-header.rbc-today {
          color: hsl(var(--primary));
          font-weight: 700;
        }

        /* Current time indicator */
        .calendar-card .rbc-current-time-indicator {
          background-color: hsl(var(--destructive));
          height: 2px;
        }
        .calendar-card .rbc-current-time-indicator::before {
          content: '';
          position: absolute;
          left: -6px;
          top: -4px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background-color: hsl(var(--destructive));
        }

        /* Events - base styling */
        .calendar-card .rbc-event {
          padding: 4px 8px !important;
          margin: 1px 2px !important;
        }
        .calendar-card .rbc-event:focus {
          outline: 2px solid hsl(var(--ring)) !important;
          outline-offset: 2px;
        }
        .calendar-card .rbc-event-label {
          font-size: 0.7rem !important;
          font-weight: 600 !important;
          opacity: 0.7;
          margin-bottom: 2px;
          display: block;
        }
        .calendar-card .rbc-event-content {
          font-size: 0.8rem !important;
          font-weight: 500 !important;
          line-height: 1.3;
        }

        /* Event hover effect */
        .calendar-card .rbc-event:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px -2px rgb(0 0 0 / 0.3), 0 2px 4px -2px rgb(0 0 0 / 0.2) !important;
          z-index: 10;
        }

        /* Selected event */
        .calendar-card .rbc-event.rbc-selected {
          box-shadow: 0 0 0 2px hsl(var(--primary)) !important;
        }

        /* Month view adjustments */
        .calendar-card .rbc-month-view {
          border: 1px solid hsl(var(--border) / 0.3);
          border-radius: 12px;
          overflow: hidden;
        }
        .calendar-card .rbc-month-row {
          border-bottom: 1px solid hsl(var(--border) / 0.2);
        }
        .calendar-card .rbc-month-row + .rbc-month-row {
          border-top: none;
        }
        .calendar-card .rbc-date-cell {
          padding: 4px 8px;
          font-weight: 500;
          font-size: 0.875rem;
        }
        .calendar-card .rbc-date-cell.rbc-now {
          font-weight: 700;
        }
        .calendar-card .rbc-date-cell > a {
          color: hsl(var(--foreground));
        }
        .calendar-card .rbc-off-range {
          color: hsl(var(--muted-foreground) / 0.5);
        }
        .calendar-card .rbc-off-range-bg {
          background-color: hsl(var(--muted) / 0.3);
        }

        /* Week/Day view container */
        .calendar-card .rbc-time-view {
          border: 1px solid hsl(var(--border) / 0.3);
          border-radius: 12px;
          overflow: hidden;
        }

        /* Slot selection (creating new appointment) */
        .calendar-card .rbc-slot-selection {
          background-color: hsl(var(--primary) / 0.2);
          border: 2px dashed hsl(var(--primary) / 0.5);
          border-radius: 8px;
        }

        /* Agenda view */
        .calendar-card .rbc-agenda-view {
          border: 1px solid hsl(var(--border) / 0.3);
          border-radius: 12px;
          overflow: hidden;
        }
        .calendar-card .rbc-agenda-table {
          border: none;
        }

        /* Show more link in month view */
        .calendar-card .rbc-show-more {
          color: hsl(var(--primary));
          font-weight: 500;
          font-size: 0.75rem;
        }

        /* Dark mode adjustments */
        .dark .calendar-card .rbc-off-range-bg {
          background-color: hsl(var(--muted) / 0.2);
        }
        .dark .calendar-card .rbc-today {
          background: linear-gradient(180deg, hsl(var(--primary) / 0.12) 0%, hsl(var(--primary) / 0.05) 100%);
        }
        .dark .calendar-card .rbc-event.appointment-event {
          box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.3);
        }
        .dark .calendar-card .rbc-event.appointment-event:hover {
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.3) !important;
        }

        /* All-day events row */
        .calendar-card .rbc-allday-cell {
          display: none;
        }

        /* Remove default borders */
        .calendar-card .rbc-time-header-content {
          border-left: none;
        }

        /* Smooth transitions */
        .calendar-card .rbc-event {
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
      `}</style>
    </>
  );
}
