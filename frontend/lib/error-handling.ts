/**
 * Enhanced error handling system for ClaimWise frontend
 * Provides consistent error types, user-friendly messages, and recovery strategies
 */

export enum ErrorCategory {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  VALIDATION = 'validation',
  SERVER_ERROR = 'server_error',
  CLIENT_ERROR = 'client_error',
  RATE_LIMIT = 'rate_limit',
  FILE_ERROR = 'file_error',
  UNKNOWN = 'unknown'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ErrorDetails {
  field?: string;
  code?: string;
  filename?: string;
  retryAfter?: number;
  context?: string;
  originalError?: string;
  lineno?: number;
  colno?: number;
  metadata?: Record<string, any>;
}

export interface RecoveryAction {
  label: string;
  action: () => void;
  primary?: boolean;
}

export class ClaimWiseError extends Error {
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly userMessage: string;
  public readonly technicalMessage: string;
  public readonly details: ErrorDetails;
  public readonly timestamp: Date;
  public readonly traceId?: string;
  public readonly recoveryActions: RecoveryAction[];

  constructor(
    message: string,
    category: ErrorCategory,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    options: {
      userMessage?: string;
      details?: ErrorDetails;
      traceId?: string;
      recoveryActions?: RecoveryAction[];
    } = {}
  ) {
    super(message);
    this.name = 'ClaimWiseError';
    this.category = category;
    this.severity = severity;
    this.technicalMessage = message;
    this.userMessage = options.userMessage || this.generateUserMessage();
    this.details = options.details || {};
    this.timestamp = new Date();
    this.traceId = options.traceId;
    this.recoveryActions = options.recoveryActions || this.generateRecoveryActions();
  }

  private generateUserMessage(): string {
    const messages: Record<ErrorCategory, string> = {
      [ErrorCategory.NETWORK]: 'Connection issue. Please check your internet connection and try again.',
      [ErrorCategory.AUTHENTICATION]: 'Please log in to continue.',
      [ErrorCategory.VALIDATION]: 'Please check your input and try again.',
      [ErrorCategory.SERVER_ERROR]: 'Server error occurred. Please try again in a moment.',
      [ErrorCategory.CLIENT_ERROR]: 'Something went wrong. Please refresh the page and try again.',
      [ErrorCategory.RATE_LIMIT]: 'Too many requests. Please wait a moment before trying again.',
      [ErrorCategory.FILE_ERROR]: 'There was an issue with your file. Please check the file and try again.',
      [ErrorCategory.UNKNOWN]: 'An unexpected error occurred. Please try again.'
    };

    return messages[this.category];
  }

  private generateRecoveryActions(): RecoveryAction[] {
    const commonActions: Record<ErrorCategory, RecoveryAction[]> = {
      [ErrorCategory.NETWORK]: [
        { label: 'Retry', action: () => { window.location.reload(); }, primary: true },
        { label: 'Check Connection', action: () => { window.open('https://www.speedtest.net/', '_blank'); } }
      ],
      [ErrorCategory.AUTHENTICATION]: [
        { label: 'Log In', action: () => { window.location.href = '/login'; }, primary: true }
      ],
      [ErrorCategory.VALIDATION]: [
        { label: 'Try Again', action: () => {}, primary: true }
      ],
      [ErrorCategory.SERVER_ERROR]: [
        { label: 'Retry', action: () => { window.location.reload(); }, primary: true },
        { label: 'Contact Support', action: () => { window.open('mailto:support@claimwise.com', '_blank'); } }
      ],
      [ErrorCategory.CLIENT_ERROR]: [
        { label: 'Refresh Page', action: () => { window.location.reload(); }, primary: true }
      ],
      [ErrorCategory.RATE_LIMIT]: [
        { label: 'Wait and Retry', action: () => { setTimeout(() => window.location.reload(), 30000); }, primary: true }
      ],
      [ErrorCategory.FILE_ERROR]: [
        { label: 'Try Different File', action: () => {}, primary: true },
        { label: 'Check File Format', action: () => {} }
      ],
      [ErrorCategory.UNKNOWN]: [
        { label: 'Retry', action: () => { window.location.reload(); }, primary: true },
        { label: 'Contact Support', action: () => { window.open('mailto:support@claimwise.com', '_blank'); } }
      ]
    };

    return commonActions[this.category] || [];
  }

