/**
 * Skeleton Component Tests
 *
 * Tests for the skeleton loading component.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Skeleton } from '../skeleton';

describe('Skeleton', () => {
  describe('Rendering', () => {
    it('renders skeleton element', () => {
      render(<Skeleton data-testid="skeleton" />);

      expect(screen.getByTestId('skeleton')).toBeInTheDocument();
    });

    it('renders as div element', () => {
      render(<Skeleton data-testid="skeleton" />);

      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton.tagName).toBe('DIV');
    });

    it('renders children', () => {
      render(<Skeleton data-testid="skeleton">Loading content</Skeleton>);

      expect(screen.getByText('Loading content')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies animation class', () => {
      render(<Skeleton data-testid="skeleton" />);

      expect(screen.getByTestId('skeleton')).toHaveClass('animate-pulse');
    });

    it('applies rounded class', () => {
      render(<Skeleton data-testid="skeleton" />);

      expect(screen.getByTestId('skeleton')).toHaveClass('rounded-md');
    });

    it('applies background class', () => {
      render(<Skeleton data-testid="skeleton" />);

      expect(screen.getByTestId('skeleton')).toHaveClass('bg-muted');
    });

    it('applies custom className', () => {
      render(<Skeleton className="h-10 w-20" data-testid="skeleton" />);

      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveClass('h-10');
      expect(skeleton).toHaveClass('w-20');
    });

    it('merges custom className with base styles', () => {
      render(<Skeleton className="h-10 w-20" data-testid="skeleton" />);

      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveClass('h-10');
      expect(skeleton).toHaveClass('animate-pulse');
    });
  });

  describe('HTML Attributes', () => {
    it('passes through id attribute', () => {
      render(<Skeleton id="my-skeleton" data-testid="skeleton" />);

      expect(screen.getByTestId('skeleton')).toHaveAttribute('id', 'my-skeleton');
    });

    it('passes through data attributes', () => {
      render(<Skeleton data-testid="skeleton" data-loading="true" />);

      expect(screen.getByTestId('skeleton')).toHaveAttribute('data-loading', 'true');
    });

    it('passes through aria-label', () => {
      render(<Skeleton aria-label="Loading content" data-testid="skeleton" />);

      expect(screen.getByTestId('skeleton')).toHaveAttribute('aria-label', 'Loading content');
    });
  });

  describe('Common Use Cases', () => {
    it('renders text skeleton', () => {
      render(<Skeleton className="h-4 w-[250px]" data-testid="skeleton" />);

      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveClass('h-4');
      expect(skeleton).toHaveClass('w-[250px]');
    });

    it('renders avatar skeleton', () => {
      render(<Skeleton className="h-12 w-12 rounded-full" data-testid="skeleton" />);

      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveClass('h-12');
      expect(skeleton).toHaveClass('w-12');
      expect(skeleton).toHaveClass('rounded-full');
    });

    it('renders card skeleton', () => {
      render(
        <div className="space-y-3">
          <Skeleton className="h-[125px] w-full rounded-xl" data-testid="image-skeleton" />
          <Skeleton className="h-4 w-[250px]" data-testid="title-skeleton" />
          <Skeleton className="h-4 w-[200px]" data-testid="text-skeleton" />
        </div>
      );

      expect(screen.getByTestId('image-skeleton')).toHaveClass('h-[125px]');
      expect(screen.getByTestId('title-skeleton')).toHaveClass('w-[250px]');
      expect(screen.getByTestId('text-skeleton')).toHaveClass('w-[200px]');
    });
  });
});
