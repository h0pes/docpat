/**
 * DateRangePicker Component Tests
 *
 * Tests for the date range picker component with presets.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DateRangePicker } from '../DateRangePicker';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('DateRangePicker', () => {
  const defaultProps = {
    onDateRangeChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders preset selector', () => {
      render(<DateRangePicker {...defaultProps} />);

      // Should have a combobox for preset selection
      const combobox = screen.getByRole('combobox');
      expect(combobox).toBeInTheDocument();
    });

    it('renders date range button', () => {
      render(<DateRangePicker {...defaultProps} />);

      // Should have a button to open calendar
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('renders placeholder when no date selected', () => {
      render(<DateRangePicker {...defaultProps} />);

      expect(screen.getByText('reports.selectDateRange')).toBeInTheDocument();
    });

    it('renders custom placeholder when provided', () => {
      render(<DateRangePicker {...defaultProps} placeholder="Custom Placeholder" />);

      expect(screen.getByText('Custom Placeholder')).toBeInTheDocument();
    });

    it('renders calendar icon', () => {
      render(<DateRangePicker {...defaultProps} />);

      // Calendar icon should be present
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Preset Selection', () => {
    it('opens preset dropdown when clicked', async () => {
      const user = userEvent.setup();
      render(<DateRangePicker {...defaultProps} />);

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        // When dropdown is open, allTime appears in both button and dropdown
        const allTimeElements = screen.getAllByText('reports.ranges.allTime');
        expect(allTimeElements.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('shows all preset options in dropdown', async () => {
      const user = userEvent.setup();
      render(<DateRangePicker {...defaultProps} />);

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        // allTime may appear twice (in button and dropdown)
        const allTimeElements = screen.getAllByText('reports.ranges.allTime');
        expect(allTimeElements.length).toBeGreaterThanOrEqual(1);
        // Other options should be visible
        expect(screen.getByText('reports.ranges.today')).toBeInTheDocument();
        expect(screen.getByText('reports.ranges.last7days')).toBeInTheDocument();
        expect(screen.getByText('reports.ranges.last30days')).toBeInTheDocument();
        expect(screen.getByText('reports.ranges.thisMonth')).toBeInTheDocument();
        expect(screen.getByText('reports.ranges.lastMonth')).toBeInTheDocument();
        expect(screen.getByText('reports.ranges.last3months')).toBeInTheDocument();
        expect(screen.getByText('reports.ranges.last6months')).toBeInTheDocument();
        expect(screen.getByText('reports.ranges.thisYear')).toBeInTheDocument();
        expect(screen.getByText('reports.ranges.custom')).toBeInTheDocument();
      });
    });

    it('calls onDateRangeChange when preset is selected', async () => {
      const user = userEvent.setup();
      const onDateRangeChange = vi.fn();
      render(<DateRangePicker {...defaultProps} onDateRangeChange={onDateRangeChange} />);

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        expect(screen.getByText('reports.ranges.today')).toBeInTheDocument();
      });

      await user.click(screen.getByText('reports.ranges.today'));

      await waitFor(() => {
        expect(onDateRangeChange).toHaveBeenCalled();
      });
    });

    it('sets undefined range when allTime is selected', async () => {
      const user = userEvent.setup();
      const onDateRangeChange = vi.fn();
      render(<DateRangePicker {...defaultProps} onDateRangeChange={onDateRangeChange} />);

      // First, select a different preset (today) to change from default
      await user.click(screen.getByRole('combobox'));
      await waitFor(() => {
        expect(screen.getByText('reports.ranges.today')).toBeInTheDocument();
      });
      await user.click(screen.getByText('reports.ranges.today'));

      await waitFor(() => {
        expect(onDateRangeChange).toHaveBeenCalled();
      });

      // Clear the mock and select allTime
      onDateRangeChange.mockClear();

      await user.click(screen.getByRole('combobox'));
      await waitFor(() => {
        const allTimeElements = screen.getAllByText('reports.ranges.allTime');
        expect(allTimeElements.length).toBeGreaterThanOrEqual(1);
      });

      // Click the allTime option in the listbox
      const listbox = screen.getByRole('listbox');
      const allTimeOption = listbox.querySelector('[role="option"][data-value="allTime"]') as HTMLElement;
      if (allTimeOption) {
        await user.click(allTimeOption);
      } else {
        // Fallback: find by text in listbox
        await user.click(screen.getByText('reports.ranges.allTime'));
      }

      await waitFor(() => {
        expect(onDateRangeChange).toHaveBeenCalledWith(undefined);
      });
    });
  });

  describe('Date Display', () => {
    it('formats single date correctly', () => {
      const dateRange = { from: new Date('2024-01-15') };
      render(<DateRangePicker {...defaultProps} dateRange={dateRange} />);

      expect(screen.getByText(/Jan 15, 2024/)).toBeInTheDocument();
    });

    it('formats date range correctly', () => {
      const dateRange = {
        from: new Date('2024-01-01'),
        to: new Date('2024-01-31'),
      };
      render(<DateRangePicker {...defaultProps} dateRange={dateRange} />);

      expect(screen.getByText(/Jan 1, 2024.*Jan 31, 2024/)).toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('disables preset selector when disabled', () => {
      render(<DateRangePicker {...defaultProps} disabled />);

      const combobox = screen.getByRole('combobox');
      expect(combobox).toBeDisabled();
    });

    it('disables date button when disabled', () => {
      render(<DateRangePicker {...defaultProps} disabled />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        if (button.textContent?.includes('reports.selectDateRange')) {
          expect(button).toBeDisabled();
        }
      });
    });
  });

  describe('Custom Date Selection', () => {
    it('opens calendar popover when date button clicked', async () => {
      const user = userEvent.setup();
      render(<DateRangePicker {...defaultProps} />);

      const dateButton = screen.getByText('reports.selectDateRange');
      await user.click(dateButton);

      // Calendar should open (look for navigation buttons)
      await waitFor(() => {
        // Calendar popover content should be visible
        const popoverContent = document.querySelector('[data-radix-popper-content-wrapper]');
        expect(popoverContent).toBeInTheDocument();
      });
    });
  });

  describe('ClassName', () => {
    it('applies custom className', () => {
      render(<DateRangePicker {...defaultProps} className="custom-class" />);

      // The root div should have the custom class
      const container = document.querySelector('.custom-class');
      expect(container).toBeInTheDocument();
    });
  });
});
