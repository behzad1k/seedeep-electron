/**
 * Type-safe FastAPI HTTP Client
 * Can be used in both Main and Renderer processes
 */

export interface ApiRequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, string | number | boolean>;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
  headers?: Record<string, string>;
}

export interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
  onRequest?: (config: ApiRequestConfig) => void | Promise<void>;
  onResponse?: (response: ApiResponse) => void | Promise<void>;
  onError?: (error: any) => void | Promise<void>;
}

export class FastAPIClient {
  private baseURL: string;
  private defaultTimeout: number;
  private defaultRetries: number;
  private defaultRetryDelay: number;
  private defaultHeaders: Record<string, string>;
  private onRequest?: (config: ApiRequestConfig) => void | Promise<void>;
  private onResponse?: (response: ApiResponse) => void | Promise<void>;
  private onError?: (error: any) => void | Promise<void>;

  constructor(config: ApiClientConfig) {
    this.baseURL = config.baseURL.replace(/\/$/, ''); // Remove trailing slash
    this.defaultTimeout = config.timeout || 30000;
    this.defaultRetries = config.retries || 3;
    this.defaultRetryDelay = config.retryDelay || 1000;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...config.headers
    };
    this.onRequest = config.onRequest;
    this.onResponse = config.onResponse;
    this.onError = config.onError;
  }

  /**
   * Build URL with query parameters
   */
  private buildURL(endpoint: string, params?: Record<string, string | number | boolean>): string {
    const url = `${this.baseURL}${endpoint}`;

    if (!params || Object.keys(params).length === 0) {
      return url;
    }

    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      searchParams.append(key, String(value));
    });

    return `${url}?${searchParams.toString()}`;
  }

  /**
   * Make HTTP request with retry logic
   */
  private async makeRequest<T>(
    endpoint: string,
    config: ApiRequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      params,
      timeout = this.defaultTimeout,
      retries = this.defaultRetries,
      retryDelay = this.defaultRetryDelay
    } = config;

    const url = this.buildURL(endpoint, params);
    const requestHeaders = { ...this.defaultHeaders, ...headers };

    // Call onRequest hook
    await this.onRequest?.({ method, headers: requestHeaders, body, params });

    let lastError: any;
    let attempt = 0;

    while (attempt <= retries) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const fetchOptions: RequestInit = {
          method,
          headers: requestHeaders,
          signal: controller.signal
        };

        if (body && method !== 'GET' && method !== 'DELETE') {
          fetchOptions.body = JSON.stringify(body);
        }

        console.log(`[FastAPIClient] ${method} ${url} (attempt ${attempt + 1}/${retries + 1})`);

        const response = await fetch(url, fetchOptions);
        clearTimeout(timeoutId);

        const status = response.status;
        const responseHeaders: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });

        // Handle different response types
        let data: T | undefined;
        const contentType = response.headers.get('content-type');

        if (contentType?.includes('application/json')) {
          const text = await response.text();
          data = text ? JSON.parse(text) : undefined;
        } else if (status === 204) {
          // No content
          data = undefined;
        } else {
          // Try to parse as JSON, fallback to text
          const text = await response.text();
          try {
            data = text ? JSON.parse(text) : undefined;
          } catch {
            data = text as any;
          }
        }

        if (!response.ok) {
          const errorMessage = this.extractErrorMessage(data, status);
          const errorResponse: ApiResponse<T> = {
            success: false,
            error: errorMessage,
            status,
            headers: responseHeaders
          };

          await this.onError?.(errorResponse);

          // Don't retry client errors (4xx)
          if (status >= 400 && status < 500) {
            return errorResponse;
          }

          throw new Error(errorMessage);
        }

        const successResponse: ApiResponse<T> = {
          success: true,
          data,
          status,
          headers: responseHeaders
        };

        await this.onResponse?.(successResponse);
        return successResponse;

      } catch (error) {
        lastError = error;

        // Don't retry if aborted (timeout)
        if (error instanceof Error && error.name === 'AbortError') {
          const timeoutResponse: ApiResponse<T> = {
            success: false,
            error: `Request timeout after ${timeout}ms`,
            status: 0
          };
          await this.onError?.(error);
          return timeoutResponse;
        }

        // Don't retry network errors on last attempt
        if (attempt === retries) {
          break;
        }

        // Wait before retry
        console.log(`[FastAPIClient] Retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
        attempt++;
      }
    }

    // All retries failed
    const errorMessage = lastError instanceof Error
      ? lastError.message
      : 'Request failed after multiple attempts';

    const failedResponse: ApiResponse<T> = {
      success: false,
      error: errorMessage,
      status: 0
    };

    await this.onError?.(lastError);
    return failedResponse;
  }

  /**
   * Extract error message from response
   */
  private extractErrorMessage(data: any, status: number): string {
    if (!data) {
      return `HTTP ${status}: Request failed`;
    }

    // FastAPI error format
    if (data.detail) {
      if (typeof data.detail === 'string') {
        return data.detail;
      }
      if (Array.isArray(data.detail)) {
        return data.detail.map((d: any) => d.msg || d).join(', ');
      }
    }

    // Generic error format
    if (data.error) {
      return typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
    }

    if (data.message) {
      return data.message;
    }

    return `HTTP ${status}: ${JSON.stringify(data)}`;
  }

  /**
   * GET request
   */
  async get<T = any>(endpoint: string, params?: Record<string, string | number | boolean>): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'GET', params });
  }

  /**
   * POST request
   */
  async post<T = any>(endpoint: string, body?: any, config?: Omit<ApiRequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'POST', body, ...config });
  }

  /**
   * PUT request
   */
  async put<T = any>(endpoint: string, body?: any, config?: Omit<ApiRequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'PUT', body, ...config });
  }

  /**
   * PATCH request
   */
  async patch<T = any>(endpoint: string, body?: any, config?: Omit<ApiRequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'PATCH', body, ...config });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string, config?: Omit<ApiRequestConfig, 'method'>): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'DELETE', ...config });
  }

  /**
   * Update base URL
   */
  setBaseURL(url: string) {
    this.baseURL = url.replace(/\/$/, '');
  }

  /**
   * Update default headers
   */
  setHeaders(headers: Record<string, string>) {
    this.defaultHeaders = { ...this.defaultHeaders, ...headers };
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return {
      baseURL: this.baseURL,
      timeout: this.defaultTimeout,
      retries: this.defaultRetries,
      retryDelay: this.defaultRetryDelay,
      headers: { ...this.defaultHeaders }
    };
  }
}