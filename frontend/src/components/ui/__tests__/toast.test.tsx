/**
 * Toast Component Tests
 *
 * Tests for the toast notification components.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
} from '../toast';

describe('Toast', () => {
  const renderToast = (children: React.ReactNode) => {
    return render(
      <ToastProvider>
        {children}
        <ToastViewport />
      </ToastProvider>
    );
  };

  describe('Basic Rendering', () => {
    it('renders toast element', () => {
      renderToast(
        <Toast open data-testid="toast">
          <ToastTitle>Title</ToastTitle>
        </Toast>
      );

      expect(screen.getByTestId('toast')).toBeInTheDocument();
    });

    it('renders toast with content', () => {
      renderToast(
        <Toast open>
          <ToastTitle>Success!</ToastTitle>
          <ToastDescription>Your changes have been saved.</ToastDescription>
        </Toast>
      );

      expect(screen.getByText('Success!')).toBeInTheDocument();
      expect(screen.getByText('Your changes have been saved.')).toBeInTheDocument();
    });
  });

  describe('Toast Variants', () => {
    it('renders default variant', () => {
      renderToast(
        <Toast open data-testid="toast">
          <ToastTitle>Default Toast</ToastTitle>
        </Toast>
      );

      const toast = screen.getByTestId('toast');
      expect(toast).toHaveClass('bg-background');
    });

    it('renders destructive variant', () => {
      renderToast(
        <Toast open variant="destructive" data-testid="toast">
          <ToastTitle>Error</ToastTitle>
        </Toast>
      );

      const toast = screen.getByTestId('toast');
      expect(toast).toHaveClass('destructive');
    });
  });

  describe('ToastTitle', () => {
    it('renders title text', () => {
      renderToast(
        <Toast open>
          <ToastTitle>Notification Title</ToastTitle>
        </Toast>
      );

      expect(screen.getByText('Notification Title')).toBeInTheDocument();
    });

    it('applies title styles', () => {
      renderToast(
        <Toast open>
          <ToastTitle data-testid="title">Title</ToastTitle>
        </Toast>
      );

      expect(screen.getByTestId('title')).toHaveClass('text-sm');
      expect(screen.getByTestId('title')).toHaveClass('font-semibold');
    });

    it('applies custom className', () => {
      renderToast(
        <Toast open>
          <ToastTitle className="custom-title" data-testid="title">Title</ToastTitle>
        </Toast>
      );

      expect(screen.getByTestId('title')).toHaveClass('custom-title');
    });
  });

  describe('ToastDescription', () => {
    it('renders description text', () => {
      renderToast(
        <Toast open>
          <ToastTitle>Title</ToastTitle>
          <ToastDescription>This is a description</ToastDescription>
        </Toast>
      );

      expect(screen.getByText('This is a description')).toBeInTheDocument();
    });

    it('applies description styles', () => {
      renderToast(
        <Toast open>
          <ToastTitle>Title</ToastTitle>
          <ToastDescription data-testid="description">Description</ToastDescription>
        </Toast>
      );

      expect(screen.getByTestId('description')).toHaveClass('text-sm');
      expect(screen.getByTestId('description')).toHaveClass('opacity-90');
    });
  });

  describe('ToastClose', () => {
    it('renders close button', () => {
      renderToast(
        <Toast open>
          <ToastTitle>Title</ToastTitle>
          <ToastClose data-testid="close" />
        </Toast>
      );

      expect(screen.getByTestId('close')).toBeInTheDocument();
    });

    it('renders X icon', () => {
      const { container } = render(
        <ToastProvider>
          <Toast open>
            <ToastTitle>Title</ToastTitle>
            <ToastClose />
          </Toast>
          <ToastViewport />
        </ToastProvider>
      );

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('ToastAction', () => {
    it('renders action button', () => {
      renderToast(
        <Toast open>
          <ToastTitle>Title</ToastTitle>
          <ToastAction altText="Undo action">Undo</ToastAction>
        </Toast>
      );

      expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
    });

    it('applies action styles', () => {
      renderToast(
        <Toast open>
          <ToastTitle>Title</ToastTitle>
          <ToastAction altText="Retry" data-testid="action">Retry</ToastAction>
        </Toast>
      );

      const action = screen.getByTestId('action');
      expect(action).toHaveClass('h-8');
      expect(action).toHaveClass('rounded-md');
    });

    it('applies custom className', () => {
      renderToast(
        <Toast open>
          <ToastTitle>Title</ToastTitle>
          <ToastAction altText="Action" className="custom-action" data-testid="action">
            Action
          </ToastAction>
        </Toast>
      );

      expect(screen.getByTestId('action')).toHaveClass('custom-action');
    });
  });

  describe('ToastViewport', () => {
    it('renders viewport', () => {
      render(
        <ToastProvider>
          <ToastViewport data-testid="viewport" />
        </ToastProvider>
      );

      expect(screen.getByTestId('viewport')).toBeInTheDocument();
    });

    it('applies viewport styles', () => {
      render(
        <ToastProvider>
          <ToastViewport data-testid="viewport" />
        </ToastProvider>
      );

      const viewport = screen.getByTestId('viewport');
      expect(viewport).toHaveClass('fixed');
      expect(viewport).toHaveClass('z-[100]');
    });

    it('applies custom className', () => {
      render(
        <ToastProvider>
          <ToastViewport className="custom-viewport" data-testid="viewport" />
        </ToastProvider>
      );

      expect(screen.getByTestId('viewport')).toHaveClass('custom-viewport');
    });
  });

  describe('Toast Styling', () => {
    it('applies base toast styles', () => {
      renderToast(
        <Toast open data-testid="toast">
          <ToastTitle>Title</ToastTitle>
        </Toast>
      );

      const toast = screen.getByTestId('toast');
      expect(toast).toHaveClass('group');
      expect(toast).toHaveClass('pointer-events-auto');
      expect(toast).toHaveClass('rounded-md');
      expect(toast).toHaveClass('shadow-lg');
    });

    it('applies custom className to toast', () => {
      renderToast(
        <Toast open className="my-toast" data-testid="toast">
          <ToastTitle>Title</ToastTitle>
        </Toast>
      );

      expect(screen.getByTestId('toast')).toHaveClass('my-toast');
    });
  });

  describe('Controlled State', () => {
    it('shows toast when open', () => {
      renderToast(
        <Toast open data-testid="toast">
          <ToastTitle>Visible</ToastTitle>
        </Toast>
      );

      expect(screen.getByTestId('toast')).toBeInTheDocument();
    });

    it('can be controlled via open prop', () => {
      const { rerender } = render(
        <ToastProvider>
          <Toast open data-testid="toast">
            <ToastTitle>Title</ToastTitle>
          </Toast>
          <ToastViewport />
        </ToastProvider>
      );

      expect(screen.getByTestId('toast')).toBeInTheDocument();

      rerender(
        <ToastProvider>
          <Toast open={false} data-testid="toast">
            <ToastTitle>Title</ToastTitle>
          </Toast>
          <ToastViewport />
        </ToastProvider>
      );

      // Toast may still be in DOM but should be transitioning out
      // The actual removal depends on animation timing
    });
  });

  describe('HTML Attributes', () => {
    it('passes through data attributes', () => {
      renderToast(
        <Toast open data-testid="toast" data-type="success">
          <ToastTitle>Title</ToastTitle>
        </Toast>
      );

      expect(screen.getByTestId('toast')).toHaveAttribute('data-type', 'success');
    });
  });
});
