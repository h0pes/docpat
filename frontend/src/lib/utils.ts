/**
 * Utility functions for the frontend application
 *
 * This module provides helper functions for common operations throughout the application.
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines multiple class names intelligently, merging Tailwind CSS classes
 *
 * This function uses clsx to handle conditional classes and tailwind-merge to
 * intelligently merge Tailwind CSS classes, preventing conflicts and duplicates.
 *
 * @param inputs - Class values to combine (strings, arrays, objects, etc.)
 * @returns Merged class string
 *
 * @example
 * ```tsx
 * cn('px-2 py-1', 'bg-blue-500') // => 'px-2 py-1 bg-blue-500'
 * cn('px-2 py-1', isActive && 'bg-blue-500') // => 'px-2 py-1 bg-blue-500' (if isActive is true)
 * cn('px-2', 'px-4') // => 'px-4' (tailwind-merge resolves conflict)
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
