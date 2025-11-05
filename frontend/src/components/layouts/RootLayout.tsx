/**
 * Root Layout Component
 *
 * Wraps all routes and includes global components that need Router context
 * such as SessionTimeoutWarning.
 */

import { Outlet } from 'react-router-dom';
import { SessionTimeoutWarning } from '../auth';

/**
 * Root layout that wraps all application routes
 */
export function RootLayout() {
  return (
    <>
      <Outlet />
      <SessionTimeoutWarning />
    </>
  );
}
