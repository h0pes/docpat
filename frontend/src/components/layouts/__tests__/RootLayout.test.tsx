/**
 * RootLayout Component Tests
 *
 * Tests for the root layout that wraps all routes.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RootLayout } from '../RootLayout';

// Mock SessionTimeoutWarning component
vi.mock('@/components/auth', () => ({
  SessionTimeoutWarning: () => <div data-testid="session-timeout-warning">Session Warning</div>,
}));

describe('RootLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithRouter = (initialEntries = ['/']) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/" element={<RootLayout />}>
            <Route index element={<div data-testid="home-content">Home Content</div>} />
            <Route path="dashboard" element={<div data-testid="dashboard-content">Dashboard Content</div>} />
            <Route path="login" element={<div data-testid="login-content">Login Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
  };

  describe('Rendering', () => {
    it('renders the outlet content', () => {
      renderWithRouter();

      expect(screen.getByTestId('home-content')).toBeInTheDocument();
    });

    it('renders session timeout warning', () => {
      renderWithRouter();

      expect(screen.getByTestId('session-timeout-warning')).toBeInTheDocument();
    });
  });

  describe('Route Rendering', () => {
    it('renders home content for / route', () => {
      renderWithRouter(['/']);

      expect(screen.getByTestId('home-content')).toBeInTheDocument();
      expect(screen.getByText('Home Content')).toBeInTheDocument();
    });

    it('renders dashboard content for /dashboard route', () => {
      renderWithRouter(['/dashboard']);

      expect(screen.getByTestId('dashboard-content')).toBeInTheDocument();
      expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
    });

    it('renders login content for /login route', () => {
      renderWithRouter(['/login']);

      expect(screen.getByTestId('login-content')).toBeInTheDocument();
      expect(screen.getByText('Login Content')).toBeInTheDocument();
    });
  });

  describe('Session Timeout Warning', () => {
    it('always renders session timeout warning regardless of route', () => {
      renderWithRouter(['/dashboard']);

      expect(screen.getByTestId('session-timeout-warning')).toBeInTheDocument();
    });

    it('renders session timeout warning with outlet content', () => {
      renderWithRouter(['/login']);

      // Both should be present
      expect(screen.getByTestId('login-content')).toBeInTheDocument();
      expect(screen.getByTestId('session-timeout-warning')).toBeInTheDocument();
    });
  });

  describe('Layout Structure', () => {
    it('renders as a fragment with outlet and session warning', () => {
      const { container } = renderWithRouter();

      // The layout renders content directly (fragment wrapper)
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});
