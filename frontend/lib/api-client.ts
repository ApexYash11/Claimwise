/**
 * Enhanced API client for ClaimWise with comprehensive error handling,
 * retry logic, caching, and request monitoring
 */

import { 
  ClaimWiseError, 
  NetworkError, 
  AuthenticationError, 
  parseApiError, 
  parseNetworkError,
  ErrorLogger 
} from './error-handling';
import { getApiBaseUrl, joinUrl } from './url-utils';

export interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  cache?: boolean;
  cacheTime?: number;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
  cached?: boolean;
  responseTime?: number;
  traceId?: string;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class RequestCache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxEntries = 100;

  set<T>(key: string, data: T, cacheTime: number): void {
    // Clean old entries if at limit
    if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + cacheTime
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

export class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private cache = new RequestCache();
  private errorLogger = ErrorLogger.getInstance();
  private requestCount = 0;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || getApiBaseUrl();
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };

    // Cleanup cache every 5 minutes
    setInterval(() => this.cache.cleanup(), 5 * 60 * 1000);
  }

  setAuthToken(token: string): void {
    this.defaultHeaders.Authorization = `Bearer ${token}`;
  }

  clearAuthToken(): void {
    delete this.defaultHeaders.Authorization;
  }

  private generateCacheKey(url: string, config: RequestConfig): string {
    return `${config.method || 'GET'}:${url}:${JSON.stringify(config.body || {})}`;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async executeRequest<T>(
    url: string, 
    config: RequestConfig,
    attempt: number = 1
  ): Promise<ApiResponse<T>> {
    const fullUrl = url.startsWith('http') ? url : joinUrl(this.baseUrl, url);
    const startTime = performance.now();
    this.requestCount++;

    // Check cache first (only for GET requests)
    if ((config.method || 'GET') === 'GET' && config.cache !== false) {
      const cacheKey = this.generateCacheKey(fullUrl, config);
      const cachedData = this.cache.get(cacheKey) as ApiResponse<T> | null;
      
      if (cachedData) {
        return {
          ...cachedData,
          cached: true,
          responseTime: 0
        };
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, config.timeout || 30000);

    try {
      const headers: Record<string, string> = {
        ...this.defaultHeaders,
        ...config.headers,
        'X-Request-ID': `req_${this.requestCount}_${Date.now()}`,
        'X-Attempt': attempt.toString()
      };

      // Handle FormData body
      let body = config.body;
      if (config.body && !(config.body instanceof FormData)) {
        body = JSON.stringify(config.body);
      } else if (config.body instanceof FormData) {
        // Remove content-type for FormData, let browser set it
        delete headers['Content-Type'];
      }

      const response = await fetch(fullUrl, {
        method: config.method || 'GET',
        headers,
        body,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const responseTime = performance.now() - startTime;

      // Parse response
      let data: T;
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text() as unknown as T;
      }

      // Check if response is successful
      if (!response.ok) {
        const error = parseApiError(response, data);
        this.errorLogger.logError(error);
        throw error;
      }

      const apiResponse: ApiResponse<T> = {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        responseTime,
        traceId: response.headers.get('X-Trace-ID') || undefined
      };

      // Cache successful GET requests
      if ((config.method || 'GET') === 'GET' && config.cache !== false) {
        const cacheKey = this.generateCacheKey(fullUrl, config);
        const cacheTime = config.cacheTime || 5 * 60 * 1000; // 5 minutes default
        this.cache.set(cacheKey, apiResponse, cacheTime);
      }

      return apiResponse;

    } catch (error) {
      clearTimeout(timeoutId);

      // Handle abort error (timeout)
      if (error instanceof DOMException && error.name === 'AbortError') {
        const timeoutError = new NetworkError(
          `Request timeout after ${config.timeout || 30000}ms`,
          {
            userMessage: 'Request is taking too long. Please try again.',
            details: { 
              metadata: {
                url: fullUrl, 
                timeout: config.timeout || 30000,
                attempt 
              }
            }
          }
        );
        this.errorLogger.logError(timeoutError);
        throw timeoutError;
      }

      // Handle network errors
      if (error instanceof TypeError) {
        const networkError = parseNetworkError(error);
        this.errorLogger.logError(networkError);
        throw networkError;
      }

      // Re-throw ClaimWiseError instances
      if (error instanceof ClaimWiseError) {
        throw error;
      }

      // Handle other errors
      const unknownError = new NetworkError(
        error instanceof Error ? error.message : 'Unknown network error',
        {
          userMessage: 'Network error occurred. Please check your connection and try again.',
          details: { 
            metadata: {
              url: fullUrl, 
              attempt 
            }
          }
        }
      );
      this.errorLogger.logError(unknownError);
      throw unknownError;
    }
  }

  async request<T = any>(url: string, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    const maxRetries = config.retries ?? 3;
    const retryDelay = config.retryDelay ?? 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.executeRequest<T>(url, config, attempt);
      } catch (error) {
        // Don't retry on authentication errors or client errors
        if (error instanceof AuthenticationError || 
            (error instanceof ClaimWiseError && error.category === 'validation')) {
          throw error;
        }

        // Don't retry on final attempt
        if (attempt === maxRetries) {
          throw error;
        }

        // Exponential backoff for retries
        const delay = retryDelay * Math.pow(2, attempt - 1);
        console.warn(`Request failed, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
        await this.delay(delay);
      }
    }

    // This should never be reached, but TypeScript requires it
    throw new Error('Request failed after all retries');
  }

  // Convenience methods
  async get<T = any>(url: string, config: Omit<RequestConfig, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: 'GET' });
  }

  async post<T = any>(url: string, data?: any, config: Omit<RequestConfig, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: 'POST', body: data });
  }

  async put<T = any>(url: string, data?: any, config: Omit<RequestConfig, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: 'PUT', body: data });
  }

  async delete<T = any>(url: string, config: Omit<RequestConfig, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: 'DELETE' });
  }

  async patch<T = any>(url: string, data?: any, config: Omit<RequestConfig, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: 'PATCH', body: data });
  }

  // File upload helper
  async uploadFile<T = any>(
    url: string, 
    file: File, 
    additionalData: Record<string, string> = {},
    config: Omit<RequestConfig, 'method' | 'body'> = {}
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);
    
    // Add additional form data
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, value);
    });

    return this.request<T>(url, {
      ...config,
      method: 'POST',
      body: formData,
      // Don't cache file uploads
      cache: false
    });
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.get('/healthz', { 
        timeout: 5000, 
        retries: 1, 
        cache: false 
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  // Cache management
  clearCache(): void {
    this.cache.clear();
  }

  // Get stats
  getStats() {
    return {
      requestCount: this.requestCount,
      cacheSize: (this.cache as any).cache.size, // Access private property for stats
      baseUrl: this.baseUrl
    };
  }
}

// Create default instance
export const apiClient = new ApiClient();

