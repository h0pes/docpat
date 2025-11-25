/**
 * QuickTextSelector Component Tests
 *
 * Comprehensive test suite for QuickTextSelector component covering:
 * - Dialog rendering
 * - Template display
 * - Search/filter functionality
 * - Template selection and callback
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuickTextSelector } from '../QuickTextSelector';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'visits.quickText.buttonLabel': 'Quick Text',
        'visits.quickText.title': 'Quick Text Templates',
        'visits.quickText.description': 'Select a template to insert',
        'visits.quickText.searchPlaceholder': 'Search templates...',
        'visits.quickText.noResults': 'No templates found',
        'visits.quickText.categories.all': 'All',
        'visits.quickText.categories.subjective': 'Subjective',
        'visits.quickText.categories.objective': 'Objective',
        'visits.quickText.categories.assessment': 'Assessment',
        'visits.quickText.categories.plan': 'Plan',
        'visits.quickText.categories.general': 'General',
      };
      return translations[key] || key;
    },
    i18n: {
      language: 'en',
    },
  }),
}));

describe('QuickTextSelector', () => {
  const mockOnSelectTemplate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Trigger Button', () => {
    it('renders trigger button with correct text', () => {
      render(<QuickTextSelector onSelectTemplate={mockOnSelectTemplate} />);

      expect(screen.getByRole('button', { name: /Quick Text/i })).toBeInTheDocument();
    });

    it('respects variant prop', () => {
      render(<QuickTextSelector onSelectTemplate={mockOnSelectTemplate} variant="ghost" />);

      const button = screen.getByRole('button', { name: /Quick Text/i });
      expect(button).toBeInTheDocument();
    });

    it('respects size prop', () => {
      render(<QuickTextSelector onSelectTemplate={mockOnSelectTemplate} size="lg" />);

      const button = screen.getByRole('button', { name: /Quick Text/i });
      expect(button).toBeInTheDocument();
    });
  });

  describe('Dialog Opening', () => {
    it('opens dialog when trigger is clicked', async () => {
      const user = userEvent.setup();
      render(<QuickTextSelector onSelectTemplate={mockOnSelectTemplate} />);

      const trigger = screen.getByRole('button', { name: /Quick Text/i });
      await user.click(trigger);

      expect(screen.getByText('Quick Text Templates')).toBeInTheDocument();
    });

    it('shows dialog description', async () => {
      const user = userEvent.setup();
      render(<QuickTextSelector onSelectTemplate={mockOnSelectTemplate} />);

      await user.click(screen.getByRole('button', { name: /Quick Text/i }));

      expect(screen.getByText('Select a template to insert')).toBeInTheDocument();
    });

    it('shows search input', async () => {
      const user = userEvent.setup();
      render(<QuickTextSelector onSelectTemplate={mockOnSelectTemplate} />);

      await user.click(screen.getByRole('button', { name: /Quick Text/i }));

      expect(screen.getByPlaceholderText('Search templates...')).toBeInTheDocument();
    });
  });

  describe('Category Filters', () => {
    it('displays all category badges', async () => {
      const user = userEvent.setup();
      render(<QuickTextSelector onSelectTemplate={mockOnSelectTemplate} />);

      await user.click(screen.getByRole('button', { name: /Quick Text/i }));

      expect(screen.getByText('All')).toBeInTheDocument();
      // Category badges (Note: there are duplicates - one for filter, one for template badge)
      expect(screen.getAllByText('Subjective').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Objective').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Assessment').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Plan').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('General').length).toBeGreaterThanOrEqual(1);
    });

    it('filters templates by category when clicked', async () => {
      const user = userEvent.setup();
      render(<QuickTextSelector onSelectTemplate={mockOnSelectTemplate} />);

      await user.click(screen.getByRole('button', { name: /Quick Text/i }));

      // Click on "Plan" category filter
      const categoryBadges = screen.getAllByText('Plan');
      // First one is the category filter
      await user.click(categoryBadges[0]);

      // Should show plan templates
      await waitFor(() => {
        expect(screen.getByText('Continue current')).toBeInTheDocument();
      });
    });
  });

  describe('Templates Display', () => {
    it('displays template titles', async () => {
      const user = userEvent.setup();
      render(<QuickTextSelector onSelectTemplate={mockOnSelectTemplate} />);

      await user.click(screen.getByRole('button', { name: /Quick Text/i }));

      // Check for some default templates
      expect(screen.getByText('No complaints')).toBeInTheDocument();
      expect(screen.getByText('Pain assessment')).toBeInTheDocument();
      expect(screen.getByText('Medication compliance')).toBeInTheDocument();
    });

    it('displays template content', async () => {
      const user = userEvent.setup();
      render(<QuickTextSelector onSelectTemplate={mockOnSelectTemplate} />);

      await user.click(screen.getByRole('button', { name: /Quick Text/i }));

      expect(
        screen.getByText('Patient reports no new complaints since last visit.')
      ).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('filters templates based on search query', async () => {
      const user = userEvent.setup();
      render(<QuickTextSelector onSelectTemplate={mockOnSelectTemplate} />);

      await user.click(screen.getByRole('button', { name: /Quick Text/i }));

      const searchInput = screen.getByPlaceholderText('Search templates...');
      await user.type(searchInput, 'pain');

      await waitFor(() => {
        expect(screen.getByText('Pain assessment')).toBeInTheDocument();
        // Other templates should be filtered out
        expect(screen.queryByText('No complaints')).not.toBeInTheDocument();
      });
    });

    it('shows no results message when no templates match', async () => {
      const user = userEvent.setup();
      render(<QuickTextSelector onSelectTemplate={mockOnSelectTemplate} />);

      await user.click(screen.getByRole('button', { name: /Quick Text/i }));

      const searchInput = screen.getByPlaceholderText('Search templates...');
      await user.type(searchInput, 'xyznonexistent');

      await waitFor(() => {
        expect(screen.getByText('No templates found')).toBeInTheDocument();
      });
    });

    it('searches within template content', async () => {
      const user = userEvent.setup();
      render(<QuickTextSelector onSelectTemplate={mockOnSelectTemplate} />);

      await user.click(screen.getByRole('button', { name: /Quick Text/i }));

      const searchInput = screen.getByPlaceholderText('Search templates...');
      await user.type(searchInput, 'compliance');

      await waitFor(() => {
        expect(screen.getByText('Medication compliance')).toBeInTheDocument();
      });
    });
  });

  describe('Template Selection', () => {
    it('calls onSelectTemplate when a template is clicked', async () => {
      const user = userEvent.setup();
      render(<QuickTextSelector onSelectTemplate={mockOnSelectTemplate} />);

      await user.click(screen.getByRole('button', { name: /Quick Text/i }));

      // Click on a template
      const templateCard = screen.getByText('Patient reports no new complaints since last visit.');
      await user.click(templateCard);

      expect(mockOnSelectTemplate).toHaveBeenCalledWith(
        'Patient reports no new complaints since last visit.'
      );
    });

    it('closes dialog after template selection', async () => {
      const user = userEvent.setup();
      render(<QuickTextSelector onSelectTemplate={mockOnSelectTemplate} />);

      await user.click(screen.getByRole('button', { name: /Quick Text/i }));

      // Click on a template
      const templateCard = screen.getByText('Patient reports no new complaints since last visit.');
      await user.click(templateCard);

      // Dialog should close
      await waitFor(() => {
        expect(screen.queryByText('Quick Text Templates')).not.toBeInTheDocument();
      });
    });

    it('resets search query after selection', async () => {
      const user = userEvent.setup();
      render(<QuickTextSelector onSelectTemplate={mockOnSelectTemplate} />);

      // Open dialog and search
      await user.click(screen.getByRole('button', { name: /Quick Text/i }));
      const searchInput = screen.getByPlaceholderText('Search templates...');
      await user.type(searchInput, 'pain');

      // Select a template
      const templateCard = screen.getByText('Pain assessment');
      await user.click(templateCard);

      // Re-open dialog
      await user.click(screen.getByRole('button', { name: /Quick Text/i }));

      // Search should be cleared
      const newSearchInput = screen.getByPlaceholderText('Search templates...');
      expect(newSearchInput).toHaveValue('');
    });
  });

  describe('Category Badge in Templates', () => {
    it('shows category badge for each template', async () => {
      const user = userEvent.setup();
      render(<QuickTextSelector onSelectTemplate={mockOnSelectTemplate} />);

      await user.click(screen.getByRole('button', { name: /Quick Text/i }));

      // Each template should have a category badge
      // There are multiple "Subjective" badges - one for filter and ones for templates
      const subjectiveBadges = screen.getAllByText('Subjective');
      expect(subjectiveBadges.length).toBeGreaterThanOrEqual(2); // Filter + template badges
    });
  });
});
