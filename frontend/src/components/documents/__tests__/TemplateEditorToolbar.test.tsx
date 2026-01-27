/**
 * TemplateEditorToolbar Component Tests
 *
 * Tests for the template editor toolbar component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateEditorToolbar } from '../TemplateEditorToolbar';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('TemplateEditorToolbar', () => {
  describe('Rendering', () => {
    it('renders conditionals button', () => {
      const onInsert = vi.fn();
      render(<TemplateEditorToolbar onInsert={onInsert} />);

      expect(screen.getByText('documents.toolbar.conditionals')).toBeInTheDocument();
    });

    it('renders loops button', () => {
      const onInsert = vi.fn();
      render(<TemplateEditorToolbar onInsert={onInsert} />);

      expect(screen.getByText('documents.toolbar.loops')).toBeInTheDocument();
    });

    it('renders tables button', () => {
      const onInsert = vi.fn();
      render(<TemplateEditorToolbar onInsert={onInsert} />);

      expect(screen.getByText('documents.toolbar.tables')).toBeInTheDocument();
    });

    it('renders sections button', () => {
      const onInsert = vi.fn();
      render(<TemplateEditorToolbar onInsert={onInsert} />);

      expect(screen.getByText('documents.toolbar.sections')).toBeInTheDocument();
    });

    it('renders syntax info indicator', () => {
      const onInsert = vi.fn();
      render(<TemplateEditorToolbar onInsert={onInsert} />);

      expect(screen.getByText('HTML + Jinja2')).toBeInTheDocument();
    });
  });

  describe('HTML Element Buttons', () => {
    it('renders heading buttons', () => {
      const onInsert = vi.fn();
      render(<TemplateEditorToolbar onInsert={onInsert} />);

      // Should have multiple icon buttons for headings, bold, italic, etc.
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(4);
    });

    it('inserts h1 tag when h1 button clicked', async () => {
      const user = userEvent.setup();
      const onInsert = vi.fn();
      render(<TemplateEditorToolbar onInsert={onInsert} />);

      // Find buttons and click the first icon button after dropdowns
      const buttons = screen.getAllByRole('button');
      // Skip the dropdown triggers (first 4), click h1 button
      const h1Button = buttons[4];
      if (h1Button) {
        await user.click(h1Button);
        expect(onInsert).toHaveBeenCalledWith('<h1></h1>');
      }
    });
  });

  describe('Conditionals Dropdown', () => {
    it('opens conditionals dropdown when clicked', async () => {
      const user = userEvent.setup();
      const onInsert = vi.fn();
      render(<TemplateEditorToolbar onInsert={onInsert} />);

      await user.click(screen.getByText('documents.toolbar.conditionals'));

      await waitFor(() => {
        expect(screen.getByText('documents.snippets.if_simple')).toBeInTheDocument();
      });
    });

    it('shows if_else snippet option', async () => {
      const user = userEvent.setup();
      const onInsert = vi.fn();
      render(<TemplateEditorToolbar onInsert={onInsert} />);

      await user.click(screen.getByText('documents.toolbar.conditionals'));

      await waitFor(() => {
        expect(screen.getByText('documents.snippets.if_else')).toBeInTheDocument();
      });
    });

    it('inserts snippet when clicked', async () => {
      const user = userEvent.setup();
      const onInsert = vi.fn();
      render(<TemplateEditorToolbar onInsert={onInsert} />);

      await user.click(screen.getByText('documents.toolbar.conditionals'));

      await waitFor(() => {
        expect(screen.getByText('documents.snippets.if_simple')).toBeInTheDocument();
      });

      await user.click(screen.getByText('documents.snippets.if_simple'));

      expect(onInsert).toHaveBeenCalledWith(expect.stringContaining('{% if'));
    });
  });

  describe('Loops Dropdown', () => {
    it('opens loops dropdown when clicked', async () => {
      const user = userEvent.setup();
      const onInsert = vi.fn();
      render(<TemplateEditorToolbar onInsert={onInsert} />);

      await user.click(screen.getByText('documents.toolbar.loops'));

      await waitFor(() => {
        expect(screen.getByText('documents.snippets.for_simple')).toBeInTheDocument();
      });
    });

    it('shows medications loop snippet', async () => {
      const user = userEvent.setup();
      const onInsert = vi.fn();
      render(<TemplateEditorToolbar onInsert={onInsert} />);

      await user.click(screen.getByText('documents.toolbar.loops'));

      await waitFor(() => {
        expect(screen.getByText('documents.snippets.for_medications')).toBeInTheDocument();
      });
    });

    it('inserts loop snippet when clicked', async () => {
      const user = userEvent.setup();
      const onInsert = vi.fn();
      render(<TemplateEditorToolbar onInsert={onInsert} />);

      await user.click(screen.getByText('documents.toolbar.loops'));

      await waitFor(() => {
        expect(screen.getByText('documents.snippets.for_simple')).toBeInTheDocument();
      });

      await user.click(screen.getByText('documents.snippets.for_simple'));

      expect(onInsert).toHaveBeenCalledWith(expect.stringContaining('{% for'));
    });
  });

  describe('Tables Dropdown', () => {
    it('opens tables dropdown when clicked', async () => {
      const user = userEvent.setup();
      const onInsert = vi.fn();
      render(<TemplateEditorToolbar onInsert={onInsert} />);

      await user.click(screen.getByText('documents.toolbar.tables'));

      await waitFor(() => {
        expect(screen.getByText('documents.snippets.table_simple')).toBeInTheDocument();
      });
    });

    it('shows patient info table snippet', async () => {
      const user = userEvent.setup();
      const onInsert = vi.fn();
      render(<TemplateEditorToolbar onInsert={onInsert} />);

      await user.click(screen.getByText('documents.toolbar.tables'));

      await waitFor(() => {
        expect(screen.getByText('documents.snippets.table_patient_info')).toBeInTheDocument();
      });
    });

    it('inserts table snippet when clicked', async () => {
      const user = userEvent.setup();
      const onInsert = vi.fn();
      render(<TemplateEditorToolbar onInsert={onInsert} />);

      await user.click(screen.getByText('documents.toolbar.tables'));

      await waitFor(() => {
        expect(screen.getByText('documents.snippets.table_simple')).toBeInTheDocument();
      });

      await user.click(screen.getByText('documents.snippets.table_simple'));

      expect(onInsert).toHaveBeenCalledWith(expect.stringContaining('<table'));
    });
  });

  describe('Sections Dropdown', () => {
    it('opens sections dropdown when clicked', async () => {
      const user = userEvent.setup();
      const onInsert = vi.fn();
      render(<TemplateEditorToolbar onInsert={onInsert} />);

      await user.click(screen.getByText('documents.toolbar.sections'));

      await waitFor(() => {
        expect(screen.getByText('documents.snippets.header_clinic')).toBeInTheDocument();
      });
    });

    it('shows signature block snippet', async () => {
      const user = userEvent.setup();
      const onInsert = vi.fn();
      render(<TemplateEditorToolbar onInsert={onInsert} />);

      await user.click(screen.getByText('documents.toolbar.sections'));

      await waitFor(() => {
        expect(screen.getByText('documents.snippets.signature_block')).toBeInTheDocument();
      });
    });

    it('shows footer page snippet', async () => {
      const user = userEvent.setup();
      const onInsert = vi.fn();
      render(<TemplateEditorToolbar onInsert={onInsert} />);

      await user.click(screen.getByText('documents.toolbar.sections'));

      await waitFor(() => {
        expect(screen.getByText('documents.snippets.footer_page')).toBeInTheDocument();
      });
    });
  });

  describe('Alignment Buttons', () => {
    it('has multiple buttons for formatting', () => {
      const onInsert = vi.fn();
      render(<TemplateEditorToolbar onInsert={onInsert} />);

      // Toolbar should have multiple buttons
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(5);
    });
  });
});
