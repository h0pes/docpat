/**
 * Collapsible Component Tests
 *
 * Tests for the collapsible component that shows/hides content.
 */

import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '../collapsible';

describe('Collapsible', () => {
  describe('Basic Rendering', () => {
    it('renders collapsible container', () => {
      render(
        <Collapsible data-testid="collapsible">
          <CollapsibleTrigger>Toggle</CollapsibleTrigger>
          <CollapsibleContent>Content</CollapsibleContent>
        </Collapsible>
      );

      expect(screen.getByTestId('collapsible')).toBeInTheDocument();
    });

    it('renders trigger', () => {
      render(
        <Collapsible>
          <CollapsibleTrigger>Toggle me</CollapsibleTrigger>
          <CollapsibleContent>Content</CollapsibleContent>
        </Collapsible>
      );

      expect(screen.getByRole('button', { name: 'Toggle me' })).toBeInTheDocument();
    });
  });

  describe('Collapsed State', () => {
    it('hides content by default', () => {
      render(
        <Collapsible>
          <CollapsibleTrigger data-testid="trigger">Toggle</CollapsibleTrigger>
          <CollapsibleContent>Hidden content</CollapsibleContent>
        </Collapsible>
      );

      expect(screen.getByTestId('trigger')).toHaveAttribute('data-state', 'closed');
    });

    it('has closed data-state when collapsed', () => {
      render(
        <Collapsible open={false}>
          <CollapsibleTrigger data-testid="trigger">Toggle</CollapsibleTrigger>
          <CollapsibleContent>Content</CollapsibleContent>
        </Collapsible>
      );

      expect(screen.getByTestId('trigger')).toHaveAttribute('data-state', 'closed');
    });
  });

  describe('Expanded State', () => {
    it('shows content when open', () => {
      render(
        <Collapsible open>
          <CollapsibleTrigger data-testid="trigger">Toggle</CollapsibleTrigger>
          <CollapsibleContent>Visible content</CollapsibleContent>
        </Collapsible>
      );

      expect(screen.getByText('Visible content')).toBeInTheDocument();
    });

    it('has open data-state when expanded', () => {
      render(
        <Collapsible open>
          <CollapsibleTrigger data-testid="trigger">Toggle</CollapsibleTrigger>
          <CollapsibleContent>Content</CollapsibleContent>
        </Collapsible>
      );

      expect(screen.getByTestId('trigger')).toHaveAttribute('data-state', 'open');
    });
  });

  describe('Toggle Behavior', () => {
    it('expands when trigger is clicked', async () => {
      const user = userEvent.setup();
      render(
        <Collapsible>
          <CollapsibleTrigger data-testid="trigger">Toggle</CollapsibleTrigger>
          <CollapsibleContent>Content</CollapsibleContent>
        </Collapsible>
      );

      await user.click(screen.getByTestId('trigger'));

      await waitFor(() => {
        expect(screen.getByTestId('trigger')).toHaveAttribute('data-state', 'open');
      });
    });

    it('collapses when trigger clicked while open', async () => {
      const user = userEvent.setup();
      render(
        <Collapsible defaultOpen>
          <CollapsibleTrigger data-testid="trigger">Toggle</CollapsibleTrigger>
          <CollapsibleContent>Content</CollapsibleContent>
        </Collapsible>
      );

      expect(screen.getByTestId('trigger')).toHaveAttribute('data-state', 'open');

      await user.click(screen.getByTestId('trigger'));

      await waitFor(() => {
        expect(screen.getByTestId('trigger')).toHaveAttribute('data-state', 'closed');
      });
    });
  });

  describe('Default Open', () => {
    it('starts open with defaultOpen prop', () => {
      render(
        <Collapsible defaultOpen>
          <CollapsibleTrigger data-testid="trigger">Toggle</CollapsibleTrigger>
          <CollapsibleContent>Content</CollapsibleContent>
        </Collapsible>
      );

      expect(screen.getByTestId('trigger')).toHaveAttribute('data-state', 'open');
    });
  });

  describe('Controlled State', () => {
    it('can be controlled', () => {
      const { rerender } = render(
        <Collapsible open>
          <CollapsibleTrigger data-testid="trigger">Toggle</CollapsibleTrigger>
          <CollapsibleContent>Content</CollapsibleContent>
        </Collapsible>
      );

      expect(screen.getByTestId('trigger')).toHaveAttribute('data-state', 'open');

      rerender(
        <Collapsible open={false}>
          <CollapsibleTrigger data-testid="trigger">Toggle</CollapsibleTrigger>
          <CollapsibleContent>Content</CollapsibleContent>
        </Collapsible>
      );

      expect(screen.getByTestId('trigger')).toHaveAttribute('data-state', 'closed');
    });
  });

  describe('Disabled State', () => {
    it('can be disabled', () => {
      render(
        <Collapsible disabled>
          <CollapsibleTrigger data-testid="trigger">Toggle</CollapsibleTrigger>
          <CollapsibleContent>Content</CollapsibleContent>
        </Collapsible>
      );

      expect(screen.getByTestId('trigger')).toBeDisabled();
    });

    it('does not toggle when disabled', async () => {
      const user = userEvent.setup();
      render(
        <Collapsible disabled>
          <CollapsibleTrigger data-testid="trigger">Toggle</CollapsibleTrigger>
          <CollapsibleContent>Content</CollapsibleContent>
        </Collapsible>
      );

      await user.click(screen.getByTestId('trigger'));

      expect(screen.getByTestId('trigger')).toHaveAttribute('data-state', 'closed');
    });
  });

  describe('HTML Attributes', () => {
    it('passes through data attributes', () => {
      render(
        <Collapsible data-testid="collapsible" data-section="main">
          <CollapsibleTrigger>Toggle</CollapsibleTrigger>
          <CollapsibleContent>Content</CollapsibleContent>
        </Collapsible>
      );

      expect(screen.getByTestId('collapsible')).toHaveAttribute('data-section', 'main');
    });
  });
});
