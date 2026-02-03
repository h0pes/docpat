/**
 * Tests for error extraction utilities
 *
 * Verifies that extractErrorMessage and getErrorTitle correctly
 * handle various error types: Axios errors, standard Errors,
 * network errors, and unknown values.
 */

import { describe, it, expect, vi } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import { extractErrorMessage, getErrorTitle } from '../error-utils';

/** Mock translation function that returns the key itself */
const mockT = vi.fn((key: string) => key) as unknown as import('i18next').TFunction;

/**
 * Creates a mock AxiosError with the given status and optional message
 */
function createAxiosError(
  status: number,
  message?: string
): AxiosError<{ message?: string }> {
  const error = new AxiosError(
    'Request failed',
    AxiosError.ERR_BAD_REQUEST,
    undefined,
    {},
    {
      status,
      statusText: 'Error',
      headers: {},
      config: { headers: new AxiosHeaders() },
      data: message ? { message } : {},
    }
  );
  return error;
}

/**
 * Creates a mock AxiosError with no response (network error)
 */
function createNetworkError(): AxiosError {
  const error = new AxiosError(
    'Network Error',
    AxiosError.ERR_NETWORK,
    undefined,
    {}
  );
  // Ensure no response is set
  error.response = undefined;
  return error;
}

describe('extractErrorMessage', () => {
  it('returns server message when present in Axios error', () => {
    const error = createAxiosError(400, 'Patient already exists');
    expect(extractErrorMessage(error, mockT)).toBe('Patient already exists');
  });

  it('returns i18n key for 400 Bad Request without server message', () => {
    const error = createAxiosError(400);
    expect(extractErrorMessage(error, mockT)).toBe('errors.badRequest');
  });

  it('returns i18n key for 401 Unauthorized', () => {
    const error = createAxiosError(401);
    expect(extractErrorMessage(error, mockT)).toBe('errors.unauthorized');
  });

  it('returns i18n key for 403 Forbidden', () => {
    const error = createAxiosError(403);
    expect(extractErrorMessage(error, mockT)).toBe('errors.forbidden');
  });

  it('returns i18n key for 404 Not Found', () => {
    const error = createAxiosError(404);
    expect(extractErrorMessage(error, mockT)).toBe('errors.notFound');
  });

  it('returns i18n key for 409 Conflict', () => {
    const error = createAxiosError(409);
    expect(extractErrorMessage(error, mockT)).toBe('errors.conflict');
  });

  it('returns i18n key for 422 Validation Failed', () => {
    const error = createAxiosError(422);
    expect(extractErrorMessage(error, mockT)).toBe('errors.validationFailed');
  });

  it('returns i18n key for 429 Too Many Requests', () => {
    const error = createAxiosError(429);
    expect(extractErrorMessage(error, mockT)).toBe('errors.tooManyRequests');
  });

  it('returns i18n key for 500 Server Error', () => {
    const error = createAxiosError(500);
    expect(extractErrorMessage(error, mockT)).toBe('errors.serverError');
  });

  it('returns i18n key for 502 Bad Gateway (mapped to serverError)', () => {
    const error = createAxiosError(502);
    expect(extractErrorMessage(error, mockT)).toBe('errors.serverError');
  });

  it('returns network error key for Axios error with no response', () => {
    const error = createNetworkError();
    expect(extractErrorMessage(error, mockT)).toBe('errors.network');
  });

  it('returns generic error key for unmapped Axios status codes', () => {
    const error = createAxiosError(418); // I'm a teapot
    expect(extractErrorMessage(error, mockT)).toBe('errors.generic');
  });

  it('prefers server message over status-code mapping', () => {
    const error = createAxiosError(500, 'Database connection failed');
    expect(extractErrorMessage(error, mockT)).toBe('Database connection failed');
  });

  it('ignores empty server messages', () => {
    const error = createAxiosError(404, '');
    expect(extractErrorMessage(error, mockT)).toBe('errors.notFound');
  });

  it('returns Error.message for standard Error objects', () => {
    const error = new Error('Something broke');
    expect(extractErrorMessage(error, mockT)).toBe('Something broke');
  });

  it('returns generic key for null error', () => {
    expect(extractErrorMessage(null, mockT)).toBe('errors.generic');
  });

  it('returns generic key for undefined error', () => {
    expect(extractErrorMessage(undefined, mockT)).toBe('errors.generic');
  });

  it('returns generic key for string error', () => {
    expect(extractErrorMessage('some error', mockT)).toBe('errors.generic');
  });
});

describe('getErrorTitle', () => {
  it('returns clientError title for 4xx Axios errors', () => {
    expect(getErrorTitle(createAxiosError(400))).toBe('errors.title.clientError');
    expect(getErrorTitle(createAxiosError(404))).toBe('errors.title.clientError');
    expect(getErrorTitle(createAxiosError(422))).toBe('errors.title.clientError');
    expect(getErrorTitle(createAxiosError(429))).toBe('errors.title.clientError');
  });

  it('returns serverError title for 5xx Axios errors', () => {
    expect(getErrorTitle(createAxiosError(500))).toBe('errors.title.serverError');
    expect(getErrorTitle(createAxiosError(502))).toBe('errors.title.serverError');
    expect(getErrorTitle(createAxiosError(503))).toBe('errors.title.serverError');
  });

  it('returns networkError title for Axios errors with no response', () => {
    expect(getErrorTitle(createNetworkError())).toBe('errors.title.networkError');
  });

  it('returns unknownError title for non-Axios errors', () => {
    expect(getErrorTitle(new Error('test'))).toBe('errors.title.unknownError');
    expect(getErrorTitle(null)).toBe('errors.title.unknownError');
    expect(getErrorTitle('string error')).toBe('errors.title.unknownError');
  });
});
