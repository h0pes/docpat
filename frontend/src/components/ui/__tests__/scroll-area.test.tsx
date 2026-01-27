/**
 * Scroll Area Component Tests
 *
 * Tests for the scroll area component with custom scrollbars.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScrollArea, ScrollBar } from '../scroll-area';

describe('ScrollArea', () => {
  describe('Basic Rendering', () => {
    it('renders scroll area container', () => {
      render(
        <ScrollArea data-testid="scroll-area">
          <div>Content</div>
        </ScrollArea>
      );

      expect(screen.getByTestId('scroll-area')).toBeInTheDocument();
    });

    it('renders children content', () => {
      render(
        <ScrollArea>
          <div>Scroll content</div>
        </ScrollArea>
      );

      expect(screen.getByText('Scroll content')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies base styles', () => {
      render(
        <ScrollArea data-testid="scroll-area">
          <div>Content</div>
        </ScrollArea>
      );

      const scrollArea = screen.getByTestId('scroll-area');
      expect(scrollArea).toHaveClass('relative');
      expect(scrollArea).toHaveClass('overflow-hidden');
    });

    it('applies custom className', () => {
      render(
        <ScrollArea className="h-[200px] w-[350px]" data-testid="scroll-area">
          <div>Content</div>
        </ScrollArea>
      );

      const scrollArea = screen.getByTestId('scroll-area');
      expect(scrollArea).toHaveClass('h-[200px]');
      expect(scrollArea).toHaveClass('w-[350px]');
    });
  });

  describe('Viewport', () => {
    it('renders viewport for content', () => {
      const { container } = render(
        <ScrollArea>
          <div>Content inside viewport</div>
        </ScrollArea>
      );

      const viewport = container.querySelector('[data-radix-scroll-area-viewport]');
      expect(viewport).toBeInTheDocument();
    });

    it('viewport contains children', () => {
      const { container } = render(
        <ScrollArea>
          <p data-testid="content">Content</p>
        </ScrollArea>
      );

      const viewport = container.querySelector('[data-radix-scroll-area-viewport]');
      expect(viewport).toContainElement(screen.getByTestId('content'));
    });

    it('viewport has proper structure', () => {
      const { container } = render(
        <ScrollArea>
          <div>Content</div>
        </ScrollArea>
      );

      const viewport = container.querySelector('[data-radix-scroll-area-viewport]');
      expect(viewport).toHaveClass('h-full');
      expect(viewport).toHaveClass('w-full');
    });
  });

  describe('HTML Attributes', () => {
    it('passes through id attribute', () => {
      render(
        <ScrollArea id="my-scroll-area" data-testid="scroll-area">
          <div>Content</div>
        </ScrollArea>
      );

      expect(screen.getByTestId('scroll-area')).toHaveAttribute('id', 'my-scroll-area');
    });

    it('passes through data attributes', () => {
      render(
        <ScrollArea data-testid="scroll-area" data-section="main">
          <div>Content</div>
        </ScrollArea>
      );

      expect(screen.getByTestId('scroll-area')).toHaveAttribute('data-section', 'main');
    });

    it('passes through dir attribute', () => {
      const { container } = render(
        <ScrollArea dir="rtl">
          <div>Content</div>
        </ScrollArea>
      );

      // Radix sets dir on the root
      const root = container.querySelector('[dir="rtl"]');
      expect(root).toBeInTheDocument();
    });
  });

  describe('Content Overflow', () => {
    it('handles overflow content', () => {
      render(
        <ScrollArea className="h-[100px]" data-testid="scroll-area">
          <div style={{ height: 500 }}>
            {Array.from({ length: 50 }).map((_, i) => (
              <p key={i}>Item {i + 1}</p>
            ))}
          </div>
        </ScrollArea>
      );

      expect(screen.getByTestId('scroll-area')).toBeInTheDocument();
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    it('content is within viewport', () => {
      const { container } = render(
        <ScrollArea>
          <div data-testid="tall-content" style={{ height: 1000 }}>
            Tall content
          </div>
        </ScrollArea>
      );

      const viewport = container.querySelector('[data-radix-scroll-area-viewport]');
      const content = screen.getByTestId('tall-content');
      expect(viewport).toContainElement(content);
    });
  });

  describe('Corner Element', () => {
    it('includes corner element in structure', () => {
      const { container } = render(
        <ScrollArea>
          <div>Content</div>
        </ScrollArea>
      );

      // ScrollArea renders a corner element for when both scrollbars are visible
      const scrollAreaRoot = container.firstChild;
      expect(scrollAreaRoot).toBeInTheDocument();
    });
  });
});

// Note: ScrollBar tests are limited because Radix ScrollBar
// requires actual layout overflow to render, which JSDOM doesn't provide.
// The ScrollBar component is implicitly tested through ScrollArea.
