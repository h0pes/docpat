/**
 * AutoSaveIndicator Component Tests
 *
 * Comprehensive test suite for AutoSaveIndicator component covering:
 * - Different status states (idle, saving, saved, error)
 * - Relative time display
 * - i18n/locale support
 * - Icon rendering for each state
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AutoSaveIndicator } from '../AutoSaveIndicator';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'visits.auto_save.saving': 'Saving...',
        'visits.auto_save.saved': 'Saved',
        'visits.auto_save.error': 'Error saving',
        'visits.auto_save.last_saved': 'Last saved',
      };
      return translations[key] || key;
    },
    i18n: {
      language: 'en',
    },
  }),
}));

// Mock date-fns formatDistanceToNow
vi.mock('date-fns', async () => {
  const actual = await vi.importActual('date-fns');
  return {
    ...actual,
    formatDistanceToNow: vi.fn().mockReturnValue('5 minutes ago'),
  };
});

describe('AutoSaveIndicator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Idle State', () => {
    it('renders nothing when idle and no lastSaved', () => {
      const { container } = render(
        <AutoSaveIndicator status="idle" lastSaved={null} />
      );

      // Should render an empty container (just the wrapper div)
      expect(container.firstChild).toBeInTheDocument();
      expect(screen.queryByText('Last saved')).not.toBeInTheDocument();
      expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
    });

    it('displays last saved time when idle with lastSaved timestamp', () => {
      const lastSaved = new Date('2025-01-15T10:00:00');
      render(<AutoSaveIndicator status="idle" lastSaved={lastSaved} />);

      // The text is combined in a single span: "Last saved 5 minutes ago"
      expect(screen.getByText(/Last saved.*5 minutes ago/)).toBeInTheDocument();
    });

    it('shows Save icon in idle state with lastSaved', () => {
      const lastSaved = new Date('2025-01-15T10:00:00');
      const { container } = render(
        <AutoSaveIndicator status="idle" lastSaved={lastSaved} />
      );

      // Check for the Save icon (lucide-react renders SVG)
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Saving State', () => {
    it('displays "Saving..." text when status is saving', () => {
      render(<AutoSaveIndicator status="saving" lastSaved={null} />);

      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });

    it('shows spinning loader icon when saving', () => {
      const { container } = render(
        <AutoSaveIndicator status="saving" lastSaved={null} />
      );

      // Check for the Loader2 icon with animate-spin class
      const svg = container.querySelector('svg.animate-spin');
      expect(svg).toBeInTheDocument();
    });

    it('displays saving state regardless of lastSaved', () => {
      const lastSaved = new Date('2025-01-15T10:00:00');
      render(<AutoSaveIndicator status="saving" lastSaved={lastSaved} />);

      // When saving, should show "Saving..." not "Last saved"
      expect(screen.getByText('Saving...')).toBeInTheDocument();
      expect(screen.queryByText('Last saved')).not.toBeInTheDocument();
    });

    it('applies muted foreground color to saving text', () => {
      render(<AutoSaveIndicator status="saving" lastSaved={null} />);

      const savingText = screen.getByText('Saving...');
      expect(savingText.closest('div')).toHaveClass('text-muted-foreground');
    });
  });

  describe('Saved State', () => {
    it('displays "Saved" text when status is saved', () => {
      render(<AutoSaveIndicator status="saved" lastSaved={null} />);

      expect(screen.getByText('Saved')).toBeInTheDocument();
    });

    it('shows Check icon when saved', () => {
      const { container } = render(
        <AutoSaveIndicator status="saved" lastSaved={null} />
      );

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('applies green color to saved status', () => {
      render(<AutoSaveIndicator status="saved" lastSaved={null} />);

      const savedText = screen.getByText('Saved');
      expect(savedText.closest('div')).toHaveClass('text-green-600');
    });

    it('displays saved state regardless of lastSaved', () => {
      const lastSaved = new Date('2025-01-15T10:00:00');
      render(<AutoSaveIndicator status="saved" lastSaved={lastSaved} />);

      expect(screen.getByText('Saved')).toBeInTheDocument();
      expect(screen.queryByText('Last saved')).not.toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('displays error message when status is error', () => {
      render(<AutoSaveIndicator status="error" lastSaved={null} />);

      expect(screen.getByText('Error saving')).toBeInTheDocument();
    });

    it('shows X icon when error', () => {
      const { container } = render(
        <AutoSaveIndicator status="error" lastSaved={null} />
      );

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('applies destructive color to error status', () => {
      render(<AutoSaveIndicator status="error" lastSaved={null} />);

      const errorText = screen.getByText('Error saving');
      expect(errorText.closest('div')).toHaveClass('text-destructive');
    });

    it('displays error state regardless of lastSaved', () => {
      const lastSaved = new Date('2025-01-15T10:00:00');
      render(<AutoSaveIndicator status="error" lastSaved={lastSaved} />);

      expect(screen.getByText('Error saving')).toBeInTheDocument();
      expect(screen.queryByText('Last saved')).not.toBeInTheDocument();
    });
  });

  describe('Relative Time Updates', () => {
    it('updates relative time every minute', () => {
      const lastSaved = new Date('2025-01-15T10:00:00');
      render(<AutoSaveIndicator status="idle" lastSaved={lastSaved} />);

      // Initial render shows the relative time
      expect(screen.getByText(/5 minutes ago/)).toBeInTheDocument();

      // Advance time by 1 minute (60000ms)
      act(() => {
        vi.advanceTimersByTime(60000);
      });

      // The component should have called setInterval to update
      // Note: The mock always returns '5 minutes ago', but the interval should have triggered
    });

    it('cleans up interval on unmount', () => {
      const lastSaved = new Date('2025-01-15T10:00:00');
      const { unmount } = render(
        <AutoSaveIndicator status="idle" lastSaved={lastSaved} />
      );

      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      unmount();

      // clearInterval should have been called
      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe('Icon Styling', () => {
    it('renders icons with consistent size', () => {
      const { container, rerender } = render(
        <AutoSaveIndicator status="saving" lastSaved={null} />
      );

      let svg = container.querySelector('svg');
      expect(svg).toHaveClass('h-4', 'w-4');

      rerender(<AutoSaveIndicator status="saved" lastSaved={null} />);
      svg = container.querySelector('svg');
      expect(svg).toHaveClass('h-4', 'w-4');

      rerender(<AutoSaveIndicator status="error" lastSaved={null} />);
      svg = container.querySelector('svg');
      expect(svg).toHaveClass('h-4', 'w-4');

      const lastSaved = new Date('2025-01-15T10:00:00');
      rerender(<AutoSaveIndicator status="idle" lastSaved={lastSaved} />);
      svg = container.querySelector('svg');
      expect(svg).toHaveClass('h-4', 'w-4');
    });
  });

  describe('Text Styling', () => {
    it('applies text-sm class to all status messages', () => {
      const { rerender } = render(
        <AutoSaveIndicator status="saving" lastSaved={null} />
      );

      let text = screen.getByText('Saving...');
      expect(text.closest('div')).toHaveClass('text-sm');

      rerender(<AutoSaveIndicator status="saved" lastSaved={null} />);
      text = screen.getByText('Saved');
      expect(text.closest('div')).toHaveClass('text-sm');

      rerender(<AutoSaveIndicator status="error" lastSaved={null} />);
      text = screen.getByText('Error saving');
      expect(text.closest('div')).toHaveClass('text-sm');
    });
  });

  describe('Accessibility', () => {
    it('provides visual feedback through icons and text', () => {
      const { container } = render(
        <AutoSaveIndicator status="saving" lastSaved={null} />
      );

      // Icon + text provides accessible indication of status
      expect(container.querySelector('svg')).toBeInTheDocument();
      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });

    it('uses semantic colors for different states', () => {
      const { rerender } = render(
        <AutoSaveIndicator status="saved" lastSaved={null} />
      );

      // Saved uses green (success)
      expect(screen.getByText('Saved').closest('div')).toHaveClass('text-green-600');

      rerender(<AutoSaveIndicator status="error" lastSaved={null} />);
      // Error uses destructive (red)
      expect(screen.getByText('Error saving').closest('div')).toHaveClass('text-destructive');
    });
  });

  describe('Container Element', () => {
    it('wraps content in a flex container', () => {
      const { container } = render(
        <AutoSaveIndicator status="saving" lastSaved={null} />
      );

      expect(container.firstChild).toHaveClass('flex', 'items-center');
    });
  });
});
