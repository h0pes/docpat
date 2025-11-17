/**
 * PrintScheduleButton Component
 *
 * A button that triggers printing of the current schedule view.
 * Includes print-specific styles for better paper output.
 */

import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Printer } from 'lucide-react';

import type { Appointment } from '../../types/appointment';
import { getStatusColor } from '../../types/appointment';
import { Button } from '../ui/button';

interface PrintScheduleButtonProps {
  appointments: Appointment[];
  dateRange: {
    start_date: string;
    end_date: string;
  };
  viewType: 'day' | 'week' | 'month';
  className?: string;
}

/**
 * PrintScheduleButton allows users to print the current schedule.
 * Creates a print-optimized layout with appointment details.
 */
export function PrintScheduleButton({
  appointments,
  dateRange,
  viewType,
  className = '',
}: PrintScheduleButtonProps) {
  const { t } = useTranslation();
  const printFrameRef = useRef<HTMLIFrameElement | null>(null);

  /**
   * Generates HTML content for printing.
   */
  const generatePrintContent = useCallback((): string => {
    const sortedAppointments = [...appointments].sort(
      (a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime()
    );

    const formatDateTime = (isoString: string): string => {
      return format(new Date(isoString), 'MMM d, yyyy HH:mm');
    };

    const formatTimeOnly = (isoString: string): string => {
      return format(new Date(isoString), 'HH:mm');
    };

    const getViewTitle = (): string => {
      const startDate = new Date(dateRange.start_date);
      const endDate = new Date(dateRange.end_date);
      switch (viewType) {
        case 'day':
          return format(startDate, 'EEEE, MMMM d, yyyy');
        case 'week':
          return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;
        case 'month':
          return format(startDate, 'MMMM yyyy');
        default:
          return '';
      }
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Schedule - ${getViewTitle()}</title>
        <style>
          * {
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            margin: 0;
            padding: 20px;
            color: #1f2937;
            line-height: 1.5;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 15px;
            border-bottom: 2px solid #e5e7eb;
          }
          .header h1 {
            margin: 0 0 5px 0;
            font-size: 24px;
            color: #111827;
          }
          .header p {
            margin: 0;
            color: #6b7280;
            font-size: 14px;
          }
          .summary {
            background: #f3f4f6;
            padding: 12px 16px;
            border-radius: 6px;
            margin-bottom: 20px;
            font-size: 14px;
          }
          .summary strong {
            color: #1f2937;
          }
          .appointments-list {
            margin: 0;
            padding: 0;
            list-style: none;
          }
          .appointment-item {
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 10px;
            page-break-inside: avoid;
          }
          .appointment-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
          }
          .appointment-time {
            font-weight: 600;
            font-size: 16px;
            color: #1f2937;
          }
          .appointment-status {
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 500;
            text-transform: uppercase;
          }
          .status-scheduled { background: #dbeafe; color: #1e40af; }
          .status-confirmed { background: #dcfce7; color: #166534; }
          .status-in_progress { background: #fef3c7; color: #92400e; }
          .status-completed { background: #f3f4f6; color: #374151; }
          .status-cancelled { background: #fee2e2; color: #991b1b; }
          .status-no_show { background: #ffedd5; color: #9a3412; }
          .appointment-type {
            font-size: 13px;
            color: #4b5563;
            margin-bottom: 4px;
          }
          .appointment-reason {
            font-size: 14px;
            color: #1f2937;
          }
          .appointment-notes {
            font-size: 12px;
            color: #6b7280;
            margin-top: 6px;
            font-style: italic;
          }
          .no-appointments {
            text-align: center;
            padding: 40px;
            color: #6b7280;
          }
          .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #e5e7eb;
            font-size: 11px;
            color: #9ca3af;
            text-align: center;
          }
          @media print {
            body {
              padding: 0;
            }
            .appointment-item {
              break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${t('appointments.schedule')} - ${getViewTitle()}</h1>
          <p>${t('appointments.print.generated_on')}: ${format(new Date(), 'PPpp')}</p>
        </div>

        <div class="summary">
          <strong>${t('appointments.total_count', { count: appointments.length })}</strong>
        </div>

        ${
          sortedAppointments.length > 0
            ? `
          <ul class="appointments-list">
            ${sortedAppointments
              .map(
                (apt) => `
              <li class="appointment-item">
                <div class="appointment-header">
                  <span class="appointment-time">
                    ${formatTimeOnly(apt.scheduled_start)} - ${formatTimeOnly(apt.scheduled_end)}
                    ${viewType !== 'day' ? `<br><small>${format(new Date(apt.scheduled_start), 'MMM d')}</small>` : ''}
                  </span>
                  <span class="appointment-status status-${apt.status.toLowerCase()}">
                    ${t(`appointments.status.${apt.status.toLowerCase()}`)}
                  </span>
                </div>
                <div class="appointment-type">
                  ${t(`appointments.type.${apt.type.toLowerCase()}`)}
                  • ${apt.duration_minutes} ${t('appointments.minutes')}
                </div>
                ${apt.reason ? `<div class="appointment-reason">${apt.reason}</div>` : ''}
                ${apt.notes ? `<div class="appointment-notes">${apt.notes}</div>` : ''}
              </li>
            `
              )
              .join('')}
          </ul>
        `
            : `
          <div class="no-appointments">
            ${t('appointments.no_appointments')}
          </div>
        `
        }

        <div class="footer">
          DocPat Medical Practice Management System
        </div>
      </body>
      </html>
    `;
  }, [appointments, dateRange, viewType, t]);

  /**
   * Handles the print action.
   * Creates an iframe with print content and triggers print dialog.
   */
  const handlePrint = useCallback(() => {
    // Remove existing iframe if any
    if (printFrameRef.current) {
      document.body.removeChild(printFrameRef.current);
    }

    // Create hidden iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.top = '-10000px';
    iframe.style.left = '-10000px';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    printFrameRef.current = iframe;

    // Write content to iframe
    const printContent = generatePrintContent();
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;

    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(printContent);
      iframeDoc.close();

      // Wait for content to load, then print
      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow?.print();
        }, 250);
      };

      // Trigger onload manually for some browsers
      if (iframe.contentWindow) {
        setTimeout(() => {
          iframe.contentWindow?.print();
        }, 500);
      }
    }
  }, [generatePrintContent]);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handlePrint}
      className={className}
    >
      <Printer className="mr-2 h-4 w-4" />
      {t('appointments.actions.print_schedule')}
    </Button>
  );
}
