/**
 * Main App Component
 *
 * Root component that sets up the application structure with routing,
 * query client, and global providers (theme, i18n, auth, React Query).
 */

import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider } from './components/providers/ThemeProvider';
import { AuthProvider } from './store/authStore';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from './components/ui/toaster';
import { LiveAnnouncer } from './components/ui/live-announcer';
import { queryClient } from './lib/react-query';
import { router } from './routes';
import './i18n'; // Initialize i18next

/**
 * Main App component with all providers
 */
function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="system" storageKey="docpat-theme">
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <LiveAnnouncer>
              <RouterProvider router={router} />
              <Toaster />
              {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
            </LiveAnnouncer>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
