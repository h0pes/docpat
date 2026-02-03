/**
 * Centralized error extraction utilities
 *
 * Provides consistent error message extraction from API responses,
 * mapping HTTP status codes to user-friendly i18n keys. Replaces
 * the duplicated error handling pattern across mutation handlers.
 */

import axios from 'axios';
import type { TFunction } from 'i18next';

/**
 * HTTP status code to i18n error key mapping
 */
const STATUS_TO_ERROR_KEY: Record<number, string> = {
  400: 'errors.badRequest',
  401: 'errors.unauthorized',
  403: 'errors.forbidden',
  404: 'errors.notFound',
  409: 'errors.conflict',
  422: 'errors.validationFailed',
  429: 'errors.tooManyRequests',
  500: 'errors.serverError',
  502: 'errors.serverError',
  503: 'errors.serverError',
  504: 'errors.serverError',
};

/**
 * Extracts a user-friendly error message from an unknown error.
 *
 * For Axios errors, prefers the server-provided message from
 * `response.data.message`. Falls back to a status-code-based
 * i18n key, then to a generic error message.
 *
 * @param error - The caught error (AxiosError, Error, or unknown)
 * @param t - The i18next translation function
 * @returns A translated, user-friendly error string
 *
 * @example
 * ```ts
 * onError: (error: unknown) => {
 *   toast({
 *     variant: 'destructive',
 *     title: t(getErrorTitle(error)),
 *     description: extractErrorMessage(error, t),
 *   });
 * }
 * ```
 */
export function extractErrorMessage(error: unknown, t: TFunction): string {
  // Axios error with a server response
  if (axios.isAxiosError(error)) {
    // Prefer the server-provided message if present
    const serverMessage = error.response?.data?.message;
    if (typeof serverMessage === 'string' && serverMessage.length > 0) {
      return serverMessage;
    }

    // Fall back to status-code-based i18n key
    const status = error.response?.status;
    if (status && STATUS_TO_ERROR_KEY[status]) {
      return t(STATUS_TO_ERROR_KEY[status]);
    }

    // Network error (no response received)
    if (!error.response) {
      return t('errors.network');
    }

    return t('errors.generic');
  }

  // Standard Error with a message
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return t('errors.generic');
}

/**
 * Returns an i18n key for the error toast title, based on the
 * error's HTTP status category.
 *
 * @param error - The caught error
 * @returns An i18n key string for the toast title
 */
export function getErrorTitle(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;

    if (!status || !error.response) {
      return 'errors.title.networkError';
    }

    if (status >= 400 && status < 500) {
      return 'errors.title.clientError';
    }

    if (status >= 500) {
      return 'errors.title.serverError';
    }
  }

  return 'errors.title.unknownError';
}
