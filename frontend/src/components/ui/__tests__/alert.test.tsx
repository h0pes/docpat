/**
 * Alert Component Tests
 *
 * Tests for the alert component with variants.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Alert, AlertTitle, AlertDescription } from '../alert';
import { AlertCircle } from 'lucide-react';

describe('Alert', () => {
  describe('Alert (root)', () => {
    it('renders alert with role', () => {
      render(<Alert>Alert content</Alert>);

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('renders children', () => {
      render(<Alert>Alert message</Alert>);

      expect(screen.getByText('Alert message')).toBeInTheDocument();
    });

    it('applies base alert styles', () => {
      render(<Alert>Alert</Alert>);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('relative');
      expect(alert).toHaveClass('w-full');
      expect(alert).toHaveClass('rounded-lg');
      expect(alert).toHaveClass('border');
    });
  });

  describe('Variants', () => {
    it('applies default variant classes', () => {
      render(<Alert>Default</Alert>);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('bg-background');
      expect(alert).toHaveClass('text-foreground');
    });

    it('applies destructive variant classes', () => {
      render(<Alert variant="destructive">Error</Alert>);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('border-destructive/50');
      expect(alert).toHaveClass('text-destructive');
    });
  });

  describe('Custom ClassName', () => {
    it('applies custom className', () => {
      render(<Alert className="custom-alert">Alert</Alert>);

      expect(screen.getByRole('alert')).toHaveClass('custom-alert');
    });

    it('merges custom className with variant classes', () => {
      render(<Alert className="custom-alert" variant="destructive">Alert</Alert>);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('custom-alert');
      expect(alert).toHaveClass('text-destructive');
    });
  });

  describe('AlertTitle', () => {
    it('renders as h5 heading', () => {
      render(<AlertTitle>Title</AlertTitle>);

      expect(screen.getByRole('heading', { level: 5 })).toBeInTheDocument();
    });

    it('displays title text', () => {
      render(<AlertTitle>Alert Title</AlertTitle>);

      expect(screen.getByText('Alert Title')).toBeInTheDocument();
    });

    it('applies title styles', () => {
      render(<AlertTitle>Title</AlertTitle>);

      const title = screen.getByRole('heading');
      expect(title).toHaveClass('mb-1');
      expect(title).toHaveClass('font-medium');
    });

    it('applies custom className', () => {
      render(<AlertTitle className="custom-title">Title</AlertTitle>);

      expect(screen.getByRole('heading')).toHaveClass('custom-title');
    });
  });

  describe('AlertDescription', () => {
    it('renders description text', () => {
      render(<AlertDescription>Description text</AlertDescription>);

      expect(screen.getByText('Description text')).toBeInTheDocument();
    });

    it('renders as div', () => {
      render(<AlertDescription data-testid="desc">Description</AlertDescription>);

      const desc = screen.getByTestId('desc');
      expect(desc.tagName).toBe('DIV');
    });

    it('applies description styles', () => {
      render(<AlertDescription data-testid="desc">Description</AlertDescription>);

      const desc = screen.getByTestId('desc');
      expect(desc).toHaveClass('text-sm');
    });

    it('applies custom className', () => {
      render(<AlertDescription className="custom-desc" data-testid="desc">Description</AlertDescription>);

      expect(screen.getByTestId('desc')).toHaveClass('custom-desc');
    });
  });

  describe('Complete Alert', () => {
    it('renders a complete alert with all sections', () => {
      render(
        <Alert>
          <AlertTitle>Heads up!</AlertTitle>
          <AlertDescription>
            You can add components to your app using the CLI.
          </AlertDescription>
        </Alert>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Heads up!')).toBeInTheDocument();
      expect(screen.getByText(/You can add components/)).toBeInTheDocument();
    });

    it('renders alert with icon', () => {
      render(
        <Alert>
          <AlertCircle data-testid="icon" className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Something went wrong.
          </AlertDescription>
        </Alert>
      );

      expect(screen.getByTestId('icon')).toBeInTheDocument();
      expect(screen.getByText('Error')).toBeInTheDocument();
    });

    it('renders destructive alert with all parts', () => {
      render(
        <Alert variant="destructive">
          <AlertCircle data-testid="icon" className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Your session has expired.
          </AlertDescription>
        </Alert>
      );

      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('text-destructive');
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Your session has expired.')).toBeInTheDocument();
    });
  });
});
