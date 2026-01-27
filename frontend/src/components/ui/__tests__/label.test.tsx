/**
 * Label Component Tests
 *
 * Tests for the label component.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Label } from '../label';

describe('Label', () => {
  describe('Rendering', () => {
    it('renders label element', () => {
      render(<Label>Username</Label>);

      expect(screen.getByText('Username')).toBeInTheDocument();
    });

    it('renders as label element', () => {
      render(<Label data-testid="label">Test</Label>);

      const label = screen.getByTestId('label');
      expect(label.tagName).toBe('LABEL');
    });

    it('renders children', () => {
      render(
        <Label>
          <span data-testid="child">Required</span> Field
        </Label>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies label styles', () => {
      render(<Label data-testid="label">Test</Label>);

      const label = screen.getByTestId('label');
      expect(label).toHaveClass('text-sm');
      expect(label).toHaveClass('font-medium');
      expect(label).toHaveClass('leading-none');
    });

    it('applies custom className', () => {
      render(<Label className="custom-label" data-testid="label">Test</Label>);

      expect(screen.getByTestId('label')).toHaveClass('custom-label');
    });

    it('merges custom className with base styles', () => {
      render(<Label className="custom-label" data-testid="label">Test</Label>);

      const label = screen.getByTestId('label');
      expect(label).toHaveClass('custom-label');
      expect(label).toHaveClass('text-sm');
    });
  });

  describe('htmlFor Attribute', () => {
    it('accepts htmlFor prop', () => {
      render(<Label htmlFor="email" data-testid="label">Email</Label>);

      expect(screen.getByTestId('label')).toHaveAttribute('for', 'email');
    });

    it('associates with input using htmlFor', () => {
      render(
        <>
          <Label htmlFor="test-input">Test Label</Label>
          <input id="test-input" />
        </>
      );

      expect(screen.getByLabelText('Test Label')).toBeInTheDocument();
    });
  });

  describe('HTML Attributes', () => {
    it('passes through id attribute', () => {
      render(<Label id="my-label" data-testid="label">Test</Label>);

      expect(screen.getByTestId('label')).toHaveAttribute('id', 'my-label');
    });

    it('passes through data attributes', () => {
      render(<Label data-testid="label" data-custom="value">Test</Label>);

      expect(screen.getByTestId('label')).toHaveAttribute('data-custom', 'value');
    });
  });
});
