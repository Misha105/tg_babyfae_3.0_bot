import { logger } from '@/lib/logger';
/**
 * API client with Telegram authentication
 */

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = 'ApiError';
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
    logger.warn('Running in dev mode without Telegram initData');
    return '';
  }
  
  return '';
}

/**
 * Makes an authenticated API request
 */
export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestInit & { timeoutMs?: number; retries?: number } = {}
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
  
  // Mask sensitive headers for logging
  const maskHeaders = (h: Record<string, string>) => {
    const result: Record<string, string> = {};
    Object.keys(h).forEach((k) => {
      if (k.toLowerCase() === 'x-telegram-init-data') {
        result[k] = '***';
      } else {
        result[k] = h[k];
      }
    });
    return result;
  };

  const method = (options.method || 'GET').toUpperCase();
  const sensitiveKeys = ['initData', 'x-telegram-init-data', 'token', 'password'];
  const maskSensitive = (obj: unknown): unknown => {
    try {
      if (!obj || typeof obj !== 'object') return obj;
      const clone = JSON.parse(JSON.stringify(obj));
      const maskRec = (o: unknown) => {
        if (o && typeof o === 'object') {
          const obj = o as Record<string, unknown>;
          Object.keys(obj).forEach((k) => {
            const lower = k.toLowerCase();
            if (sensitiveKeys.includes(lower)) {
              (obj as Record<string, unknown>)[k] = '***';
            } else {
              maskRec(obj[k]);
            }
          });
        }
      };
      maskRec(clone);
      return clone;
    } catch {
      return obj;
    }
  };

  const bodySnippet = (() => {
    const b = options.body;
    if (!b) return undefined;
    if (typeof b === 'string') {
      try {
        const parsed = JSON.parse(b);
        const masked = maskSensitive(parsed);
        const s = JSON.stringify(masked);
        return s.length > 200 ? `${s.slice(0, 200)}...` : s;
      } catch {
        return b.length > 200 ? `${b.slice(0, 200)}...` : b;
      }
    }
    const masked = maskSensitive(b);
    try {
      const s = JSON.stringify(masked);
      return s.length > 200 ? `${s.slice(0, 200)}...` : s;
    } catch {
      return String(b);
    }
  })();

  const timeoutMs = (options as RequestInit & { timeoutMs?: number }).timeoutMs ?? 30000;
  const retries = (options as RequestInit & { retries?: number }).retries ?? 0;
  const start = Date.now();
  logger.debug(`Request ${method} ${endpoint}`, {
    method,
    endpoint,
    headers: maskHeaders(headers),
    body: bodySnippet,
    timeoutMs,
  });

  let response: Response;
  let controller: AbortController | undefined;
  let timeoutId: number | undefined;
  // Retry loop for transient errors
  let attempt = 0;
  while (true) {
    try {
      const userSignal = (options as RequestInit & { signal?: AbortSignal }).signal;
      const reqOptions: RequestInit = { ...options, headers };
      if (!userSignal) {
        controller = new AbortController();
        (reqOptions as RequestInit & { signal?: AbortSignal }).signal = controller.signal;
        timeoutId = window.setTimeout(() => controller?.abort(), timeoutMs);
      }

      response = await fetch(`${API_URL}${endpoint}`, reqOptions);
      break; // success
    } catch (err) {
      const duration = Date.now() - start;
      const e = err as Error | undefined;
      if (e?.name === 'AbortError') {
        logger.warn(`Request aborted ${method} ${endpoint} (${duration}ms)`);
      } else {
        logger.error(`Network error ${method} ${endpoint} (${duration}ms)`, { error: e?.message ?? String(err) });
      }
      // Retry on network error if we still have attempts
      if (attempt < retries) {
        const backoff = 200 * Math.pow(2, attempt);
        attempt += 1;
        await new Promise((res) => setTimeout(res, backoff));
        continue;
      }
      throw err;
    } finally {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    }
  }
    

  const duration = Date.now() - start;
  logger.http(method, endpoint, response.status, duration);
  
  if (!response.ok) {
    let errorData: unknown;
    try {
      errorData = await response.json();
    } catch {
      // Not JSON; try to get text
      try {
        errorData = await response.text();
      } catch {
        errorData = { error: 'Unknown error' };
      }
    }
    const message = (errorData && typeof errorData === 'object' && 'error' in errorData)
      ? (errorData as Record<string, string>).error ?? 'Unknown error'
      : 'Unknown error';
    logger.warn(`API error ${method} ${endpoint} ${response.status}`, { status: response.status, body: errorData });
    throw new ApiError(response.status, message || `HTTP ${response.status}: ${response.statusText}`, errorData);
  }
  
  // 204 No Content - return undefined
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  // Check content-type header to decide JSON vs text
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      // fallthrough to text
    }
  }

  // Try to parse JSON, otherwise return raw text or undefined
  try {
    return await response.json();
  } catch {
    try {
      return (await response.text()) as unknown as T;
    } catch {
      return undefined as unknown as T;
    }
  }
}

/**
 * GET request
 */
export async function apiGet<T = unknown>(endpoint: string, options: RequestInit & { timeoutMs?: number; retries?: number } = {}): Promise<T> {
  return apiRequest<T>(endpoint, { method: 'GET', ...options });
}

/**
 * POST request
 */
export async function apiPost<T = unknown>(endpoint: string, data?: unknown, options: RequestInit & { timeoutMs?: number; retries?: number } = {}): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
    ...options,
  });
}

/**
 * DELETE request
 */
export async function apiDelete<T = unknown>(endpoint: string, data?: unknown, options: RequestInit & { timeoutMs?: number; retries?: number } = {}): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'DELETE',
    body: data ? JSON.stringify(data) : undefined,
    ...options,
  });
}

/**
 * GET request without authentication (for health check)
 */
export async function apiGetPublic<T = unknown>(endpoint: string, options: RequestInit & { timeoutMs?: number; retries?: number } = {}): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  const { timeoutMs = 30000, retries = 0, ...restOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      logger.info(`GET ${url} (attempt ${attempt + 1})`);

      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
        ...restOptions,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const body = await response.text();
        logger.info(`Response ${response.status}: ${body}`);
        throw new ApiError(response.status, `HTTP ${response.status}`, body);
      }

      const contentType = response.headers.get('content-type');
      let data: unknown;
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      logger.info(`Success: ${JSON.stringify(data)}`);
      return data as T;
    } catch (error) {
      lastError = error as Error;
      if (attempt < retries && !(error instanceof ApiError && (error as ApiError).status >= 400 && (error as ApiError).status < 500)) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        logger.warn(`Request failed, retrying in ${delay}ms`, { error });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  if (lastError) {
    throw lastError;
  }
  throw new Error('Request failed after retries');
}

/**
 * Get health status
 */
export async function getHealthStatus(): Promise<{
  status: 'ok' | 'error';
  uptime: number;
  database: 'connected' | 'disconnected';
  timestamp: string;
}> {
  return apiGetPublic('/health');
}
