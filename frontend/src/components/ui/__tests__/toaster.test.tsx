/**
 * Toaster Component Tests
 *
 * Tests for the toaster container component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Toaster } from '../toaster';

// Mock the useToast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({
    toasts: [],
  })),
}));

// Import the mocked module to manipulate it
import { useToast } from '@/hooks/use-toast';

describe('Toaster', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders toaster container', () => {
      const { container } = render(<Toaster />);

      // Toaster renders ToastProvider which wraps content
      expect(container.firstChild).toBeInTheDocument();
    });

    it('renders toast viewport', () => {
      const { container } = render(<Toaster />);

      // Look for the viewport element by its fixed positioning class
      const viewport = container.querySelector('[class*="fixed"]');
      expect(viewport).toBeInTheDocument();
    });
  });

  describe('With Toasts', () => {
    it('renders toast with title', () => {
      vi.mocked(useToast).mockReturnValue({
        toasts: [
          {
            id: '1',
            title: 'Test Toast',
          },
        ],
        toast: vi.fn(),
        dismiss: vi.fn(),
      });

      render(<Toaster />);

      expect(screen.getByText('Test Toast')).toBeInTheDocument();
    });

    it('renders toast with description', () => {
      vi.mocked(useToast).mockReturnValue({
        toasts: [
          {
            id: '1',
            title: 'Title',
            description: 'Toast description here',
          },
        ],
        toast: vi.fn(),
        dismiss: vi.fn(),
      });

      render(<Toaster />);

      expect(screen.getByText('Toast description here')).toBeInTheDocument();
    });

    it('renders toast with action', () => {
      vi.mocked(useToast).mockReturnValue({
        toasts: [
          {
            id: '1',
            title: 'Title',
            action: <button>Undo</button>,
          },
        ],
        toast: vi.fn(),
        dismiss: vi.fn(),
      });

      render(<Toaster />);

      expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
    });

    it('renders multiple toasts', () => {
      vi.mocked(useToast).mockReturnValue({
        toasts: [
          { id: '1', title: 'Toast 1' },
          { id: '2', title: 'Toast 2' },
          { id: '3', title: 'Toast 3' },
        ],
        toast: vi.fn(),
        dismiss: vi.fn(),
      });

      render(<Toaster />);

      expect(screen.getByText('Toast 1')).toBeInTheDocument();
      expect(screen.getByText('Toast 2')).toBeInTheDocument();
      expect(screen.getByText('Toast 3')).toBeInTheDocument();
    });

    it('renders close button for each toast', () => {
      vi.mocked(useToast).mockReturnValue({
        toasts: [
          { id: '1', title: 'Toast 1' },
        ],
        toast: vi.fn(),
        dismiss: vi.fn(),
      });

      const { container } = render(<Toaster />);

      // ToastClose renders an X icon
      const closeButtons = container.querySelectorAll('[toast-close]');
      expect(closeButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Empty State', () => {
    it('renders empty container when no toasts', () => {
      vi.mocked(useToast).mockReturnValue({
        toasts: [],
        toast: vi.fn(),
        dismiss: vi.fn(),
      });

      const { container } = render(<Toaster />);

      // Container should still render
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Toast Props Passthrough', () => {
    it('passes variant prop to toast', () => {
      vi.mocked(useToast).mockReturnValue({
        toasts: [
          {
            id: '1',
            title: 'Error',
            variant: 'destructive',
          },
        ],
        toast: vi.fn(),
        dismiss: vi.fn(),
      });

      const { container } = render(<Toaster />);

      const toast = container.querySelector('[data-state]');
      expect(toast).toHaveClass('destructive');
    });
  });
});
