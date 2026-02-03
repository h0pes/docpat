/**
 * HelpPage Component Tests
 *
 * Tests for the main help center page with tabbed navigation.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HelpPage } from '../HelpPage';

// Mock all child components
vi.mock('@/components/help', () => ({
  HelpSearch: ({ onSearch }: { onSearch: (query: string) => void }) => (
    <input
      data-testid="help-search"
      placeholder="Search..."
      onChange={(e) => onSearch(e.target.value)}
    />
  ),
  GettingStartedSection: () => <div data-testid="getting-started-section">Getting Started</div>,
  FeatureGuideSection: ({ searchQuery }: { searchQuery?: string }) => (
    <div data-testid="feature-guide-section">Feature Guide {searchQuery && `(searching: ${searchQuery})`}</div>
  ),
  FAQSection: ({ searchQuery }: { searchQuery?: string }) => (
    <div data-testid="faq-section">FAQ {searchQuery && `(searching: ${searchQuery})`}</div>
  ),
  TroubleshootingSection: ({ searchQuery }: { searchQuery?: string }) => (
    <div data-testid="troubleshooting-section">Troubleshooting {searchQuery && `(searching: ${searchQuery})`}</div>
  ),
  KeyboardShortcutsSection: () => <div data-testid="shortcuts-section">Keyboard Shortcuts</div>,
}));

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'help.title': 'Help Center',
        'help.description': 'Find answers and learn how to use DocPat',
        'help.download_manual': 'Download Manual',
        'help.search_placeholder': 'Search help...',
        'help.tabs.overview': 'Overview',
        'help.tabs.getting_started': 'Getting Started',
        'help.tabs.features': 'Features',
        'help.tabs.faq': 'FAQ',
        'help.tabs.troubleshooting': 'Troubleshooting',
        'help.tabs.shortcuts': 'Shortcuts',
        'help.overview.title': 'Welcome to DocPat Help',
        'help.overview.subtitle': 'Your guide to using DocPat',
        'help.overview.intro': 'DocPat is a medical practice management system.',
        'help.overview.quick_links': 'Quick Links',
        'help.overview.quick_links_description': 'Jump to common topics',
        'help.overview.link_new_patient': 'Add a new patient',
        'help.overview.link_schedule': 'Schedule an appointment',
        'help.overview.link_visit': 'Record a visit',
        'help.overview.link_prescription': 'Create a prescription',
        'help.overview.link_documents': 'Generate documents',
        'help.overview.support_title': 'Need More Help?',
        'help.overview.support_description': 'Contact your administrator for assistance.',
        'help.overview.version': 'Version',
        'help.overview.last_updated': 'Last Updated',
      };
      return translations[key] || key;
    },
    i18n: {
      language: 'en',
    },
  }),
}));

describe('HelpPage', () => {
  describe('Rendering', () => {
    it('renders page title and description', () => {
      render(<HelpPage />);

      expect(screen.getByText('Help Center')).toBeInTheDocument();
      expect(screen.getByText('Find answers and learn how to use DocPat')).toBeInTheDocument();
    });

    it('renders download manual button', () => {
      render(<HelpPage />);

      const downloadLink = screen.getByRole('link', { name: /Download Manual/i });
      expect(downloadLink).toBeInTheDocument();
      expect(downloadLink).toHaveAttribute('href', '/docs/user-manual-en.pdf');
      expect(downloadLink).toHaveAttribute('download');
    });

    it('renders search input', () => {
      render(<HelpPage />);

      expect(screen.getByTestId('help-search')).toBeInTheDocument();
    });

    it('renders all tab triggers', () => {
      render(<HelpPage />);

      expect(screen.getByRole('tab', { name: /Overview/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Getting Started/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Features/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /FAQ/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Troubleshooting/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Shortcuts/i })).toBeInTheDocument();
    });

    it('shows overview tab content by default', () => {
      render(<HelpPage />);

      expect(screen.getByText('Welcome to DocPat Help')).toBeInTheDocument();
      expect(screen.getByText('Quick Links')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('switches to Getting Started tab when clicked', async () => {
      const user = userEvent.setup();
      render(<HelpPage />);

      await user.click(screen.getByRole('tab', { name: /Getting Started/i }));

      await waitFor(() => {
        expect(screen.getByTestId('getting-started-section')).toBeInTheDocument();
      });
    });

    it('switches to Features tab when clicked', async () => {
      const user = userEvent.setup();
      render(<HelpPage />);

      await user.click(screen.getByRole('tab', { name: /Features/i }));

      await waitFor(() => {
        expect(screen.getByTestId('feature-guide-section')).toBeInTheDocument();
      });
    });

    it('switches to FAQ tab when clicked', async () => {
      const user = userEvent.setup();
      render(<HelpPage />);

      await user.click(screen.getByRole('tab', { name: /FAQ/i }));

      await waitFor(() => {
        expect(screen.getByTestId('faq-section')).toBeInTheDocument();
      });
    });

    it('switches to Troubleshooting tab when clicked', async () => {
      const user = userEvent.setup();
      render(<HelpPage />);

      await user.click(screen.getByRole('tab', { name: /Troubleshooting/i }));

      await waitFor(() => {
        expect(screen.getByTestId('troubleshooting-section')).toBeInTheDocument();
      });
    });

    it('switches to Shortcuts tab when clicked', async () => {
      const user = userEvent.setup();
      render(<HelpPage />);

      await user.click(screen.getByRole('tab', { name: /Shortcuts/i }));

      await waitFor(() => {
        expect(screen.getByTestId('shortcuts-section')).toBeInTheDocument();
      });
    });
  });

  describe('Search Functionality', () => {
    it('displays search query badge when searching', async () => {
      const user = userEvent.setup();
      render(<HelpPage />);

      const searchInput = screen.getByTestId('help-search');
      await user.type(searchInput, 'test query');

      await waitFor(() => {
        expect(screen.getByText('test query')).toBeInTheDocument();
        expect(screen.getByText('Searching for:')).toBeInTheDocument();
      });
    });

    it('shows clear button when searching', async () => {
      const user = userEvent.setup();
      render(<HelpPage />);

      const searchInput = screen.getByTestId('help-search');
      await user.type(searchInput, 'test');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument();
      });
    });

    it('switches to FAQ tab when searching from non-searchable tab', async () => {
      const user = userEvent.setup();
      render(<HelpPage />);

      // Start on Overview tab (non-searchable)
      expect(screen.getByText('Welcome to DocPat Help')).toBeInTheDocument();

      // Type in search
      const searchInput = screen.getByTestId('help-search');
      await user.type(searchInput, 'test');

      await waitFor(() => {
        // Should switch to FAQ tab
        expect(screen.getByTestId('faq-section')).toBeInTheDocument();
      });
    });

    it('passes search query to searchable tabs', async () => {
      const user = userEvent.setup();
      render(<HelpPage />);

      // Go to FAQ tab first
      await user.click(screen.getByRole('tab', { name: /FAQ/i }));

      // Type in search
      const searchInput = screen.getByTestId('help-search');
      await user.type(searchInput, 'password');

      await waitFor(() => {
        expect(screen.getByText('FAQ (searching: password)')).toBeInTheDocument();
      });
    });

    it('clears search when clear button is clicked', async () => {
      const user = userEvent.setup();
      render(<HelpPage />);

      // Type in search to trigger switch to FAQ
      const searchInput = screen.getByTestId('help-search');
      await user.type(searchInput, 'test');

      await waitFor(() => {
        expect(screen.getByText('test')).toBeInTheDocument();
      });

      // Click clear
      await user.click(screen.getByRole('button', { name: 'Clear' }));

      await waitFor(() => {
        expect(screen.queryByText('Searching for:')).not.toBeInTheDocument();
      });
    });
  });

  describe('Overview Section', () => {
    it('renders welcome card', () => {
      render(<HelpPage />);

      expect(screen.getByText('Welcome to DocPat Help')).toBeInTheDocument();
      expect(screen.getByText('Your guide to using DocPat')).toBeInTheDocument();
    });

    it('renders quick links', () => {
      render(<HelpPage />);

      expect(screen.getByText('Add a new patient')).toBeInTheDocument();
      expect(screen.getByText('Schedule an appointment')).toBeInTheDocument();
      expect(screen.getByText('Record a visit')).toBeInTheDocument();
      expect(screen.getByText('Create a prescription')).toBeInTheDocument();
      expect(screen.getByText('Generate documents')).toBeInTheDocument();
    });

    it('renders support card', () => {
      render(<HelpPage />);

      expect(screen.getByText('Need More Help?')).toBeInTheDocument();
      expect(screen.getByText('Contact your administrator for assistance.')).toBeInTheDocument();
    });

    it('renders version info', () => {
      render(<HelpPage />);

      expect(screen.getByText(/Version: 1.0.0/)).toBeInTheDocument();
      expect(screen.getByText(/Last Updated: January 2026/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper tab panel structure', () => {
      render(<HelpPage />);

      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBe(6);

      // Check first tab is selected
      expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    });

    it('tabs are keyboard navigable', async () => {
      const user = userEvent.setup();
      render(<HelpPage />);

      // Focus on first tab
      const firstTab = screen.getByRole('tab', { name: /Overview/i });
      firstTab.focus();

      // Tab should have focus
      expect(document.activeElement).toBe(firstTab);
    });
  });

  describe('PDF Download', () => {
    it('links to English manual by default', () => {
      render(<HelpPage />);

      const downloadLink = screen.getByRole('link', { name: /Download Manual/i });
      expect(downloadLink).toHaveAttribute('href', '/docs/user-manual-en.pdf');
    });
  });
});
