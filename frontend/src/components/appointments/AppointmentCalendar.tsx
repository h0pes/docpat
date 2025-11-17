/**
 * AppointmentCalendar Component
 *
 * A full-featured calendar component for displaying and managing appointments.
 * Supports day, week, and month views with drag-and-drop rescheduling.
 */

import { useCallback, useMemo, useState } from 'react';
import { Calendar, dateFnsLocalizer, View, SlotInfo } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addMinutes } from 'date-fns';
import { enUS, it } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import 'react-big-calendar/lib/css/react-big-calendar.css';

import type { Appointment, CalendarEvent } from '../../types/appointment';
import {
  appointmentToCalendarEvent,
  getTypeColor,
  AppointmentStatus,
} from '../../types/appointment';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from 'lucide-react';

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

  // Convert appointments to calendar events
  const events = useMemo(() => {
    return appointments.map(appointmentToCalendarEvent);
  }, [appointments]);

  // Handle event selection
  const handleSelectEvent = useCallback(
    (event: CalendarEvent) => {
      setSelectedEvent(event);
      setShowEventDialog(true);

      if (onSelectAppointment && event.resource) {
        onSelectAppointment(event.resource);
      }
    },
    [onSelectAppointment]
  );

  // Handle slot selection (for creating new appointments)
  const handleSelectSlot = useCallback(
    (slotInfo: SlotInfo) => {
      if (onSelectSlot) {
        onSelectSlot(slotInfo.start, slotInfo.end);
      } else {
        // Default: navigate to new appointment page with selected time
        const startTime = slotInfo.start.toISOString();
        navigate(`/appointments/new?start=${startTime}`);
      }
    },
    [onSelectSlot, navigate]
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

  // Custom event styling based on appointment type
  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const appointment = event.resource;
    if (!appointment) {
      return {};
    }

    const backgroundColor = getTypeColor(appointment.type);
    const opacity = appointment.status === AppointmentStatus.CANCELLED ? 0.5 : 1;
    const textDecoration =
      appointment.status === AppointmentStatus.CANCELLED ? 'line-through' : 'none';

    return {
      style: {
        backgroundColor,
        opacity,
        textDecoration,
        borderRadius: '4px',
        border: 'none',
        color: '#ffffff',
        fontSize: '0.875rem',
      },
    };
  }, []);

  // Custom toolbar component
  const CustomToolbar = useCallback(
    ({ label, onNavigate: toolbarNavigate, onView }: any) => (
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toolbarNavigate('PREV')}
            aria-label={t('common.previous')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toolbarNavigate('TODAY')}
          >
            {t('appointments.today')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toolbarNavigate('NEXT')}
            aria-label={t('common.next')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="ml-2 text-lg font-semibold">{label}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={currentView === 'day' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onView('day')}
          >
            {t('appointments.day')}
          </Button>
          <Button
            variant={currentView === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onView('week')}
          >
            {t('appointments.week')}
          </Button>
          <Button
            variant={currentView === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onView('month')}
          >
            {t('appointments.month')}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => navigate('/appointments/new')}
            className="ml-2"
          >
            <Plus className="mr-2 h-4 w-4" />
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
      <Card className="calendar-card">
        <CardContent className="p-4">
          <Calendar
            localizer={localizer}
            events={events}
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
            components={{
              toolbar: CustomToolbar,
            }}
            messages={messages}
            culture={i18n.language}
            min={new Date(0, 0, 0, 8, 0, 0)} // Day starts at 8 AM
            max={new Date(0, 0, 0, 20, 0, 0)} // Day ends at 8 PM
            step={15} // 15-minute time slots
            timeslots={4} // 4 slots per hour (every 15 minutes)
          />
        </CardContent>
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

      {/* Calendar Styles */}
      <style>{`
        .calendar-card .rbc-calendar {
          font-family: inherit;
        }
        .calendar-card .rbc-header {
          padding: 8px;
          font-weight: 600;
        }
        .calendar-card .rbc-time-slot {
          min-height: 20px;
        }
        .calendar-card .rbc-event {
          padding: 2px 5px;
        }
        .calendar-card .rbc-event-content {
          font-size: 0.75rem;
        }
        .calendar-card .rbc-today {
          background-color: hsl(var(--primary) / 0.05);
        }
        .calendar-card .rbc-current-time-indicator {
          background-color: hsl(var(--destructive));
        }
        .dark .calendar-card .rbc-off-range-bg {
          background-color: hsl(var(--muted));
        }
        .dark .calendar-card .rbc-today {
          background-color: hsl(var(--primary) / 0.1);
        }
      `}</style>
    </>
  );
}
