/**
 * Tests for LiveAnnouncer component and useAnnouncer hook
 *
 * Verifies that screen reader announcements are rendered into
 * the correct ARIA live regions with proper roles and attributes.
 */

import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { LiveAnnouncer, useAnnouncer } from '../live-announcer';

/**
 * Test component that exposes the announce function via buttons
 */
function TestConsumer() {
  const { announce } = useAnnouncer();
  return (
    <div>
      <button onClick={() => announce('Polite message')}>
        Announce Polite
      </button>
      <button onClick={() => announce('Assertive message', 'assertive')}>
        Announce Assertive
      </button>
    </div>
  );
}

describe('LiveAnnouncer', () => {
  it('renders children', () => {
    render(
      <LiveAnnouncer>
        <div data-testid="child">Child content</div>
      </LiveAnnouncer>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('renders polite and assertive live regions', () => {
    render(
      <LiveAnnouncer>
        <div>Content</div>
      </LiveAnnouncer>
    );

    const politeRegion = screen.getByRole('status');
    expect(politeRegion).toBeInTheDocument();
    expect(politeRegion).toHaveAttribute('aria-live', 'polite');
    expect(politeRegion).toHaveAttribute('aria-atomic', 'true');
    expect(politeRegion).toHaveClass('sr-only');

    const alertRegion = screen.getByRole('alert');
    expect(alertRegion).toBeInTheDocument();
    expect(alertRegion).toHaveAttribute('aria-live', 'assertive');
    expect(alertRegion).toHaveAttribute('aria-atomic', 'true');
    expect(alertRegion).toHaveClass('sr-only');
  });

  it('announces polite messages into the status region', async () => {
    render(
      <LiveAnnouncer>
        <TestConsumer />
      </LiveAnnouncer>
    );

    await act(async () => {
      screen.getByText('Announce Polite').click();
      // Allow requestAnimationFrame to execute
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });

    const politeRegion = screen.getByRole('status');
    expect(politeRegion).toHaveTextContent('Polite message');
  });

  it('announces assertive messages into the alert region', async () => {
    render(
      <LiveAnnouncer>
        <TestConsumer />
      </LiveAnnouncer>
    );

    await act(async () => {
      screen.getByText('Announce Assertive').click();
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });

    const alertRegion = screen.getByRole('alert');
    expect(alertRegion).toHaveTextContent('Assertive message');
  });
});

describe('useAnnouncer', () => {
  it('throws when used outside LiveAnnouncer', () => {
    // Suppress console.error for the expected error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    function BadComponent() {
      useAnnouncer();
      return null;
    }

    expect(() => render(<BadComponent />)).toThrow(
      'useAnnouncer must be used within a LiveAnnouncer provider'
    );

    consoleSpy.mockRestore();
  });
});
