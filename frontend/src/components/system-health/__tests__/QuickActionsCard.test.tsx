/**
 * QuickActionsCard Component Tests
 *
 * Test suite for the quick actions card component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QuickActionsCard } from '../QuickActionsCard';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Wrapper component for router context
const renderWithRouter = (component: React.ReactNode) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('QuickActionsCard', () => {
  it('renders card title', () => {
    renderWithRouter(<QuickActionsCard />);

    expect(screen.getByText('system.actions.title')).toBeInTheDocument();
  });

  it('renders users action link', () => {
    renderWithRouter(<QuickActionsCard />);

    expect(screen.getByText('system.actions.users')).toBeInTheDocument();
    expect(screen.getByText('system.actions.users_desc')).toBeInTheDocument();
  });

  it('renders settings action link', () => {
    renderWithRouter(<QuickActionsCard />);

    expect(screen.getByText('system.actions.settings')).toBeInTheDocument();
    expect(screen.getByText('system.actions.settings_desc')).toBeInTheDocument();
  });

  it('renders audit logs action link', () => {
    renderWithRouter(<QuickActionsCard />);

    expect(screen.getByText('system.actions.audit_logs')).toBeInTheDocument();
    expect(screen.getByText('system.actions.audit_logs_desc')).toBeInTheDocument();
  });

  it('renders working hours action link', () => {
    renderWithRouter(<QuickActionsCard />);

    expect(screen.getByText('system.actions.working_hours')).toBeInTheDocument();
    expect(screen.getByText('system.actions.working_hours_desc')).toBeInTheDocument();
  });

  it('renders holidays action link', () => {
    renderWithRouter(<QuickActionsCard />);

    expect(screen.getByText('system.actions.holidays')).toBeInTheDocument();
    expect(screen.getByText('system.actions.holidays_desc')).toBeInTheDocument();
  });

  it('renders documents action link', () => {
    renderWithRouter(<QuickActionsCard />);

    expect(screen.getByText('system.actions.documents')).toBeInTheDocument();
    expect(screen.getByText('system.actions.documents_desc')).toBeInTheDocument();
  });

  it('renders correct link for users management', () => {
    renderWithRouter(<QuickActionsCard />);

    const usersLink = screen.getByText('system.actions.users').closest('a');
    expect(usersLink).toHaveAttribute('href', '/users');
  });

  it('renders correct link for settings', () => {
    renderWithRouter(<QuickActionsCard />);

    const settingsLink = screen.getByText('system.actions.settings').closest('a');
    expect(settingsLink).toHaveAttribute('href', '/settings');
  });

  it('renders correct link for audit logs', () => {
    renderWithRouter(<QuickActionsCard />);

    const auditLink = screen.getByText('system.actions.audit_logs').closest('a');
    expect(auditLink).toHaveAttribute('href', '/audit-logs');
  });

  it('renders correct link for documents', () => {
    renderWithRouter(<QuickActionsCard />);

    const documentsLink = screen.getByText('system.actions.documents').closest('a');
    expect(documentsLink).toHaveAttribute('href', '/document-templates');
  });

  it('renders all six quick action links', () => {
    renderWithRouter(<QuickActionsCard />);

    // Check that all six actions are rendered
    const actionLabels = [
      'system.actions.users',
      'system.actions.settings',
      'system.actions.audit_logs',
      'system.actions.working_hours',
      'system.actions.holidays',
      'system.actions.documents',
    ];

    actionLabels.forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });
});
