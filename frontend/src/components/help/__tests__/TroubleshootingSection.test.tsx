/**
 * TroubleshootingSection Component Tests
 *
 * Tests for the troubleshooting section component with category filtering and search.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TroubleshootingSection } from '../TroubleshootingSection';

// Mock troubleshooting data
const mockTroubleshootingTranslations: Record<string, string | string[]> = {
  'help.troubleshooting.title': 'Troubleshooting',
  'help.troubleshooting.subtitle': 'Find solutions to common issues',
  'help.troubleshooting.intro': 'Browse through common issues and solutions',
  'help.troubleshooting.categories.login': 'Login Issues',
  'help.troubleshooting.categories.performance': 'Performance',
  'help.troubleshooting.categories.data': 'Data & Sync',
  'help.troubleshooting.categories.printing': 'Printing',
  'help.troubleshooting.categories.notifications': 'Notifications',
  'help.troubleshooting.severity.info': 'Info',
  'help.troubleshooting.severity.warning': 'Warning',
  'help.troubleshooting.severity.error': 'Error',
  'help.troubleshooting.items.cannot_login.category': 'login',
  'help.troubleshooting.items.cannot_login.severity': 'error',
  'help.troubleshooting.items.cannot_login.issue': 'Cannot log in to the system',
  'help.troubleshooting.items.cannot_login.solutions': [
    'Verify your username and password',
    'Check Caps Lock is not enabled',
    'Clear browser cache and cookies',
    'Contact administrator',
  ],
  'help.troubleshooting.items.mfa_not_working.category': 'login',
  'help.troubleshooting.items.mfa_not_working.severity': 'warning',
  'help.troubleshooting.items.mfa_not_working.issue': 'MFA code not working',
  'help.troubleshooting.items.mfa_not_working.solutions': [
    'Ensure device time is synchronized',
    'Wait for new code (30 seconds)',
    'Contact admin to reset MFA',
  ],
  'help.troubleshooting.items.slow_loading.category': 'performance',
  'help.troubleshooting.items.slow_loading.severity': 'info',
  'help.troubleshooting.items.slow_loading.issue': 'Pages loading slowly',
  'help.troubleshooting.items.slow_loading.solutions': [
    'Check your internet connection',
    'Clear browser cache',
    'Close unnecessary browser tabs',
  ],
  'help.troubleshooting.items.data_not_saving.category': 'data',
  'help.troubleshooting.items.data_not_saving.severity': 'error',
  'help.troubleshooting.items.data_not_saving.issue': 'Data not saving',
  'help.troubleshooting.items.data_not_saving.solutions': [
    'Check for validation errors',
    'Verify internet connection',
    'Refresh page and retry',
  ],
  'help.troubleshooting.items.pdf_not_generating.category': 'printing',
  'help.troubleshooting.items.pdf_not_generating.severity': 'warning',
  'help.troubleshooting.items.pdf_not_generating.issue': 'PDF not generating',
  'help.troubleshooting.items.pdf_not_generating.solutions': [
    'Wait a few moments',
    'Check document status',
    'Retry generation',
  ],
  'help.no_results': 'No results found for "{{query}}"',
};

// Mock i18next with troubleshooting data
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (
      key: string,
      params?: { returnObjects?: boolean } | Record<string, string>
    ) => {
      const value = mockTroubleshootingTranslations[key];

      // Handle returnObjects for solutions arrays
      if (params && 'returnObjects' in params && params.returnObjects) {
        return value;
      }

      // Handle template parameters
      if (typeof value === 'string' && params && typeof params === 'object') {
        let result = value;
        Object.entries(params).forEach(([k, v]) => {
          if (typeof v === 'string') {
            result = result.replace(`{{${k}}}`, v);
          }
        });
        return result;
      }

      return value || key;
    },
  }),
}));

describe('TroubleshootingSection', () => {
  describe('Rendering', () => {
    it('renders section with title and subtitle', () => {
      render(<TroubleshootingSection />);

      expect(screen.getByText('Troubleshooting')).toBeInTheDocument();
      expect(screen.getByText('Find solutions to common issues')).toBeInTheDocument();
    });

    it('renders all category filter buttons', () => {
      render(<TroubleshootingSection />);

      expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Login Issues' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Performance' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Data & Sync' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Printing' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
    });

    it('renders troubleshooting items', () => {
      render(<TroubleshootingSection />);

      expect(screen.getByText('Cannot log in to the system')).toBeInTheDocument();
      expect(screen.getByText('MFA code not working')).toBeInTheDocument();
      expect(screen.getByText('Pages loading slowly')).toBeInTheDocument();
    });
  });

  describe('Severity Indicators', () => {
    it('displays severity badges for items', () => {
      render(<TroubleshootingSection />);

      expect(screen.getAllByText('Error').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Warning').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Info').length).toBeGreaterThan(0);
    });
  });

  describe('Category Filtering', () => {
    it('filters items by category when category button is clicked', async () => {
      const user = userEvent.setup();
      render(<TroubleshootingSection />);

      // Click on Login Issues category
      await user.click(screen.getByRole('button', { name: 'Login Issues' }));

      // Should show login issues
      expect(screen.getByText('Cannot log in to the system')).toBeInTheDocument();
      expect(screen.getByText('MFA code not working')).toBeInTheDocument();

      // Should not show performance issues
      expect(screen.queryByText('Pages loading slowly')).not.toBeInTheDocument();
    });

    it('shows all items when All button is clicked', async () => {
      const user = userEvent.setup();
      render(<TroubleshootingSection />);

      // First filter by category
      await user.click(screen.getByRole('button', { name: 'Performance' }));

      // Then click All
      await user.click(screen.getByRole('button', { name: 'All' }));

      // Should show all items
      expect(screen.getByText('Cannot log in to the system')).toBeInTheDocument();
      expect(screen.getByText('Pages loading slowly')).toBeInTheDocument();
    });

    it('highlights selected category button', async () => {
      const user = userEvent.setup();
      render(<TroubleshootingSection />);

      const loginButton = screen.getByRole('button', { name: 'Login Issues' });
      await user.click(loginButton);

      // The button should be selected (variant changes)
      expect(loginButton).not.toHaveAttribute('data-variant', 'outline');
    });
  });

  describe('Search Filtering', () => {
    it('filters items by search query in issue title', () => {
      render(<TroubleshootingSection searchQuery="log in" />);

      // Text is split by highlight marks, look for partial content
      expect(screen.getByText(/Cannot/)).toBeInTheDocument();
    });

    it('searches in solutions as well', () => {
      render(<TroubleshootingSection searchQuery="Caps" />);

      // Should find "Cannot login" because solution contains "Caps"
      expect(screen.getByText(/Cannot/)).toBeInTheDocument();
    });

    it('is case-insensitive', () => {
      render(<TroubleshootingSection searchQuery="pdf" />);

      // Text is split by highlight marks: "PDF" (highlighted) + " not generating"
      expect(screen.getByText(/not generating/)).toBeInTheDocument();
    });

    it('shows no results message when no matches', () => {
      render(<TroubleshootingSection searchQuery="nonexistent issue xyz" />);

      expect(
        screen.getByText('No results found for "nonexistent issue xyz"')
      ).toBeInTheDocument();
    });
  });

  describe('Accordion Behavior', () => {
    it('expands item to show solutions when clicked', async () => {
      const user = userEvent.setup();
      render(<TroubleshootingSection />);

      const trigger = screen.getByText('Cannot log in to the system');
      await user.click(trigger);

      await waitFor(() => {
        expect(screen.getByText('Verify your username and password')).toBeInTheDocument();
      });
    });

    it('shows numbered solution steps', async () => {
      const user = userEvent.setup();
      const { container } = render(<TroubleshootingSection />);

      const trigger = screen.getByText('Cannot log in to the system');
      await user.click(trigger);

      await waitFor(() => {
        // Should show step numbers in spans with specific classes
        const stepNumbers = container.querySelectorAll('.rounded-full');
        expect(stepNumbers.length).toBeGreaterThan(0);
      });
    });

    it('collapses item when clicked again', async () => {
      const user = userEvent.setup();
      render(<TroubleshootingSection />);

      const trigger = screen.getByText('Cannot log in to the system');

      // Expand
      await user.click(trigger);

      await waitFor(() => {
        expect(screen.getByText('Verify your username and password')).toBeInTheDocument();
      });

      // Collapse
      await user.click(trigger);

      await waitFor(() => {
        expect(
          screen.queryByText('Verify your username and password')
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('Search Highlighting', () => {
    it('highlights matching text in issue titles', () => {
      const { container } = render(<TroubleshootingSection searchQuery="log" />);

      const highlights = container.querySelectorAll('mark');
      expect(highlights.length).toBeGreaterThan(0);
    });

    it('highlights matching text in solutions', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <TroubleshootingSection searchQuery="Caps" />
      );

      // Expand to show solutions
      const trigger = screen.getByText(/Cannot log in/);
      await user.click(trigger);

      await waitFor(() => {
        const highlights = container.querySelectorAll('mark');
        expect(highlights.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Category Badges', () => {
    it('shows item count badges when grouped by category', () => {
      render(<TroubleshootingSection />);

      // Find badges showing counts
      const badges = screen.getAllByText(/^\d+$/);
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  describe('Severity Icons', () => {
    it('displays appropriate icons for different severities', () => {
      const { container } = render(<TroubleshootingSection />);

      // Check that SVG icons are rendered
      const svgIcons = container.querySelectorAll('svg');
      expect(svgIcons.length).toBeGreaterThan(0);
    });
  });
});
