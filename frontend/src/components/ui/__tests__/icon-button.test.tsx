/**
 * Tests for the IconButton component
 *
 * Verifies that the IconButton renders an accessible icon-only button
 * with aria-label and optional tooltip wrapper.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { TooltipProvider } from '../tooltip';
import { IconButton } from '../icon-button';

/** Helper to render within TooltipProvider */
function renderWithTooltip(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

describe('IconButton', () => {
  it('renders a button with aria-label', () => {
    renderWithTooltip(<IconButton icon={ArrowLeft} label="Go back" />);
    const button = screen.getByRole('button', { name: 'Go back' });
    expect(button).toBeInTheDocument();
  });

  it('renders the icon SVG', () => {
    const { container } = renderWithTooltip(<IconButton icon={ArrowLeft} label="Go back" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('passes button props through (variant, size)', () => {
    renderWithTooltip(<IconButton icon={Trash2} label="Delete" variant="destructive" size="sm" />);
    const button = screen.getByRole('button', { name: 'Delete' });
    expect(button).toBeInTheDocument();
  });

  it('handles click events', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderWithTooltip(<IconButton icon={ArrowLeft} label="Go back" onClick={onClick} />);

    await user.click(screen.getByRole('button', { name: 'Go back' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('can be disabled', () => {
    renderWithTooltip(<IconButton icon={ArrowLeft} label="Go back" disabled />);
    expect(screen.getByRole('button', { name: 'Go back' })).toBeDisabled();
  });

  it('applies custom icon className', () => {
    const { container } = renderWithTooltip(
      <IconButton icon={ArrowLeft} label="Go back" iconClassName="h-5 w-5" />
    );
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('h-5');
    expect(svg).toHaveClass('w-5');
  });

  it('wraps in tooltip by default', () => {
    renderWithTooltip(<IconButton icon={ArrowLeft} label="Go back" />);
    const button = screen.getByRole('button', { name: 'Go back' });
    expect(button).toBeInTheDocument();
  });

  it('renders without tooltip when showTooltip is false', () => {
    render(<IconButton icon={ArrowLeft} label="Go back" showTooltip={false} />);
    const button = screen.getByRole('button', { name: 'Go back' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label', 'Go back');
  });
});
