/**
 * Test utilities
 *
 * Provides helper functions and wrappers for testing React components
 * with all necessary providers (React Query, Auth, Theme, etc.)
 */

import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/components/providers/ThemeProvider';

/**
 * Create a new QueryClient for each test to ensure isolation
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Wrapper component that includes all necessary providers
 */
interface AllProvidersProps {
  children: ReactNode;
  queryClient?: QueryClient;
  withRouter?: boolean;
}

export function AllProviders({ children, queryClient, withRouter = false }: AllProvidersProps) {
  const client = queryClient || createTestQueryClient();

  const content = (
    <ThemeProvider defaultTheme="light" storageKey="test-theme">
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </ThemeProvider>
  );

  if (withRouter) {
    // Need to import MemoryRouter at runtime
    const { MemoryRouter } = require('react-router-dom');
    return <MemoryRouter>{content}</MemoryRouter>;
  }

  return content;
}

/**
 * Custom render function that wraps components with all providers
 * Returns render result plus a user object from userEvent.setup()
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & {
    queryClient?: QueryClient;
    withRouter?: boolean;
  }
) {
  const { queryClient, withRouter = false, ...renderOptions } = options || {};
  const user = require('@testing-library/user-event').default.setup();

  const result = render(ui, {
    wrapper: ({ children }) => (
      <AllProviders queryClient={queryClient} withRouter={withRouter}>{children}</AllProviders>
    ),
    ...renderOptions,
  });

  return {
    ...result,
    user,
  };
}

/**
 * Mock localStorage for tests
 */
export const mockLocalStorage = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
})();

/**
 * Mock sessionStorage for tests
 */
export const mockSessionStorage = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
})();

/**
 * Wait for a condition to be true (polling)
 */
export async function waitForCondition(
  condition: () => boolean,
  timeout = 3000,
  interval = 50
): Promise<void> {
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const checkCondition = () => {
      if (condition()) {
        resolve();
      } else if (Date.now() - startTime > timeout) {
        reject(new Error('Timeout waiting for condition'));
      } else {
        setTimeout(checkCondition, interval);
      }
    };

    checkCondition();
  });
}

// Re-export everything from @testing-library/react
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
