/**
 * API client with Telegram authentication
 */

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

const API_URL = import.meta.env.VITE_API_URL || '';

/**
 * Gets Telegram initData for authentication
 */
function getTelegramInitData(): string {
  // Try to get initData from Telegram WebApp
  if (window.Telegram?.WebApp?.initData) {
    return window.Telegram.WebApp.initData;
  }
  
  // In development mode, return empty string (will fail auth, but that's expected)
  if (import.meta.env.DEV) {
    console.warn('Running in dev mode without Telegram initData');
    return '';
  }
  
  return '';
}

/**
 * Makes an authenticated API request
 */
export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const initData = getTelegramInitData();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Add existing headers
  if (options.headers) {
    const existingHeaders = new Headers(options.headers);
    existingHeaders.forEach((value, key) => {
      headers[key] = value;
    });
  }
  
  // Add Telegram authentication header
  if (initData) {
    headers['X-Telegram-Init-Data'] = initData;
  }
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    const message = (errorData && typeof errorData === 'object' && 'error' in errorData)
      ? (errorData as Record<string, string>).error ?? 'Unknown error'
      : 'Unknown error';
    throw new ApiError(response.status, message || `HTTP ${response.status}: ${response.statusText}`, errorData);
  }
  
  return response.json();
}

/**
 * GET request
 */
export async function apiGet<T = unknown>(endpoint: string): Promise<T> {
  return apiRequest<T>(endpoint, { method: 'GET' });
}

/**
 * POST request
 */
export async function apiPost<T = unknown>(endpoint: string, data?: unknown): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * DELETE request
 */
export async function apiDelete<T = unknown>(endpoint: string, data?: unknown): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'DELETE',
    body: data ? JSON.stringify(data) : undefined,
  });
}
