/**
 * DailyScheduleWidget Component
 *
 * A compact widget displaying today's appointments for the dashboard.
 * Shows upcoming appointments with time, patient info, and quick actions.
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { format, parseISO, isToday, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import {
  Calendar,
  Clock,
  User,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react';

import { appointmentsApi } from '../../services/api/appointments';
import { AppointmentStatus, getStatusColor } from '../../types/appointment';
import type { Appointment } from '../../types/appointment';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';

interface DailyScheduleWidgetProps {
  maxItems?: number;
  showHeader?: boolean;
  className?: string;
}

/**
 * DailyScheduleWidget provides a quick overview of today's appointments.
 * Highlights the next upcoming appointment and allows quick navigation.
 */
export function DailyScheduleWidget({
  maxItems = 5,
  showHeader = true,
  className = '',
}: DailyScheduleWidgetProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const today = new Date();

  // Fetch today's appointments
  const { data: appointmentsData, isLoading, error } = useQuery({
    queryKey: ['appointments', 'daily', format(today, 'yyyy-MM-dd')],
    queryFn: () =>
      appointmentsApi.getByDateRange(
        startOfDay(today).toISOString(),
        endOfDay(today).toISOString()
      ),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });

  // Process appointments for display
  const { upcomingAppointments, completedCount, nextAppointment } = useMemo(() => {
    if (!appointmentsData?.appointments) {
      return { upcomingAppointments: [], completedCount: 0, nextAppointment: null };
    }

    const now = new Date();
    const sorted = [...appointmentsData.appointments].sort((a, b) =>
      new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime()
    );

    const upcoming = sorted.filter(
      (apt) =>
        apt.status !== AppointmentStatus.CANCELLED &&
        apt.status !== AppointmentStatus.COMPLETED &&
        isAfter(parseISO(apt.scheduled_end), now)
    );

    const completed = sorted.filter(
      (apt) => apt.status === AppointmentStatus.COMPLETED
    ).length;

    const next = upcoming.find((apt) =>
      isAfter(parseISO(apt.scheduled_start), now)
    ) || upcoming[0] || null;

    return {
      upcomingAppointments: upcoming.slice(0, maxItems),
      completedCount: completed,
      nextAppointment: next,
    };
  }, [appointmentsData, maxItems]);

  /**
   * Navigates to the appointment detail page.
   */
  const handleAppointmentClick = (appointmentId: string) => {
    navigate(`/appointments/${appointmentId}`);
  };

  /**
   * Navigates to the full appointments page.
   */
  const handleViewAll = () => {
    navigate('/appointments');
  };

  /**
   * Formats time for display.
   */
  const formatTime = (isoString: string): string => {
    return format(parseISO(isoString), 'HH:mm');
  };

  /**
   * Calculates time until appointment.
   */
  const getTimeUntil = (isoString: string): string => {
    const now = new Date();
    const appointmentTime = parseISO(isoString);
    const diffMs = appointmentTime.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / 60000);

    if (diffMins < 0) {
      return t('appointments.daily_schedule.in_progress');
    } else if (diffMins < 60) {
      return `${diffMins} ${t('appointments.minutes')}`;
    } else {
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return mins > 0
        ? `${hours}h ${mins}m`
        : `${hours} ${t('appointments.hours')}`;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {t('appointments.daily_schedule.title')}
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {t('appointments.daily_schedule.title')}
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className="flex h-48 items-center justify-center">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">{t('appointments.error_loading')}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {t('appointments.daily_schedule.title')}
              </CardTitle>
              <CardDescription>
                {format(today, 'EEEE, MMMM d, yyyy')}
              </CardDescription>
            </div>
            <Badge variant="outline" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              {completedCount}/{appointmentsData?.total || 0}
            </Badge>
          </div>
        </CardHeader>
      )}
      <CardContent className="pt-0">
        {upcomingAppointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Calendar className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {t('appointments.daily_schedule.no_appointments')}
            </p>
            <Button
              variant="link"
              size="sm"
              className="mt-2"
              onClick={() => navigate('/appointments/new')}
            >
              {t('appointments.actions.new')}
            </Button>
          </div>
        ) : (
          <>
            {/* Next Appointment Highlight */}
            {nextAppointment && (
              <div className="mb-4 rounded-lg border bg-primary/5 p-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  {t('appointments.daily_schedule.next_appointment')}
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {formatTime(nextAppointment.scheduled_start)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {nextAppointment.reason || nextAppointment.type.replace('_', ' ')}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {getTimeUntil(nextAppointment.scheduled_start)}
                  </Badge>
                </div>
              </div>
            )}

            <ScrollArea className="h-[200px] pr-4">
              <div className="space-y-3">
                {upcomingAppointments.map((appointment, index) => (
                  <div key={appointment.id}>
                    <button
                      onClick={() => handleAppointmentClick(appointment.id)}
                      className="w-full rounded-md p-2 text-left transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col items-center">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="mt-1 text-xs font-medium">
                              {formatTime(appointment.scheduled_start)}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm font-medium">
                                {appointment.reason ||
                                  appointment.type.replace('_', ' ')}
                              </span>
                            </div>
                            <Badge
                              className={`mt-1 text-xs ${getStatusColor(appointment.status)}`}
                            >
                              {t(
                                `appointments.status.${appointment.status.toLowerCase()}`
                              )}
                            </Badge>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </button>
                    {index < upcomingAppointments.length - 1 && (
                      <Separator className="mt-2" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleViewAll}
              >
                {t('common.viewAll')}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
