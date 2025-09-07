'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClaimWiseError, ErrorCategory, ErrorSeverity, ErrorLogger } from '@/lib/error-handling';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  showDetails?: boolean;
  onError?: (error: ClaimWiseError) => void;
}

interface State {
  hasError: boolean;
  error: ClaimWiseError | null;
  eventId: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  private errorLogger = ErrorLogger.getInstance();

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, eventId: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Convert regular error to ClaimWiseError
    const claimWiseError = error instanceof ClaimWiseError 
      ? error 
      : new ClaimWiseError(
          error.message || 'Component error',
          ErrorCategory.CLIENT_ERROR,
          ErrorSeverity.HIGH,
          {
            details: { 
              originalError: error.name,
              stack: error.stack 
            }
          }
        );

    return {
      hasError: true,
      error: claimWiseError,
      eventId: claimWiseError.traceId || null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error
    if (this.state.error) {
      this.errorLogger.logError(this.state.error);
    }

    // Call optional error callback
    if (this.props.onError && this.state.error) {
      this.props.onError(this.state.error);
    }

    // Log additional React-specific info
    console.group('🔴 React Error Boundary');
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    console.error('Component Stack:', errorInfo.componentStack);
    console.groupEnd();
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, eventId: null });
  };

  handleReportError = () => {
    if (this.state.error) {
      const subject = encodeURIComponent(`Error Report - ${this.state.error.category}`);
      const body = encodeURIComponent(`
Error Details:
- Message: ${this.state.error.userMessage}
- Technical Message: ${this.state.error.technicalMessage}
- Category: ${this.state.error.category}
- Severity: ${this.state.error.severity}
- Trace ID: ${this.state.error.traceId || 'N/A'}
- Timestamp: ${this.state.error.timestamp.toISOString()}

Please describe what you were doing when this error occurred:
[Your description here]
      `);
      
      window.open(`mailto:support@claimwise.com?subject=${subject}&body=${body}`, '_blank');
    }
  };

  getSeverityColor(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.LOW:
        return 'text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/50 border-yellow-200 dark:border-yellow-800';
      case ErrorSeverity.MEDIUM:
        return 'text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/50 border-orange-200 dark:border-orange-800';
      case ErrorSeverity.HIGH:
        return 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800';
      case ErrorSeverity.CRITICAL:
        return 'text-red-800 dark:text-red-300 bg-red-100 dark:bg-red-950/70 border-red-300 dark:border-red-700';
      default:
        return 'text-muted-foreground bg-muted border-border';
    }
  }

  getSeverityIcon(severity: ErrorSeverity): ReactNode {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />;
      default:
        return <Bug className="w-6 h-6 text-orange-600 dark:text-orange-400" />;
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error } = this.state;
      const severityClass = this.getSeverityColor(error.severity);

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center space-x-3">
                {this.getSeverityIcon(error.severity)}
                <span>Something went wrong</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* User-friendly error message */}
              <Alert className={severityClass}>
                <AlertDescription className="text-base">
                  {error.userMessage}
                </AlertDescription>
              </Alert>

              {/* Error details (if enabled) */}
              {this.props.showDetails && (
                <div className="bg-muted rounded-lg p-4 space-y-3">
                  <div className="text-sm text-muted-foreground">
                    <strong>Error Code:</strong> {error.traceId || 'Unknown'}
                  </div>
                  {error.details.field && (
                    <div className="text-sm text-muted-foreground">
                      <strong>Field:</strong> {error.details.field}
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground">
                    <strong>Category:</strong> {error.category}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <strong>Time:</strong> {error.timestamp.toLocaleString()}
                  </div>
                  <details className="text-sm text-muted-foreground">
                    <summary className="cursor-pointer hover:text-foreground">
                      Technical Details
                    </summary>
                    <pre className="mt-2 bg-card border border-border p-3 rounded text-xs overflow-auto">
                      {JSON.stringify(
                        {
                          message: error.technicalMessage,
                          details: error.details,
                          stack: error.stack
                        },
                        null,
                        2
                      )}
                    </pre>
                  </details>
                </div>
              )}

              {/* Recovery actions */}
              {error.recoveryActions.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-medium text-foreground">What can you do?</h3>
                  <div className="flex flex-wrap gap-3">
                    {error.recoveryActions.map((action, index) => (
                      <Button
                        key={index}
                        onClick={action.action}
                        variant={action.primary ? 'default' : 'outline'}
                        className="flex items-center space-x-2"
                      >
                        <span>{action.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Default action buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                <Button
                  onClick={this.handleRetry}
                  className="flex items-center space-x-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Try Again</span>
                </Button>
                
                <Button
                  onClick={() => window.location.href = '/'}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <Home className="w-4 h-4" />
                  <span>Go Home</span>
                </Button>

                <Button
                  onClick={this.handleReportError}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <Mail className="w-4 h-4" />
                  <span>Report Error</span>
                </Button>
              </div>

              {/* Error ID for support */}
              {this.state.eventId && (
                <div className="text-xs text-muted-foreground text-center pt-4 border-t border-border">
                  Error ID: {this.state.eventId}
                  <br />
                  Please include this ID when contacting support.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for using error boundary in function components
export function useErrorBoundary() {
  return {
    captureError: (error: Error | ClaimWiseError) => {
      // This will trigger the error boundary
      throw error instanceof ClaimWiseError ? error : new ClaimWiseError(
        error.message,
        ErrorCategory.CLIENT_ERROR,
        ErrorSeverity.MEDIUM
      );
    }
  };
}
