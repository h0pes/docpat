/**
 * TemplateHelpDrawer Component Tests
 *
 * Tests for the template help documentation drawer component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateHelpDrawer } from '../TemplateHelpDrawer';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('TemplateHelpDrawer', () => {
  describe('Trigger Button', () => {
    it('renders help button', () => {
      render(<TemplateHelpDrawer />);

      expect(screen.getByText('documents.help.title')).toBeInTheDocument();
    });

    it('opens drawer when help button is clicked', async () => {
      const user = userEvent.setup();
      render(<TemplateHelpDrawer />);

      await user.click(screen.getByText('documents.help.title'));

      await waitFor(() => {
        expect(screen.getByText('documents.help.description')).toBeInTheDocument();
      });
    });
  });

  describe('Controlled Mode', () => {
    it('opens drawer when open prop is true', () => {
      render(<TemplateHelpDrawer open={true} onOpenChange={vi.fn()} />);

      expect(screen.getByText('documents.help.description')).toBeInTheDocument();
    });

    it('calls onOpenChange when drawer state changes', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(<TemplateHelpDrawer open={false} onOpenChange={onOpenChange} />);

      await user.click(screen.getByText('documents.help.title'));

      expect(onOpenChange).toHaveBeenCalledWith(true);
    });
  });

  describe('Help Content Sections', () => {
    it('renders basics section', async () => {
      const user = userEvent.setup();
      render(<TemplateHelpDrawer />);

      await user.click(screen.getByText('documents.help.title'));

      await waitFor(() => {
        expect(screen.getByText('documents.help.basics.title')).toBeInTheDocument();
      });
    });

    it('renders conditionals section', async () => {
      const user = userEvent.setup();
      render(<TemplateHelpDrawer />);

      await user.click(screen.getByText('documents.help.title'));

      await waitFor(() => {
        expect(screen.getByText('documents.help.conditionals.title')).toBeInTheDocument();
      });
    });

    it('renders loops section', async () => {
      const user = userEvent.setup();
      render(<TemplateHelpDrawer />);

      await user.click(screen.getByText('documents.help.title'));

      await waitFor(() => {
        expect(screen.getByText('documents.help.loops.title')).toBeInTheDocument();
      });
    });

    it('renders best practices section', async () => {
      const user = userEvent.setup();
      render(<TemplateHelpDrawer />);

      await user.click(screen.getByText('documents.help.title'));

      await waitFor(() => {
        expect(screen.getByText('documents.help.best_practices.title')).toBeInTheDocument();
      });
    });

    it('renders patterns section', async () => {
      const user = userEvent.setup();
      render(<TemplateHelpDrawer />);

      await user.click(screen.getByText('documents.help.title'));

      await waitFor(() => {
        expect(screen.getByText('documents.help.patterns.title')).toBeInTheDocument();
      });
    });

    it('renders troubleshooting section', async () => {
      const user = userEvent.setup();
      render(<TemplateHelpDrawer />);

      await user.click(screen.getByText('documents.help.title'));

      await waitFor(() => {
        expect(screen.getByText('documents.help.troubleshooting.title')).toBeInTheDocument();
      });
    });
  });

  describe('Accordion Behavior', () => {
    it('expands basics section by default', async () => {
      const user = userEvent.setup();
      render(<TemplateHelpDrawer />);

      await user.click(screen.getByText('documents.help.title'));

      await waitFor(() => {
        // Basics section should be expanded showing its content
        expect(screen.getByText('documents.help.basics.variables')).toBeInTheDocument();
      });
    });

    it('expands section when clicked', async () => {
      const user = userEvent.setup();
      render(<TemplateHelpDrawer />);

      await user.click(screen.getByText('documents.help.title'));

      await waitFor(() => {
        expect(screen.getByText('documents.help.conditionals.title')).toBeInTheDocument();
      });

      await user.click(screen.getByText('documents.help.conditionals.title'));

      await waitFor(() => {
        expect(screen.getByText('documents.help.conditionals.desc')).toBeInTheDocument();
      });
    });
  });

  describe('Code Examples', () => {
    it('displays code examples in basics section', async () => {
      const user = userEvent.setup();
      render(<TemplateHelpDrawer />);

      await user.click(screen.getByText('documents.help.title'));

      await waitFor(() => {
        // Should show code examples with patient variables
        const codeBlocks = document.querySelectorAll('pre code');
        expect(codeBlocks.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Alerts', () => {
    it('displays troubleshooting alert', async () => {
      const user = userEvent.setup();
      render(<TemplateHelpDrawer />);

      await user.click(screen.getByText('documents.help.title'));

      await waitFor(() => {
        expect(screen.getByText('documents.help.troubleshooting.title')).toBeInTheDocument();
      });

      await user.click(screen.getByText('documents.help.troubleshooting.title'));

      await waitFor(() => {
        expect(screen.getByText('documents.help.troubleshooting.undefined_vars')).toBeInTheDocument();
      });
    });
  });
});