  toJson() {
    return {
      name: this.name,
      message: this.technicalMessage,
      userMessage: this.userMessage,
      category: this.category,
      severity: this.severity,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
      traceId: this.traceId
    };
  }
}

// Specific error classes
export class NetworkError extends ClaimWiseError {
  constructor(message: string, options: {
    userMessage?: string;
    details?: ErrorDetails;
    traceId?: string;
  } = {}) {
    super(message, ErrorCategory.NETWORK, ErrorSeverity.MEDIUM, options);
  }
}

export class AuthenticationError extends ClaimWiseError {
  constructor(message: string, options: {
    userMessage?: string;
    details?: ErrorDetails;
    traceId?: string;
  } = {}) {
    super(message, ErrorCategory.AUTHENTICATION, ErrorSeverity.HIGH, options);
  }
}

export class ValidationError extends ClaimWiseError {
  constructor(message: string, field?: string, options: {
    userMessage?: string;
    details?: ErrorDetails;
    traceId?: string;
  } = {}) {
    const details = { ...options.details };
    if (field) details.field = field;
    
    super(message, ErrorCategory.VALIDATION, ErrorSeverity.LOW, {
      ...options,
      details
    });
  }
}

export class FileError extends ClaimWiseError {
  constructor(message: string, filename?: string, options: {
    userMessage?: string;
    details?: ErrorDetails;
    traceId?: string;
  } = {}) {
    const details = { ...options.details };
    if (filename) details.filename = filename;
    
    super(message, ErrorCategory.FILE_ERROR, ErrorSeverity.MEDIUM, {
      ...options,
      details
    });
  }
}

export class RateLimitError extends ClaimWiseError {
  constructor(message: string, retryAfter?: number, options: {
    userMessage?: string;
    details?: ErrorDetails;
    traceId?: string;
  } = {}) {
    const details = { ...options.details };
    if (retryAfter) details.retryAfter = retryAfter;
    
    super(message, ErrorCategory.RATE_LIMIT, ErrorSeverity.LOW, {
      ...options,
      details,
      recoveryActions: [
        {
          label: `Wait ${retryAfter || 30} seconds`,
          action: () => { setTimeout(() => window.location.reload(), (retryAfter || 30) * 1000); },
          primary: true
        }
      ]
    });
  }
}

// Error parsing utilities
export function parseApiError(response: Response, data?: any): ClaimWiseError {
  const traceId = response.headers.get('X-Trace-ID') || undefined;

  // Handle different status codes
  switch (response.status) {
    case 400:
      if (data?.detail?.category === 'validation') {
        return new ValidationError(
          data.detail.message || 'Validation failed',
          data.detail.details?.field,
          {
            userMessage: data.detail.message,
            details: data.detail.details,
            traceId
          }
        );
      }
      return new ClaimWiseError(
        data?.detail || 'Bad request',
        ErrorCategory.CLIENT_ERROR,
        ErrorSeverity.LOW,
        { traceId }
      );

    case 401:
      return new AuthenticationError(
        data?.detail?.message || 'Authentication required',
        {
          userMessage: data?.detail?.message,
          details: data?.detail?.details,
          traceId
        }
      );

    case 403:
      return new ClaimWiseError(
        data?.detail?.message || 'Access denied',
        ErrorCategory.AUTHENTICATION,
        ErrorSeverity.MEDIUM,
        {
          userMessage: data?.detail?.message || 'You don\'t have permission to perform this action',
          traceId
        }
      );

    case 429:
      const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
      return new RateLimitError(
        data?.detail?.message || 'Rate limit exceeded',
        retryAfter,
        {
          userMessage: data?.detail?.message || `Please wait ${retryAfter} seconds before trying again`,
          details: data?.detail?.details,
          traceId
        }
      );

    case 422:
      return new ValidationError(
        data?.detail?.message || 'Validation error',
        data?.detail?.details?.field,
        {
          userMessage: data?.detail?.message,
          details: data?.detail?.details,
          traceId
        }
      );

    case 500:
    case 502:
    case 503:
    case 504:
      return new ClaimWiseError(
        data?.detail?.message || 'Server error',
        ErrorCategory.SERVER_ERROR,
        ErrorSeverity.HIGH,
        {
          userMessage: data?.detail?.message || 'Server is experiencing issues. Please try again later.',
          details: data?.detail?.details,
          traceId
        }
      );

    default:
      return new ClaimWiseError(
        data?.detail || `HTTP ${response.status} error`,
        ErrorCategory.UNKNOWN,
        ErrorSeverity.MEDIUM,
        { traceId }
      );
  }
}

export function parseNetworkError(error: Error): NetworkError {
  return new NetworkError(
    error.message,
    {
      userMessage: 'Unable to connect to server. Please check your internet connection.',
      details: { originalError: error.name }
    }
  );
}

// Error logging
export class ErrorLogger {
  private static instance: ErrorLogger;
  private errorQueue: ClaimWiseError[] = [];
  private isOnline = navigator.onLine;

