/**
 * StatusLegend Component Tests
 *
 * Tests for the prescription status legend popover and inline components.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StatusLegend, StatusLegendInline } from '../StatusLegend';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'prescriptions.status_legend.title': 'Status Legend',
        'prescriptions.status_legend.subtitle': 'Understanding prescription statuses',
        'prescriptions.status_legend.badges_title': 'Additional Badges',
        'prescriptions.status_legend.actions_title': 'Available Actions',
        'prescriptions.status.active': 'Active',
        'prescriptions.status.on_hold': 'On Hold',
        'prescriptions.status.completed': 'Completed',
        'prescriptions.status.discontinued': 'Discontinued',
        'prescriptions.status.cancelled': 'Cancelled',
        'prescriptions.status_legend.active_description': 'Prescription is currently active and valid',
        'prescriptions.status_legend.on_hold_description': 'Temporarily paused by provider',
        'prescriptions.status_legend.completed_description': 'All refills used or duration ended',
        'prescriptions.status_legend.discontinued_description': 'Stopped by provider before completion',
        'prescriptions.status_legend.cancelled_description': 'Voided before being dispensed',
        'prescriptions.status_legend.expired_description': 'Past end date',
        'prescriptions.status_legend.needs_refill_description': 'Ending soon with refills available',
        'prescriptions.status_legend.renew_description': 'Create new prescription from existing',
        'prescriptions.status_legend.resume_description': 'Resume an on-hold prescription',
        'prescriptions.expired': 'Expired',
        'prescriptions.needs_refill': 'Needs Refill',
        'prescriptions.actions.renew': 'Renew',
        'prescriptions.actions.resume': 'Resume',
      };
      return translations[key] || key;
    },
  }),
}));

describe('StatusLegend', () => {
  describe('Popover Trigger', () => {
    it('renders the help button', () => {
      render(<StatusLegend />);

      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText('Status Legend')).toBeInTheDocument();
    });

    it('renders help icon', () => {
      render(<StatusLegend />);

      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Popover Content', () => {
    it('opens popover on click', async () => {
      const user = userEvent.setup();
      render(<StatusLegend />);

      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByText('Understanding prescription statuses')).toBeInTheDocument();
      });
    });

    it('displays all prescription statuses', async () => {
      const user = userEvent.setup();
      render(<StatusLegend />);

      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByText('Active')).toBeInTheDocument();
        expect(screen.getByText('On Hold')).toBeInTheDocument();
        expect(screen.getByText('Completed')).toBeInTheDocument();
        expect(screen.getByText('Discontinued')).toBeInTheDocument();
        expect(screen.getByText('Cancelled')).toBeInTheDocument();
      });
    });

    it('displays status descriptions', async () => {
      const user = userEvent.setup();
      render(<StatusLegend />);

      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByText('Prescription is currently active and valid')).toBeInTheDocument();
        expect(screen.getByText('Temporarily paused by provider')).toBeInTheDocument();
      });
    });

    it('displays badges section', async () => {
      const user = userEvent.setup();
      render(<StatusLegend />);

      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByText('Additional Badges')).toBeInTheDocument();
        expect(screen.getByText('Expired')).toBeInTheDocument();
        expect(screen.getByText('Needs Refill')).toBeInTheDocument();
      });
    });

    it('displays actions section', async () => {
      const user = userEvent.setup();
      render(<StatusLegend />);

      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByText('Available Actions')).toBeInTheDocument();
        expect(screen.getByText('Renew')).toBeInTheDocument();
        expect(screen.getByText('Resume')).toBeInTheDocument();
      });
    });
  });
});

describe('StatusLegendInline', () => {
  it('renders title with help icon', () => {
    render(<StatusLegendInline />);

    expect(screen.getByText('Status Legend')).toBeInTheDocument();
  });

  it('renders all status badges', () => {
    render(<StatusLegendInline />);

    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('On Hold')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Discontinued')).toBeInTheDocument();
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
  });

  it('renders colored status indicators', () => {
    render(<StatusLegendInline />);

    // Check for colored dots
    const greenDot = document.querySelector('.bg-green-500');
    const yellowDot = document.querySelector('.bg-yellow-500');
    const grayDot = document.querySelector('.bg-gray-500');
    const orangeDot = document.querySelector('.bg-orange-500');
    const redDot = document.querySelector('.bg-red-500');

    expect(greenDot).toBeInTheDocument();
    expect(yellowDot).toBeInTheDocument();
    expect(grayDot).toBeInTheDocument();
    expect(orangeDot).toBeInTheDocument();
    expect(redDot).toBeInTheDocument();
  });

  it('renders in a card container', () => {
    render(<StatusLegendInline />);

    const card = document.querySelector('.rounded-lg.border.bg-card');
    expect(card).toBeInTheDocument();
  });

  it('uses grid layout for status items', () => {
    render(<StatusLegendInline />);

    const grid = document.querySelector('.grid');
    expect(grid).toBeInTheDocument();
  });
});
