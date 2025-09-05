/**
 * URL utilities for safe API URL construction
 * Prevents double slashes and ensures proper URL formatting
 */

/**
 * Safely joins a base URL with a path, ensuring exactly one slash between them
 * @param base - The base URL (e.g., "https://api.example.com" or "https://api.example.com/")
 * @param path - The path to append (e.g., "/endpoint" or "endpoint")
 * @returns The properly joined URL
 * 
 * Examples:
 * joinUrl("https://api.com", "/users") -> "https://api.com/users"
 * joinUrl("https://api.com/", "/users") -> "https://api.com/users"
 * joinUrl("https://api.com", "users") -> "https://api.com/users"
 * joinUrl("https://api.com/", "users") -> "https://api.com/users"
 */
export const joinUrl = (base: string, path: string): string => {
  // Remove trailing slashes from base
  const cleanBase = base.replace(/\/+$/, '');
  // Remove leading slashes from path
  const cleanPath = path.replace(/^\/+/, '');
  
  // Join with exactly one slash
  return `${cleanBase}/${cleanPath}`;
};

/**
 * Gets the API base URL from environment variables with fallback
 */
export const getApiBaseUrl = (): string => {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
};

/**
 * Creates a complete API URL by joining the base URL with the endpoint
 * @param endpoint - The API endpoint (e.g., "/dashboard/stats" or "dashboard/stats")
 * @returns The complete API URL
 */
export const createApiUrl = (endpoint: string): string => {
  return joinUrl(getApiBaseUrl(), endpoint);
};

/**
 * Logs the URL being used for debugging purposes
 * Only logs in development mode to avoid cluttering production logs
 */
export const logApiUrl = (endpoint: string, fullUrl: string): void => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[API URL] ${endpoint} -> ${fullUrl}`);
  }
};

/**
 * Creates an API URL with logging for debugging
 * @param endpoint - The API endpoint
 * @returns The complete API URL
 */
export const createApiUrlWithLogging = (endpoint: string): string => {
  const fullUrl = createApiUrl(endpoint);
  logApiUrl(endpoint, fullUrl);
  return fullUrl;
};