  private constructor() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushErrorQueue();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  public static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  public logError(error: ClaimWiseError): void {
    // Log to console for development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🔴 ${error.category.toUpperCase()} Error`);
      console.error('Technical Message:', error.technicalMessage);
      console.error('User Message:', error.userMessage);
      console.error('Details:', error.details);
      console.error('Trace ID:', error.traceId);
      console.error('Stack:', error.stack);
      console.groupEnd();
    }

    // Add to queue for remote logging
    this.errorQueue.push(error);

    // Try to send immediately if online
    if (this.isOnline) {
      this.flushErrorQueue();
    }
  }

  private async flushErrorQueue(): Promise<void> {
    if (this.errorQueue.length === 0 || !this.isOnline) {
      return;
    }

    const errorsToSend = [...this.errorQueue];
    this.errorQueue = [];

    try {
      // In a real implementation, you'd send to your logging service
      await fetch('/api/logs/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          errors: errorsToSend.map(error => error.toJson())
        })
      });
    } catch (sendError) {
      // If sending fails, put errors back in queue
      this.errorQueue.unshift(...errorsToSend);
      console.warn('Failed to send error logs:', sendError);
    }
  }
}

// Global error handler setup
export function setupGlobalErrorHandling(): void {
  const errorLogger = ErrorLogger.getInstance();

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof ClaimWiseError 
      ? event.reason 
      : new ClaimWiseError(
          event.reason?.message || 'Unhandled promise rejection',
          ErrorCategory.UNKNOWN,
          ErrorSeverity.HIGH
        );
    
    errorLogger.logError(error);
  });

  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    const error = new ClaimWiseError(
      event.error?.message || event.message || 'Uncaught error',
      ErrorCategory.UNKNOWN,
      ErrorSeverity.HIGH,
      {
        details: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      }
    );
    
    errorLogger.logError(error);
  });
}

// React Hook for error handling
export function useErrorHandler() {
  const errorLogger = ErrorLogger.getInstance();

  const handleError = (error: Error | ClaimWiseError, context?: string) => {
    const claimWiseError = error instanceof ClaimWiseError 
      ? error 
      : new ClaimWiseError(
          error.message,
          ErrorCategory.UNKNOWN,
          ErrorSeverity.MEDIUM,
          {
            details: { context, originalError: error.name }
          }
        );
    
    errorLogger.logError(claimWiseError);
    return claimWiseError;
  };

  return { handleError };
}
