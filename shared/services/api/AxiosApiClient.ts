/**
 * Axios-based HTTP Client for FastAPI
 * FIXES the WebSocket connection interference issue
 * Axios manages connections better than fetch when WebSockets are active
 */

// First, install axios: npm install axios

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';

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
  onRequest?: (config: any) => void | Promise<void>;
  onResponse?: (response: ApiResponse) => void | Promise<void>;
  onError?: (error: any) => void | Promise<void>;
}

export class AxiosAPIClient {
  private client: AxiosInstance;
  private defaultRetries: number;
  private defaultRetryDelay: number;
  private onRequest?: (config: any) => void | Promise<void>;
  private onResponse?: (response: ApiResponse) => void | Promise<void>;
  private onError?: (error: any) => void | Promise<void>;

  constructor(config: ApiClientConfig) {
    this.defaultRetries = config.retries || 3;
    this.defaultRetryDelay = config.retryDelay || 1000;
    this.onRequest = config.onRequest;
    this.onResponse = config.onResponse;
    this.onError = config.onError;

    // CRITICAL FIX: Configure axios to NOT reuse connections with WebSockets
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers
      },
      // CRITICAL: Use separate connection pool from WebSockets
      httpAgent: typeof window === 'undefined' ? this.createHttpAgent() : undefined,
      httpsAgent: typeof window === 'undefined' ? this.createHttpsAgent() : undefined,
      // Don't follow redirects automatically
      maxRedirects: 0,
      // Validate status codes
      validateStatus: (status) => status < 600, // Accept all status codes, we'll handle errors
    });

    // Request interceptor
    this.client.interceptors.request.use(
      async (axiosConfig) => {
        console.log(`[AxiosClient] ${axiosConfig.method?.toUpperCase()} ${axiosConfig.url}`);
        await this.onRequest?.(axiosConfig);
        return axiosConfig;
      },
      (error) => {
        console.error('[AxiosClient] Request error:', error);
        this.onError?.(error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      async (response) => {
        console.log(`[AxiosClient] Response ${response.status} from ${response.config.url}`);
        console.log(response.data);
        const apiResponse: ApiResponse = {
          success: response.status >= 200 && response.status < 300,
          data: response.data,
          status: response.status,
          headers: response.headers as Record<string, string>
        };
        await this.onResponse?.(apiResponse);
        return response;
      },
      async (error: AxiosError) => {
        console.error('[AxiosClient] Response error:', error.message);
        await this.onError?.(error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Create HTTP agent with separate connection pool (Node.js only)
   */
  private createHttpAgent() {
    try {
      // This will only work in Node.js (Electron main process)
      const http = require('http');
      return new http.Agent({
        keepAlive: false, // CRITICAL: Don't keep connections alive
        maxSockets: 10,   // Limit concurrent connections
        maxFreeSockets: 0, // Don't keep free sockets
      });
    } catch {
      return undefined;
    }
  }

  /**
   * Create HTTPS agent with separate connection pool (Node.js only)
   */
  private createHttpsAgent() {
    try {
      const https = require('https');
      return new https.Agent({
        keepAlive: false,
        maxSockets: 10,
        maxFreeSockets: 0,
      });
    } catch {
      return undefined;
    }
  }

  /**
   * Make request with retry logic
   */
  private async makeRequestWithRetry<T>(
    requestFn: () => Promise<T>,
    retries: number = this.defaultRetries
  ): Promise<ApiResponse<T>> {
    let lastError: any;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const data = await requestFn();
        return {
          success: true,
          data
        };
      } catch (error) {
        lastError = error;

        const axiosError = error as AxiosError;

        // Don't retry client errors (4xx)
        if (axiosError.response && axiosError.response.status >= 400 && axiosError.response.status < 500) {
          return {
            success: false,
            error: this.extractErrorMessage(axiosError),
            status: axiosError.response.status,
            headers: axiosError.response.headers as Record<string, string>
          };
        }

        // Retry on network errors or 5xx errors
        if (attempt < retries) {
          const delay = this.defaultRetryDelay * (attempt + 1);
          console.log(`[AxiosClient] Retry ${attempt + 1}/${retries} in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
    }

    // All retries failed
    return {
      success: false,
      error: this.extractErrorMessage(lastError),
      status: lastError?.response?.status || 0
    };
  }

  /**
   * Extract error message from axios error
   */
  private extractErrorMessage(error: any): string {
    if (error.response?.data) {
      const data = error.response.data;

      if (data.detail) {
        if (typeof data.detail === 'string') return data.detail;
        if (Array.isArray(data.detail)) return data.detail.map((d: any) => d.msg || d).join(', ');
      }

      if (data.error) return typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
      if (data.message) return data.message;

      return JSON.stringify(data);
    }

    if (error.message) return error.message;
    return 'Request failed';
  }

  /**
   * GET request
   */
  async get<T = any>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    return this.makeRequestWithRetry(async () => {
      console.log(endpoint);
      const response = await this.client.get<T>(endpoint, { params });
      return response.data;
    });
  }

  /**
   * POST request
   */
  async post<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.makeRequestWithRetry(async () => {
      const response = await this.client.post<T>(endpoint, data);
      return response.data;
    });
  }

  /**
   * PUT request
   */
  async put<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.makeRequestWithRetry(async () => {
      const response = await this.client.put<T>(endpoint, data);
      return response.data;
    });
  }

  /**
   * PATCH request - CRITICAL for your update functionality
   */
  async patch<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    console.log(`[AxiosClient] ========================================`);
    console.log(`[AxiosClient] PATCH ${endpoint}`);
    console.log(`[AxiosClient] Data:`, JSON.stringify(data, null, 2));
    console.log(`[AxiosClient] ========================================`);

    return this.makeRequestWithRetry(async () => {
      const response = await this.client.patch<T>(endpoint, data);
      return response.data;
    });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.makeRequestWithRetry(async () => {
      const response = await this.client.delete<T>(endpoint);
      return response.data;
    });
  }

  /**
   * Update base URL
   */
  setBaseURL(url: string) {
    this.client.defaults.baseURL = url;
  }

  /**
   * Update headers
   */
  setHeaders(headers: Record<string, string>) {
    this.client.defaults.headers.common = {
      ...this.client.defaults.headers.common,
      ...headers
    };
  }

  /**
   * Get configuration
   */
  getConfig() {
    return {
      baseURL: this.client.defaults.baseURL,
      timeout: this.client.defaults.timeout,
      headers: this.client.defaults.headers.common
    };
  }
}