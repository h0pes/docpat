/**
 * SettingsSection Component Tests
 *
 * Test suite for reusable settings layout components
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Clock } from 'lucide-react';
import {
  SettingsSection,
  SettingsField,
  SettingsRow,
  SettingsDivider,
} from '../SettingsSection';

describe('SettingsSection', () => {
  it('renders title and description', () => {
    render(
      <SettingsSection
        title="Test Section"
        description="This is a test description"
      >
        <div>Content</div>
      </SettingsSection>
    );

    expect(screen.getByText('Test Section')).toBeInTheDocument();
    expect(screen.getByText('This is a test description')).toBeInTheDocument();
  });

  it('renders children content', () => {
    render(
      <SettingsSection title="Test" description="Description">
        <div data-testid="child-content">Child content here</div>
      </SettingsSection>
    );

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.getByText('Child content here')).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    render(
      <SettingsSection
        title="Test"
        description="Description"
        icon={<Clock data-testid="icon" className="h-5 w-5" />}
      >
        <div>Content</div>
      </SettingsSection>
    );

    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('renders actions when provided', () => {
    render(
      <SettingsSection
        title="Test"
        description="Description"
        actions={<button data-testid="action-button">Save</button>}
      >
        <div>Content</div>
      </SettingsSection>
    );

    expect(screen.getByTestId('action-button')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('renders without icon', () => {
    render(
      <SettingsSection title="Test" description="Description">
        <div>Content</div>
      </SettingsSection>
    );

    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('renders without actions', () => {
    render(
      <SettingsSection title="Test" description="Description">
        <div>Content</div>
      </SettingsSection>
    );

    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});

describe('SettingsField', () => {
  it('renders label and children', () => {
    render(
      <SettingsField label="Field Label">
        <input data-testid="input" />
      </SettingsField>
    );

    expect(screen.getByText('Field Label')).toBeInTheDocument();
    expect(screen.getByTestId('input')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(
      <SettingsField label="Field" description="This is a helpful description">
        <input />
      </SettingsField>
    );

    expect(screen.getByText('This is a helpful description')).toBeInTheDocument();
  });

  it('does not render description when not provided', () => {
    render(
      <SettingsField label="Field">
        <input />
      </SettingsField>
    );

    // The only text should be the label
    expect(screen.queryByText(/description/i)).not.toBeInTheDocument();
  });

  it('shows read-only indicator when readOnly is true', () => {
    render(
      <SettingsField label="Field" readOnly>
        <input />
      </SettingsField>
    );

    expect(screen.getByText('(Read-only)')).toBeInTheDocument();
  });

  it('shows error message when error is provided', () => {
    render(
      <SettingsField label="Field" error="This field is required">
        <input />
      </SettingsField>
    );

    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });
});

describe('SettingsRow', () => {
  it('renders multiple children in a row', () => {
    render(
      <SettingsRow>
        <div data-testid="child-1">First</div>
        <div data-testid="child-2">Second</div>
      </SettingsRow>
    );

    expect(screen.getByTestId('child-1')).toBeInTheDocument();
    expect(screen.getByTestId('child-2')).toBeInTheDocument();
  });

  it('applies grid layout class', () => {
    const { container } = render(
      <SettingsRow>
        <div>First</div>
        <div>Second</div>
      </SettingsRow>
    );

    expect(container.querySelector('.grid')).toBeInTheDocument();
  });
});

describe('SettingsDivider', () => {
  it('renders without label as hr element', () => {
    const { container } = render(<SettingsDivider />);

    expect(container.querySelector('hr')).toBeInTheDocument();
  });

  it('renders with label', () => {
    render(<SettingsDivider label="Section Label" />);

    expect(screen.getByText('Section Label')).toBeInTheDocument();
  });

  it('renders border when label is provided', () => {
    const { container } = render(<SettingsDivider label="Section" />);

    expect(container.querySelector('.border-t')).toBeInTheDocument();
  });

  it('renders hr with proper spacing class', () => {
    const { container } = render(<SettingsDivider />);

    const hr = container.querySelector('hr');
    expect(hr).toHaveClass('my-6');
  });
});
