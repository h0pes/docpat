/**
 * Accordion Component Tests
 *
 * Tests for the accordion component with items, triggers, and content.
 */

import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '../accordion';

describe('Accordion', () => {
  describe('Basic Rendering', () => {
    it('renders accordion container', () => {
      render(
        <Accordion type="single" collapsible data-testid="accordion">
          <AccordionItem value="item-1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      expect(screen.getByTestId('accordion')).toBeInTheDocument();
    });

    it('renders accordion item', () => {
      render(
        <Accordion type="single" collapsible>
          <AccordionItem value="item-1" data-testid="item">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      expect(screen.getByTestId('item')).toBeInTheDocument();
    });

    it('renders accordion trigger', () => {
      render(
        <Accordion type="single" collapsible>
          <AccordionItem value="item-1">
            <AccordionTrigger>Click to expand</AccordionTrigger>
            <AccordionContent>Content</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      expect(screen.getByRole('button', { name: 'Click to expand' })).toBeInTheDocument();
    });

    it('renders multiple items', () => {
      render(
        <Accordion type="single" collapsible>
          <AccordionItem value="item-1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>Item 2</AccordionTrigger>
            <AccordionContent>Content 2</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      expect(screen.getByRole('button', { name: 'Item 1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Item 2' })).toBeInTheDocument();
    });
  });

  describe('AccordionItem Styling', () => {
    it('applies border-b class to item', () => {
      render(
        <Accordion type="single" collapsible>
          <AccordionItem value="item-1" data-testid="item">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      expect(screen.getByTestId('item')).toHaveClass('border-b');
    });

    it('applies custom className to item', () => {
      render(
        <Accordion type="single" collapsible>
          <AccordionItem value="item-1" className="custom-item" data-testid="item">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      expect(screen.getByTestId('item')).toHaveClass('custom-item');
    });
  });

  describe('AccordionTrigger Styling', () => {
    it('applies trigger styles', () => {
      render(
        <Accordion type="single" collapsible>
          <AccordionItem value="item-1">
            <AccordionTrigger data-testid="trigger">Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      const trigger = screen.getByTestId('trigger');
      expect(trigger).toHaveClass('flex');
      expect(trigger).toHaveClass('flex-1');
      expect(trigger).toHaveClass('font-medium');
    });

    it('applies custom className to trigger', () => {
      render(
        <Accordion type="single" collapsible>
          <AccordionItem value="item-1">
            <AccordionTrigger className="custom-trigger" data-testid="trigger">Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      expect(screen.getByTestId('trigger')).toHaveClass('custom-trigger');
    });

    it('renders chevron icon', () => {
      const { container } = render(
        <Accordion type="single" collapsible>
          <AccordionItem value="item-1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Expand/Collapse', () => {
    it('hides content by default', () => {
      render(
        <Accordion type="single" collapsible>
          <AccordionItem value="item-1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Hidden content</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      // Trigger is closed initially
      expect(screen.getByRole('button', { name: 'Item 1' })).toHaveAttribute('data-state', 'closed');
    });

    it('shows content when expanded', async () => {
      const user = userEvent.setup();
      render(
        <Accordion type="single" collapsible>
          <AccordionItem value="item-1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Visible content</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      await user.click(screen.getByRole('button', { name: 'Item 1' }));

      await waitFor(() => {
        expect(screen.getByText('Visible content')).toBeInTheDocument();
      });
    });

    it('collapses content when trigger clicked again', async () => {
      const user = userEvent.setup();
      render(
        <Accordion type="single" collapsible>
          <AccordionItem value="item-1">
            <AccordionTrigger data-testid="trigger">Item 1</AccordionTrigger>
            <AccordionContent>Content</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      const trigger = screen.getByTestId('trigger');

      // Open
      await user.click(trigger);
      await waitFor(() => {
        expect(trigger).toHaveAttribute('data-state', 'open');
      });

      // Close
      await user.click(trigger);
      await waitFor(() => {
        expect(trigger).toHaveAttribute('data-state', 'closed');
      });
    });

    it('has correct data-state attribute when open', async () => {
      const user = userEvent.setup();
      render(
        <Accordion type="single" collapsible>
          <AccordionItem value="item-1">
            <AccordionTrigger data-testid="trigger">Item 1</AccordionTrigger>
            <AccordionContent>Content</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      await user.click(screen.getByTestId('trigger'));

      await waitFor(() => {
        expect(screen.getByTestId('trigger')).toHaveAttribute('data-state', 'open');
      });
    });
  });

  describe('Single Type', () => {
    it('only allows one item open at a time', async () => {
      const user = userEvent.setup();
      render(
        <Accordion type="single" collapsible>
          <AccordionItem value="item-1">
            <AccordionTrigger data-testid="trigger-1">Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger data-testid="trigger-2">Item 2</AccordionTrigger>
            <AccordionContent>Content 2</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      // Open first item
      await user.click(screen.getByTestId('trigger-1'));
      await waitFor(() => {
        expect(screen.getByTestId('trigger-1')).toHaveAttribute('data-state', 'open');
      });

      // Open second item - first should close
      await user.click(screen.getByTestId('trigger-2'));
      await waitFor(() => {
        expect(screen.getByTestId('trigger-2')).toHaveAttribute('data-state', 'open');
        expect(screen.getByTestId('trigger-1')).toHaveAttribute('data-state', 'closed');
      });
    });
  });

  describe('Multiple Type', () => {
    it('allows multiple items open', async () => {
      const user = userEvent.setup();
      render(
        <Accordion type="multiple">
          <AccordionItem value="item-1">
            <AccordionTrigger data-testid="trigger-1">Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger data-testid="trigger-2">Item 2</AccordionTrigger>
            <AccordionContent>Content 2</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      // Open both items
      await user.click(screen.getByTestId('trigger-1'));
      await user.click(screen.getByTestId('trigger-2'));

      await waitFor(() => {
        expect(screen.getByTestId('trigger-1')).toHaveAttribute('data-state', 'open');
        expect(screen.getByTestId('trigger-2')).toHaveAttribute('data-state', 'open');
      });
    });
  });

  describe('Default Value', () => {
    it('opens item with default value', () => {
      render(
        <Accordion type="single" collapsible defaultValue="item-2">
          <AccordionItem value="item-1">
            <AccordionTrigger data-testid="trigger-1">Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger data-testid="trigger-2">Item 2</AccordionTrigger>
            <AccordionContent>Content 2</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      expect(screen.getByTestId('trigger-2')).toHaveAttribute('data-state', 'open');
      expect(screen.getByTestId('trigger-1')).toHaveAttribute('data-state', 'closed');
    });
  });

  describe('AccordionContent Styling', () => {
    it('applies content styles', async () => {
      const user = userEvent.setup();
      render(
        <Accordion type="single" collapsible>
          <AccordionItem value="item-1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent data-testid="content">Content</AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      await user.click(screen.getByRole('button', { name: 'Item 1' }));

      await waitFor(() => {
        const content = screen.getByTestId('content');
        expect(content).toHaveClass('overflow-hidden');
        expect(content).toHaveClass('text-sm');
      });
    });

    it('applies custom className to content', async () => {
      const user = userEvent.setup();
      render(
        <Accordion type="single" collapsible>
          <AccordionItem value="item-1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent className="custom-content">
              <span data-testid="inner">Content</span>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      );

      await user.click(screen.getByRole('button', { name: 'Item 1' }));

      await waitFor(() => {
        // Custom class is applied to the inner div
        const innerContent = screen.getByTestId('inner').parentElement;
        expect(innerContent).toHaveClass('custom-content');
      });
    });
  });
});
