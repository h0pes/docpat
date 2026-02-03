/**
 * Main Layout Component
 *
 * Primary authenticated layout with header, sidebar, and content area.
 * Responsive design with mobile drawer and desktop fixed sidebar.
 */

import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppHeader } from './AppHeader';
import { Sidebar } from './Sidebar';
import { Sheet, SheetContent } from '../ui/sheet';

/**
 * Main application layout for authenticated pages
 */
export function MainLayout() {
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  /**
   * Close mobile menu (called on navigation)
   */
  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Skip Navigation Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {t('accessibility.skipToContent')}
      </a>

      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden lg:block lg:w-64">
        <Sidebar className="h-full" />
      </div>

      {/* Mobile Sidebar - drawer/sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <Sidebar className="h-full" onNavigate={closeMobileMenu} />
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <AppHeader onMenuClick={() => setMobileMenuOpen(true)} />

        {/* Page Content */}
        <main
          id="main-content"
          aria-label={t('accessibility.mainContent')}
          className="flex-1 overflow-y-auto bg-background p-4 sm:p-6 lg:p-8"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
