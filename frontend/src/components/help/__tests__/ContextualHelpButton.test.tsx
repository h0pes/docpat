/**
 * ContextualHelpButton Component Tests
 *
 * Tests for the contextual help button component with tooltip and popover variants.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContextualHelpButton } from '../ContextualHelpButton';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('ContextualHelpButton', () => {
  describe('Rendering', () => {
    it('renders help button with default tooltip variant', () => {
      render(<ContextualHelpButton helpKey="test_help" />);

      expect(screen.getByRole('button', { name: 'help.title' })).toBeInTheDocument();
    });

    it('renders with popover variant', () => {
      render(<ContextualHelpButton helpKey="test_help" variant="popover" />);

      expect(screen.getByRole('button', { name: 'help.title' })).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<ContextualHelpButton helpKey="test_help" className="custom-class" />);

      expect(screen.getByRole('button')).toHaveClass('custom-class');
    });
  });

  describe('Size Variants', () => {
    it('renders small size', () => {
      render(<ContextualHelpButton helpKey="test_help" size="sm" />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-5', 'w-5');
    });

    it('renders medium size (default)', () => {
      render(<ContextualHelpButton helpKey="test_help" size="md" />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-6', 'w-6');
    });

    it('renders large size', () => {
      render(<ContextualHelpButton helpKey="test_help" size="lg" />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-7', 'w-7');
    });
  });

  describe('Tooltip Variant', () => {
    it('shows tooltip on hover', async () => {
      const user = userEvent.setup();
      render(<ContextualHelpButton helpKey="patients_list" variant="tooltip" />);

      const button = screen.getByRole('button');
      await user.hover(button);

      await waitFor(() => {
        // Tooltip may render multiple elements, use getAllByText
        const tooltips = screen.getAllByText('help.contextual.patients_list');
        expect(tooltips.length).toBeGreaterThan(0);
      });
    });

    it('uses custom content when provided', async () => {
      const user = userEvent.setup();
      render(
        <ContextualHelpButton
          helpKey="test"
          variant="tooltip"
          content="Custom help text"
        />
      );

      const button = screen.getByRole('button');
      await user.hover(button);

      await waitFor(() => {
        const tooltips = screen.getAllByText('Custom help text');
        expect(tooltips.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Popover Variant', () => {
    it('shows popover on click', async () => {
      const user = userEvent.setup();
      render(<ContextualHelpButton helpKey="prescription_interactions" variant="popover" />);

      const button = screen.getByRole('button');
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText('help.contextual.prescription_interactions')).toBeInTheDocument();
      });
    });

    it('shows title when provided', async () => {
      const user = userEvent.setup();
      render(
        <ContextualHelpButton
          helpKey="test"
          variant="popover"
          title="Custom Title"
        />
      );

      const button = screen.getByRole('button');
      await user.click(button);

      await waitFor(() => {
        // Look for the title in the popover content
        const heading = screen.getByRole('heading', { level: 4 });
        expect(heading).toBeInTheDocument();
      });
    });

    it('closes popover when clicking outside', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <ContextualHelpButton helpKey="test" variant="popover" />
          <button data-testid="outside">Outside</button>
        </div>
      );

      const helpButton = screen.getByRole('button', { name: 'help.title' });
      await user.click(helpButton);

      await waitFor(() => {
        expect(screen.getByText('help.contextual.test')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('outside'));

      await waitFor(() => {
        expect(screen.queryByText('help.contextual.test')).not.toBeInTheDocument();
      });
    });

    it('uses custom content when provided', async () => {
      const user = userEvent.setup();
      render(
        <ContextualHelpButton
          helpKey="test"
          variant="popover"
          content="Custom popover content"
        />
      );

      const button = screen.getByRole('button');
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText('Custom popover content')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper aria-label', () => {
      render(<ContextualHelpButton helpKey="test" />);

      expect(screen.getByRole('button', { name: 'help.title' })).toBeInTheDocument();
    });

    it('is keyboard accessible for tooltip', async () => {
      const user = userEvent.setup();
      render(<ContextualHelpButton helpKey="test" variant="tooltip" />);

      const button = screen.getByRole('button');
      await user.tab();

      expect(button).toHaveFocus();
    });

    it('is keyboard accessible for popover', async () => {
      const user = userEvent.setup();
      render(<ContextualHelpButton helpKey="test" variant="popover" />);

      const button = screen.getByRole('button');
      await user.tab();

      expect(button).toHaveFocus();

      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('help.contextual.test')).toBeInTheDocument();
      });
    });
  });
});
