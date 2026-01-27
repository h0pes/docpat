/**
 * Card Component Tests
 *
 * Tests for the card component with header, content, and footer sections.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from '../card';

describe('Card', () => {
  describe('Card (root)', () => {
    it('renders card container', () => {
      render(<Card data-testid="card">Content</Card>);

      expect(screen.getByTestId('card')).toBeInTheDocument();
    });

    it('renders children', () => {
      render(<Card>Card content</Card>);

      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('applies card styles', () => {
      render(<Card data-testid="card">Content</Card>);

      const card = screen.getByTestId('card');
      expect(card).toHaveClass('rounded-lg');
      expect(card).toHaveClass('border');
      expect(card).toHaveClass('bg-card');
      expect(card).toHaveClass('shadow-sm');
    });

    it('applies custom className', () => {
      render(<Card className="custom-card" data-testid="card">Content</Card>);

      expect(screen.getByTestId('card')).toHaveClass('custom-card');
    });
  });

  describe('CardHeader', () => {
    it('renders header section', () => {
      render(<CardHeader data-testid="header">Header</CardHeader>);

      expect(screen.getByTestId('header')).toBeInTheDocument();
    });

    it('applies header styles', () => {
      render(<CardHeader data-testid="header">Header</CardHeader>);

      const header = screen.getByTestId('header');
      expect(header).toHaveClass('flex');
      expect(header).toHaveClass('flex-col');
      expect(header).toHaveClass('p-6');
    });

    it('applies custom className', () => {
      render(<CardHeader className="custom-header" data-testid="header">Header</CardHeader>);

      expect(screen.getByTestId('header')).toHaveClass('custom-header');
    });
  });

  describe('CardTitle', () => {
    it('renders as h3 heading', () => {
      render(<CardTitle>Title</CardTitle>);

      expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
    });

    it('displays title text', () => {
      render(<CardTitle>My Card Title</CardTitle>);

      expect(screen.getByText('My Card Title')).toBeInTheDocument();
    });

    it('applies title styles', () => {
      render(<CardTitle>Title</CardTitle>);

      const title = screen.getByRole('heading');
      expect(title).toHaveClass('text-2xl');
      expect(title).toHaveClass('font-semibold');
    });

    it('applies custom className', () => {
      render(<CardTitle className="custom-title">Title</CardTitle>);

      expect(screen.getByRole('heading')).toHaveClass('custom-title');
    });
  });

  describe('CardDescription', () => {
    it('renders description text', () => {
      render(<CardDescription>Description text</CardDescription>);

      expect(screen.getByText('Description text')).toBeInTheDocument();
    });

    it('renders as paragraph', () => {
      render(<CardDescription data-testid="desc">Description</CardDescription>);

      const desc = screen.getByTestId('desc');
      expect(desc.tagName).toBe('P');
    });

    it('applies description styles', () => {
      render(<CardDescription data-testid="desc">Description</CardDescription>);

      const desc = screen.getByTestId('desc');
      expect(desc).toHaveClass('text-sm');
      expect(desc).toHaveClass('text-muted-foreground');
    });

    it('applies custom className', () => {
      render(<CardDescription className="custom-desc" data-testid="desc">Description</CardDescription>);

      expect(screen.getByTestId('desc')).toHaveClass('custom-desc');
    });
  });

  describe('CardContent', () => {
    it('renders content section', () => {
      render(<CardContent data-testid="content">Content</CardContent>);

      expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    it('applies content styles', () => {
      render(<CardContent data-testid="content">Content</CardContent>);

      const content = screen.getByTestId('content');
      expect(content).toHaveClass('p-6');
      expect(content).toHaveClass('pt-0');
    });

    it('applies custom className', () => {
      render(<CardContent className="custom-content" data-testid="content">Content</CardContent>);

      expect(screen.getByTestId('content')).toHaveClass('custom-content');
    });
  });

  describe('CardFooter', () => {
    it('renders footer section', () => {
      render(<CardFooter data-testid="footer">Footer</CardFooter>);

      expect(screen.getByTestId('footer')).toBeInTheDocument();
    });

    it('applies footer styles', () => {
      render(<CardFooter data-testid="footer">Footer</CardFooter>);

      const footer = screen.getByTestId('footer');
      expect(footer).toHaveClass('flex');
      expect(footer).toHaveClass('items-center');
      expect(footer).toHaveClass('p-6');
    });

    it('applies custom className', () => {
      render(<CardFooter className="custom-footer" data-testid="footer">Footer</CardFooter>);

      expect(screen.getByTestId('footer')).toHaveClass('custom-footer');
    });
  });

  describe('Complete Card', () => {
    it('renders a complete card with all sections', () => {
      render(
        <Card data-testid="card">
          <CardHeader data-testid="header">
            <CardTitle>Title</CardTitle>
            <CardDescription>Description</CardDescription>
          </CardHeader>
          <CardContent data-testid="content">
            <p>Content paragraph</p>
          </CardContent>
          <CardFooter data-testid="footer">
            <button>Action</button>
          </CardFooter>
        </Card>
      );

      expect(screen.getByTestId('card')).toBeInTheDocument();
      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByTestId('content')).toBeInTheDocument();
      expect(screen.getByTestId('footer')).toBeInTheDocument();
      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Content paragraph')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
    });
  });
});
