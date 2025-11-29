import { logger } from '@/lib/logger';
import { toast } from '@/lib/toast';
import { ApiError } from './client';

export function isApiError(err: unknown): err is ApiError {
  return !!err && typeof (err as { status?: unknown }).status === 'number';
}

interface ApiErrorInfo {
  key: string;
  params?: Record<string, unknown>;
}

export function handleApiError(err: unknown) {
  if (isApiError(err)) {
    const apiErr = err as ApiError;
    logger.warn(`API Error ${apiErr.status}`, { status: apiErr.status, body: apiErr.body });
    // Map common codes to user-friendly messages
    if (apiErr.status === 401 || apiErr.status === 403) {
      toast.error('Access denied. Please re-open the app and authorize again.');
      return;
    }
    if (apiErr.status === 410) {
      toast.error('This feature is no longer available.');
      return;
    }
    // For other 4xx/5xx show server-provided message if any
    let message: string;
    const body = apiErr.body;
    if (body && typeof body === 'object' && 'error' in (body as Record<string, unknown>)) {
      const errVal = (body as Record<string, unknown>)['error'];
      message = typeof errVal === 'string' ? errVal : `Server error (${apiErr.status}).`;
    } else {
      message = `Server error (${apiErr.status}).`;
    }
    toast.error(String(message));
  } else {
    logger.error('Unknown error', { error: String(err) });
    toast.error('Network or unknown error. Check your connection or try again.');
  }
}

export default handleApiError;

export function getApiErrorInfo(err: unknown): ApiErrorInfo {
  if (isApiError(err)) {
    const apiErr = err as ApiError;
    // Map common codes to user-friendly messages
    if (apiErr.status === 401 || apiErr.status === 403) {
      return { key: 'api_error.access_denied' };
    }
    if (apiErr.status === 410) {
      return { key: 'api_error.feature_unavailable' };
    }
    // For rate limit (429)
    if (apiErr.status === 429) {
      return { key: 'api_error.rate_limit' };
    }
    // For other 4xx/5xx show server-provided message if any
    const body = apiErr.body;
    if (body && typeof body === 'object' && 'error' in (body as Record<string, unknown>)) {
      const errVal = (body as Record<string, unknown>)['error'];
      if (typeof errVal === 'string') {
        return { key: 'api_error.server_message', params: { message: errVal } };
      }
    }
    return { key: 'api_error.server_error', params: { status: apiErr.status } };
  } else {
    return { key: 'api_error.network_error' };
  }
}

// Backward compatibility
export function getApiErrorMessage(err: unknown): string {
  const info = getApiErrorInfo(err);
  // Fallback to English for backward compatibility
  switch (info.key) {
    case 'api_error.access_denied':
      return 'Access denied. Please re-open the app and authorize again.';
    case 'api_error.feature_unavailable':
      return 'This feature is no longer available.';
    case 'api_error.rate_limit':
      return 'Too many requests. Please try again later.';
    case 'api_error.server_message':
      return info.params?.message as string || 'Server error.';
    case 'api_error.server_error':
      return `Server error (${info.params?.status}).`;
    case 'api_error.network_error':
    default:
      return 'Network or unknown error. Check your connection or try again.';
  }
}
