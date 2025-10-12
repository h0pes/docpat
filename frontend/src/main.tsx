/**
 * DocPat Frontend - Main Application Entry Point
 *
 * Initializes React application with necessary providers:
 * - React Router for navigation
 * - React Query for server state management
 * - i18next for internationalization
 * - Theme provider for dark/light mode
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Failed to find the root element')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
)
