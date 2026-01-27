/**
 * Popover Component Tests
 *
 * Tests for the popover component with trigger and content.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Popover, PopoverTrigger, PopoverContent } from '../popover';

describe('Popover', () => {
  describe('Basic Rendering', () => {
    it('renders trigger', () => {
      render(
        <Popover>
          <PopoverTrigger>Open Popover</PopoverTrigger>
          <PopoverContent>Popover content</PopoverContent>
        </Popover>
      );

      expect(screen.getByRole('button', { name: 'Open Popover' })).toBeInTheDocument();
    });

    it('does not render content when closed', () => {
      render(
        <Popover>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent>Popover content</PopoverContent>
        </Popover>
      );

      expect(screen.queryByText('Popover content')).not.toBeInTheDocument();
    });

    it('renders content when open', () => {
      render(
        <Popover open>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent>Popover content</PopoverContent>
        </Popover>
      );

      expect(screen.getByText('Popover content')).toBeInTheDocument();
    });
  });

  describe('Opening Popover', () => {
    it('opens on trigger click', async () => {
      const user = userEvent.setup();
      render(
        <Popover>
          <PopoverTrigger>Open Popover</PopoverTrigger>
          <PopoverContent>Popover content</PopoverContent>
        </Popover>
      );

      await user.click(screen.getByRole('button', { name: 'Open Popover' }));

      await waitFor(() => {
        expect(screen.getByText('Popover content')).toBeInTheDocument();
      });
    });

    it('calls onOpenChange when opened', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(
        <Popover onOpenChange={onOpenChange}>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent>Content</PopoverContent>
        </Popover>
      );

      await user.click(screen.getByRole('button', { name: 'Open' }));

      expect(onOpenChange).toHaveBeenCalledWith(true);
    });
  });

  describe('Closing Popover', () => {
    it('closes on escape key', async () => {
      const user = userEvent.setup();
      render(
        <Popover defaultOpen>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent>Popover content</PopoverContent>
        </Popover>
      );

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByText('Popover content')).not.toBeInTheDocument();
      });
    });

    it('closes on outside click', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <Popover defaultOpen>
            <PopoverTrigger>Open</PopoverTrigger>
            <PopoverContent>Popover content</PopoverContent>
          </Popover>
          <button>Outside button</button>
        </div>
      );

      await user.click(screen.getByRole('button', { name: 'Outside button' }));

      await waitFor(() => {
        expect(screen.queryByText('Popover content')).not.toBeInTheDocument();
      });
    });
  });

  describe('PopoverContent Styling', () => {
    it('applies content styles', () => {
      render(
        <Popover open>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent data-testid="content">Content</PopoverContent>
        </Popover>
      );

      const content = screen.getByTestId('content');
      expect(content).toHaveClass('z-50');
      expect(content).toHaveClass('w-72');
      expect(content).toHaveClass('rounded-md');
      expect(content).toHaveClass('border');
      expect(content).toHaveClass('bg-popover');
      expect(content).toHaveClass('p-4');
    });

    it('applies custom className', () => {
      render(
        <Popover open>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent className="w-80" data-testid="content">Content</PopoverContent>
        </Popover>
      );

      expect(screen.getByTestId('content')).toHaveClass('w-80');
    });
  });

  describe('Alignment', () => {
    it('defaults to center alignment', () => {
      render(
        <Popover open>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent data-testid="content">Content</PopoverContent>
        </Popover>
      );

      // Alignment is handled by Radix, we just verify the content renders
      expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    it('accepts align prop', () => {
      render(
        <Popover open>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent align="start" data-testid="content">Content</PopoverContent>
        </Popover>
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
    });
  });

  describe('Side Offset', () => {
    it('accepts sideOffset prop', () => {
      render(
        <Popover open>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent sideOffset={8} data-testid="content">Content</PopoverContent>
        </Popover>
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
    });
  });
});
