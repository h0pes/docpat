/**
 * Tests for the EmptyState component
 *
 * Verifies rendering of both default and compact variants,
 * optional props, and the presence of Card wrapper in default mode.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserPlus, Calendar } from 'lucide-react';
import { EmptyState } from '../empty-state';

describe('EmptyState', () => {
  it('renders title and icon', () => {
    render(<EmptyState icon={UserPlus} title="No patients" />);
    expect(screen.getByText('No patients')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(
      <EmptyState
        icon={UserPlus}
        title="No patients"
        description="Add your first patient to get started"
      />
    );
    expect(screen.getByText('Add your first patient to get started')).toBeInTheDocument();
  });

  it('does not render description when not provided', () => {
    const { container } = render(<EmptyState icon={UserPlus} title="No data" />);
    // Only the h3 and icon should be present, no p element
    expect(container.querySelectorAll('p')).toHaveLength(0);
  });

  it('renders action when provided', () => {
    render(
      <EmptyState
        icon={UserPlus}
        title="No patients"
        action={<button>Add Patient</button>}
      />
    );
    expect(screen.getByText('Add Patient')).toBeInTheDocument();
  });

  it('does not render action when not provided', () => {
    render(<EmptyState icon={UserPlus} title="No patients" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('wraps content in Card for default variant', () => {
    const { container } = render(
      <EmptyState icon={UserPlus} title="No patients" />
    );
    // Card renders as a div with specific classes
    expect(container.querySelector('[class*="rounded-"]')).toBeInTheDocument();
  });

  it('does not wrap in Card for compact variant', () => {
    const { container } = render(
      <EmptyState icon={Calendar} title="No appointments" variant="compact" />
    );
    // Compact variant: the root element should be the flex container directly
    const rootDiv = container.firstElementChild;
    expect(rootDiv?.classList.contains('flex')).toBe(true);
    expect(rootDiv?.classList.contains('py-6')).toBe(true);
  });

  it('applies default variant styling (py-12)', () => {
    const { container } = render(
      <EmptyState icon={UserPlus} title="No data" />
    );
    expect(container.querySelector('.py-12')).toBeInTheDocument();
  });

  it('applies compact variant styling (py-6)', () => {
    const { container } = render(
      <EmptyState icon={UserPlus} title="No data" variant="compact" />
    );
    expect(container.querySelector('.py-6')).toBeInTheDocument();
  });

  it('applies additional className', () => {
    const { container } = render(
      <EmptyState icon={UserPlus} title="No data" variant="compact" className="my-custom-class" />
    );
    expect(container.querySelector('.my-custom-class')).toBeInTheDocument();
  });

  it('renders heading as h3 element', () => {
    render(<EmptyState icon={UserPlus} title="No patients" />);
    const heading = screen.getByText('No patients');
    expect(heading.tagName).toBe('H3');
  });
});
