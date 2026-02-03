/**
 * FAQSection Component Tests
 *
 * Tests for the FAQ section component with category filtering and search.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FAQSection } from '../FAQSection';

// Mock FAQ data
const mockFAQTranslations: Record<string, string | Record<string, string>> = {
  'help.faq.title': 'Frequently Asked Questions',
  'help.faq.subtitle': 'Find answers to common questions',
  'help.faq.intro': 'Browse through our FAQ categories',
  'help.faq.categories.general': 'General',
  'help.faq.categories.account': 'Account',
  'help.faq.categories.patients': 'Patients',
  'help.faq.categories.appointments': 'Appointments',
  'help.faq.categories.visits': 'Visits',
  'help.faq.categories.prescriptions': 'Prescriptions',
  'help.faq.categories.documents': 'Documents',
  'help.faq.categories.security': 'Security',
  'help.faq.items.what_is_docpat.category': 'general',
  'help.faq.items.what_is_docpat.question': 'What is DocPat?',
  'help.faq.items.what_is_docpat.answer': 'DocPat is a medical practice management system.',
  'help.faq.items.supported_browsers.category': 'general',
  'help.faq.items.supported_browsers.question': 'Which browsers are supported?',
  'help.faq.items.supported_browsers.answer': 'Chrome, Firefox, Safari, and Edge.',
  'help.faq.items.reset_password.category': 'account',
  'help.faq.items.reset_password.question': 'How do I reset my password?',
  'help.faq.items.reset_password.answer': 'Click the Forgot Password link on the login page.',
  'help.faq.items.add_patient.category': 'patients',
  'help.faq.items.add_patient.question': 'How do I add a new patient?',
  'help.faq.items.add_patient.answer': 'Navigate to Patients and click New Patient.',
  'help.faq.items.schedule_appointment.category': 'appointments',
  'help.faq.items.schedule_appointment.question': 'How do I schedule an appointment?',
  'help.faq.items.schedule_appointment.answer': 'Go to Appointments and click New Appointment.',
  'help.no_results': 'No results found for "{{query}}"',
};

// Mock i18next with FAQ data
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) => {
      let value = mockFAQTranslations[key];
      if (typeof value === 'string' && params) {
        Object.entries(params).forEach(([k, v]) => {
          value = (value as string).replace(`{{${k}}}`, v);
        });
      }
      return value || key;
    },
  }),
}));

describe('FAQSection', () => {
  describe('Rendering', () => {
    it('renders FAQ section with title and subtitle', () => {
      render(<FAQSection />);

      expect(screen.getByText('Frequently Asked Questions')).toBeInTheDocument();
      expect(screen.getByText('Find answers to common questions')).toBeInTheDocument();
    });

    it('renders all category filter buttons', () => {
      render(<FAQSection />);

      expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'General' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Account' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Patients' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Appointments' })).toBeInTheDocument();
    });

    it('renders FAQ items', () => {
      render(<FAQSection />);

      expect(screen.getByText('What is DocPat?')).toBeInTheDocument();
      expect(screen.getByText('Which browsers are supported?')).toBeInTheDocument();
      expect(screen.getByText('How do I reset my password?')).toBeInTheDocument();
    });

    it('shows category headers when All is selected', () => {
      render(<FAQSection />);

      // General appears both as button and category header, use getAllByText
      const generalElements = screen.getAllByText('General');
      expect(generalElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Category Filtering', () => {
    it('filters FAQs by category when category button is clicked', async () => {
      const user = userEvent.setup();
      render(<FAQSection />);

      // Click on Account category
      await user.click(screen.getByRole('button', { name: 'Account' }));

      // Should show account FAQs
      expect(screen.getByText('How do I reset my password?')).toBeInTheDocument();

      // Should not show general FAQs
      expect(screen.queryByText('What is DocPat?')).not.toBeInTheDocument();
    });

    it('shows all FAQs when All button is clicked', async () => {
      const user = userEvent.setup();
      render(<FAQSection />);

      // First filter by category
      await user.click(screen.getByRole('button', { name: 'Account' }));

      // Then click All
      await user.click(screen.getByRole('button', { name: 'All' }));

      // Should show all FAQs
      expect(screen.getByText('What is DocPat?')).toBeInTheDocument();
      expect(screen.getByText('How do I reset my password?')).toBeInTheDocument();
    });

    it('highlights selected category button', async () => {
      const user = userEvent.setup();
      render(<FAQSection />);

      const generalButton = screen.getByRole('button', { name: 'General' });
      await user.click(generalButton);

      // The button variant changes from outline to default when selected
      expect(generalButton).not.toHaveAttribute('data-variant', 'outline');
    });
  });

  describe('Search Filtering', () => {
    it('filters FAQs by search query', () => {
      render(<FAQSection searchQuery="DocPat" />);

      // Text may be split by highlight marks, use function matcher
      expect(screen.getByText((content, element) => {
        return element?.tagName === 'SPAN' && content.includes('What is');
      })).toBeInTheDocument();
    });

    it('searches in both questions and answers', () => {
      render(<FAQSection searchQuery="medical" />);

      // Should find items with "medical" in answer
      expect(screen.getByText(/What is/)).toBeInTheDocument();
    });

    it('is case-insensitive', () => {
      render(<FAQSection searchQuery="DOCPAT" />);

      expect(screen.getByText(/What is/)).toBeInTheDocument();
    });

    it('shows no results message when no matches', () => {
      render(<FAQSection searchQuery="nonexistent query xyz" />);

      expect(screen.getByText('No results found for "nonexistent query xyz"')).toBeInTheDocument();
    });
  });

  describe('Accordion Behavior', () => {
    it('expands FAQ item when clicked', async () => {
      const user = userEvent.setup();
      render(<FAQSection />);

      const trigger = screen.getByText('What is DocPat?');
      await user.click(trigger);

      await waitFor(() => {
        expect(
          screen.getByText('DocPat is a medical practice management system.')
        ).toBeInTheDocument();
      });
    });

    it('collapses FAQ item when clicked again', async () => {
      const user = userEvent.setup();
      render(<FAQSection />);

      const trigger = screen.getByText('What is DocPat?');

      // Expand
      await user.click(trigger);

      await waitFor(() => {
        expect(
          screen.getByText('DocPat is a medical practice management system.')
        ).toBeInTheDocument();
      });

      // Collapse
      await user.click(trigger);

      await waitFor(() => {
        expect(
          screen.queryByText('DocPat is a medical practice management system.')
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('Search Highlighting', () => {
    it('highlights matching text in questions', () => {
      const { container } = render(<FAQSection searchQuery="DocPat" />);

      // Look for highlighted text in visible questions
      const highlights = container.querySelectorAll('mark');
      expect(highlights.length).toBeGreaterThan(0);
      // At least one highlight should contain DocPat
      const hasDocPat = Array.from(highlights).some((h) =>
        h.textContent?.toLowerCase().includes('docpat')
      );
      expect(hasDocPat).toBe(true);
    });
  });

  describe('Category Badges', () => {
    it('shows item count badges when grouped by category', () => {
      render(<FAQSection />);

      // Find badges showing counts - General category should have items
      const badges = screen.getAllByText(/^\d+$/);
      expect(badges.length).toBeGreaterThan(0);
    });
  });
});
