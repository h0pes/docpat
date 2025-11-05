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
import { Toaster } from './components/ui/toaster';
import { SessionTimeoutWarning } from './components/auth';
import { queryClient } from './lib/react-query';
import { router } from './routes';
import './i18n'; // Initialize i18next

/**
 * Main App component with all providers
 */
function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="docpat-theme">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
          <Toaster />
          <SessionTimeoutWarning />
          {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
