import { logger } from '@/lib/logger';
import { toast } from '@/lib/toast';
import { ApiError } from './client';

export function isApiError(err: unknown): err is ApiError {
  return !!err && typeof (err as { status?: unknown }).status === 'number';
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

export function getApiErrorMessage(err: unknown): string {
  if (isApiError(err)) {
    const apiErr = err as ApiError;
    // Map common codes to user-friendly messages
    if (apiErr.status === 401 || apiErr.status === 403) {
      return 'Access denied. Please re-open the app and authorize again.';
    }
    if (apiErr.status === 410) {
      return 'This feature is no longer available.';
    }
    // For other 4xx/5xx show server-provided message if any
    const body = apiErr.body;
    if (body && typeof body === 'object' && 'error' in (body as Record<string, unknown>)) {
      const errVal = (body as Record<string, unknown>)['error'];
      return typeof errVal === 'string' ? errVal : `Server error (${apiErr.status}).`;
    } else {
      return `Server error (${apiErr.status}).`;
    }
  } else {
    return 'Network or unknown error. Check your connection or try again.';
  }
}
