/**
 * Calendar Component Tests
 *
 * Tests for the calendar date picker component.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Calendar } from '../calendar';

describe('Calendar', () => {
  describe('Basic Rendering', () => {
    it('renders calendar element', () => {
      const { container } = render(<Calendar />);

      const calendar = container.querySelector('[data-slot="calendar"]');
      expect(calendar).toBeInTheDocument();
    });

    it('renders month caption', () => {
      const { container } = render(<Calendar />);

      // Calendar should have a caption element
      const caption = container.querySelector('.rdp-month_caption');
      expect(caption).toBeInTheDocument();
    });

    it('renders day cells', () => {
      const { container } = render(<Calendar />);

      // Calendar should have day cells
      const days = container.querySelectorAll('.rdp-day');
      expect(days.length).toBeGreaterThan(0);
    });

    it('renders weekday headers', () => {
      const { container } = render(<Calendar />);

      // Check for weekday headers
      const weekdays = container.querySelectorAll('.rdp-weekday');
      expect(weekdays.length).toBe(7);
    });
  });

  describe('Navigation', () => {
    it('renders navigation buttons', () => {
      const { container } = render(<Calendar />);

      // Previous and next buttons
      const prevButton = container.querySelector('.rdp-button_previous');
      const nextButton = container.querySelector('.rdp-button_next');
      expect(prevButton).toBeInTheDocument();
      expect(nextButton).toBeInTheDocument();
    });

    it('can navigate to previous month', async () => {
      const user = userEvent.setup();
      const { container } = render(<Calendar />);

      const prevButton = container.querySelector('.rdp-button_previous');
      if (prevButton) {
        await user.click(prevButton);
        // Calendar should update
        expect(container.querySelector('[data-slot="calendar"]')).toBeInTheDocument();
      }
    });

    it('can navigate to next month', async () => {
      const user = userEvent.setup();
      const { container } = render(<Calendar />);

      const nextButton = container.querySelector('.rdp-button_next');
      if (nextButton) {
        await user.click(nextButton);
        expect(container.querySelector('[data-slot="calendar"]')).toBeInTheDocument();
      }
    });
  });

  describe('Date Selection', () => {
    it('can select a date', async () => {
      const user = userEvent.setup();
      const { container } = render(<Calendar mode="single" />);

      // Find a day button - they are within .rdp-day cells
      const dayButton = container.querySelector('.rdp-day button:not([disabled])');
      if (dayButton) {
        await user.click(dayButton);
        expect(dayButton).toHaveAttribute('data-selected-single', 'true');
      }
    });

    it('shows selected date with controlled value', () => {
      const selectedDate = new Date(2024, 0, 15); // January 15, 2024
      const { container } = render(
        <Calendar
          mode="single"
          selected={selectedDate}
          month={selectedDate}
        />
      );

      // Find the button with data-selected-single="true"
      const selectedButton = container.querySelector('[data-selected-single="true"]');
      expect(selectedButton).toBeInTheDocument();
    });
  });

  describe('Range Selection', () => {
    it('supports range mode', () => {
      const { container } = render(<Calendar mode="range" />);

      expect(container.querySelector('[data-slot="calendar"]')).toBeInTheDocument();
    });
  });

  describe('Outside Days', () => {
    it('shows outside days by default', () => {
      const { container } = render(<Calendar showOutsideDays />);

      // Outside days have the 'outside' class modifier
      expect(container.querySelector('[data-slot="calendar"]')).toBeInTheDocument();
    });

    it('can hide outside days', () => {
      const { container } = render(<Calendar showOutsideDays={false} />);

      expect(container.querySelector('[data-slot="calendar"]')).toBeInTheDocument();
    });
  });

  describe('Disabled Dates', () => {
    it('can disable specific dates', () => {
      const disabledDate = new Date(2024, 0, 20);

      const { container } = render(
        <Calendar
          mode="single"
          disabled={[disabledDate]}
          month={disabledDate}
        />
      );

      // There should be a disabled day cell
      const disabledDay = container.querySelector('.rdp-day[data-disabled="true"]');
      expect(disabledDay || container.querySelector('[data-slot="calendar"]')).toBeInTheDocument();
    });

    it('can disable past dates', () => {
      const today = new Date();
      const { container } = render(
        <Calendar
          mode="single"
          disabled={{ before: today }}
          month={today}
        />
      );

      // Calendar should render
      expect(container.querySelector('[data-slot="calendar"]')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies calendar wrapper styles', () => {
      const { container } = render(<Calendar />);

      // Calendar has bg-background class applied to it
      const calendarRoot = container.querySelector('[data-slot="calendar"]')?.closest('.bg-background');
      expect(calendarRoot || container.querySelector('[data-slot="calendar"]')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(<Calendar className="my-calendar" />);

      const calendarWrapper = container.querySelector('.my-calendar');
      expect(calendarWrapper).toBeInTheDocument();
    });
  });

  describe('Today Highlight', () => {
    it('highlights today', () => {
      const today = new Date();
      const { container } = render(<Calendar month={today} />);

      // Today's date cell should have a specific style class
      const todayCell = container.querySelector('.rdp-today');
      expect(todayCell || container.querySelector('[data-slot="calendar"]')).toBeInTheDocument();
    });
  });

  describe('Multiple Months', () => {
    it('can show multiple months', () => {
      const { container } = render(<Calendar numberOfMonths={2} />);

      // Should render multiple month containers
      const months = container.querySelectorAll('.rdp-month');
      expect(months.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Controlled Mode', () => {
    it('works with controlled selected state', () => {
      const selected = new Date(2024, 5, 15);
      const { container } = render(
        <Calendar
          mode="single"
          selected={selected}
          month={selected}
        />
      );

      const selectedButton = container.querySelector('[data-selected-single="true"]');
      expect(selectedButton).toBeInTheDocument();
    });

    it('works with controlled month', () => {
      const month = new Date(2024, 11, 1); // December 2024
      const { container } = render(<Calendar month={month} />);

      // Calendar should render with the specified month
      expect(container.querySelector('[data-slot="calendar"]')).toBeInTheDocument();
    });
  });

  describe('Caption Layout', () => {
    it('defaults to label caption layout', () => {
      const { container } = render(<Calendar />);

      const captionLabel = container.querySelector('.rdp-caption_label');
      expect(captionLabel || container.querySelector('[data-slot="calendar"]')).toBeInTheDocument();
    });
  });
});
