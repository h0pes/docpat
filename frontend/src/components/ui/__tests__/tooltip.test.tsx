/**
 * Tooltip Component Tests
 *
 * Tests for the tooltip component with trigger and content.
 */

import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../tooltip';

describe('Tooltip', () => {
  const renderTooltip = (children: React.ReactNode) => {
    return render(<TooltipProvider>{children}</TooltipProvider>);
  };

  describe('Basic Rendering', () => {
    it('renders trigger', () => {
      renderTooltip(
        <Tooltip>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Tooltip text</TooltipContent>
        </Tooltip>
      );

      expect(screen.getByText('Hover me')).toBeInTheDocument();
    });

    it('does not render content by default', () => {
      renderTooltip(
        <Tooltip>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Tooltip text</TooltipContent>
        </Tooltip>
      );

      expect(screen.queryByText('Tooltip text')).not.toBeInTheDocument();
    });

    it('renders content when open', () => {
      renderTooltip(
        <Tooltip open>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent data-testid="tooltip-content">Tooltip text</TooltipContent>
        </Tooltip>
      );

      expect(screen.getByTestId('tooltip-content')).toBeInTheDocument();
    });
  });

  describe('Opening Tooltip', () => {
    it('opens on hover', async () => {
      const user = userEvent.setup();
      renderTooltip(
        <Tooltip>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent data-testid="tooltip-content">Tooltip text</TooltipContent>
        </Tooltip>
      );

      await user.hover(screen.getByText('Hover me'));

      await waitFor(() => {
        expect(screen.getByTestId('tooltip-content')).toBeInTheDocument();
      });
    });

    it('opens on focus', async () => {
      const user = userEvent.setup();
      renderTooltip(
        <Tooltip>
          <TooltipTrigger>
            <button>Focus me</button>
          </TooltipTrigger>
          <TooltipContent data-testid="tooltip-content">Tooltip text</TooltipContent>
        </Tooltip>
      );

      await user.tab();

      await waitFor(() => {
        expect(screen.getByTestId('tooltip-content')).toBeInTheDocument();
      });
    });
  });

  describe('Closing Tooltip', () => {
    it('can be controlled', () => {
      // Test controlled open state
      const { rerender } = render(
        <TooltipProvider>
          <Tooltip open>
            <TooltipTrigger>Hover me</TooltipTrigger>
            <TooltipContent data-testid="tooltip-content">Tooltip text</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      expect(screen.getByTestId('tooltip-content')).toBeInTheDocument();

      // Rerender with open=false
      rerender(
        <TooltipProvider>
          <Tooltip open={false}>
            <TooltipTrigger>Hover me</TooltipTrigger>
            <TooltipContent data-testid="tooltip-content">Tooltip text</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      expect(screen.queryByTestId('tooltip-content')).not.toBeInTheDocument();
    });
  });

  describe('TooltipContent Styling', () => {
    it('applies content styles', () => {
      renderTooltip(
        <Tooltip open>
          <TooltipTrigger>Trigger</TooltipTrigger>
          <TooltipContent data-testid="content">Content</TooltipContent>
        </Tooltip>
      );

      const content = screen.getByTestId('content');
      expect(content).toHaveClass('z-50');
      expect(content).toHaveClass('rounded-md');
      expect(content).toHaveClass('border');
      expect(content).toHaveClass('bg-popover');
      expect(content).toHaveClass('text-sm');
    });

    it('applies custom className', () => {
      renderTooltip(
        <Tooltip open>
          <TooltipTrigger>Trigger</TooltipTrigger>
          <TooltipContent className="custom-tooltip" data-testid="content">Content</TooltipContent>
        </Tooltip>
      );

      expect(screen.getByTestId('content')).toHaveClass('custom-tooltip');
    });
  });

  describe('Side Offset', () => {
    it('accepts sideOffset prop', () => {
      renderTooltip(
        <Tooltip open>
          <TooltipTrigger>Trigger</TooltipTrigger>
          <TooltipContent sideOffset={8} data-testid="content">Content</TooltipContent>
        </Tooltip>
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
    });
  });

  describe('TooltipProvider', () => {
    it('provides tooltip context', () => {
      render(
        <TooltipProvider>
          <Tooltip open>
            <TooltipTrigger>Trigger</TooltipTrigger>
            <TooltipContent data-testid="tooltip-content">Content</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      expect(screen.getByTestId('tooltip-content')).toBeInTheDocument();
    });
  });
});
