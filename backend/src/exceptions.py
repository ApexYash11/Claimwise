"""
Enhanced error handling system for ClaimWise backend.
Provides structured error categories, user-friendly messages, and recovery suggestions.
"""
import logging
import traceback
from typing import Dict, List, Optional, Any, Union
from functools import wraps
from fastapi import HTTPException, Request, Response
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

class ClaimWiseError(Exception):
    """Base exception class for ClaimWise application errors"""
    
    def __init__(
        self,
        message: str,
        error_code: str = "CLAIMWISE_ERROR",
        details: Optional[Dict[str, Any]] = None,
        recovery_suggestions: Optional[List[str]] = None,
        severity: str = "error",
        original_exception: Optional[Exception] = None
    ):
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        self.recovery_suggestions = recovery_suggestions or []
        self.severity = severity
        self.original_exception = original_exception
        super().__init__(self.message)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert exception to dictionary for API responses"""
        return {
            "error": {
                "code": self.error_code,
                "message": self.message,
                "details": self.details,
                "recovery_suggestions": self.recovery_suggestions,
                "severity": self.severity,
                "type": self.__class__.__name__
            }
        }

class ValidationError(ClaimWiseError):
    """Raised when input validation fails"""
    
    def __init__(
        self,
        message: str,
        field: Optional[str] = None,
        value: Optional[Any] = None,
        **kwargs
    ):
        details = kwargs.get('details', {})
        if field:
            details['field'] = field
        if value is not None:
            details['provided_value'] = str(value)
        
        kwargs['details'] = details
        kwargs['error_code'] = kwargs.get('error_code', 'VALIDATION_ERROR')
        super().__init__(message, **kwargs)

class AuthenticationError(ClaimWiseError):
    """Raised when authentication fails"""
    
    def __init__(self, message: str = "Authentication required", **kwargs):
        kwargs['error_code'] = kwargs.get('error_code', 'AUTHENTICATION_ERROR')
        kwargs['recovery_suggestions'] = kwargs.get('recovery_suggestions', [
            "Please log in to continue",
            "Check if your session has expired",
            "Verify your credentials"
        ])
        super().__init__(message, **kwargs)

class AuthorizationError(ClaimWiseError):
    """Raised when user lacks required permissions"""
    
    def __init__(self, message: str = "Access denied", **kwargs):
        kwargs['error_code'] = kwargs.get('error_code', 'AUTHORIZATION_ERROR')
        kwargs['recovery_suggestions'] = kwargs.get('recovery_suggestions', [
            "Contact administrator for access",
            "Check if you have the required permissions"
        ])
        super().__init__(message, **kwargs)

class ProcessingError(ClaimWiseError):
    """Raised when document/data processing fails"""
    
    def __init__(self, message: str, operation: Optional[str] = None, **kwargs):
        details = kwargs.get('details', {})
        if operation:
            details['failed_operation'] = operation
        
        kwargs['details'] = details
        kwargs['error_code'] = kwargs.get('error_code', 'PROCESSING_ERROR')
        kwargs['recovery_suggestions'] = kwargs.get('recovery_suggestions', [
            "Try the operation again",
            "Check if the input data is valid",
            "Contact support if the problem persists"
        ])
        super().__init__(message, **kwargs)

class FileHandlingError(ClaimWiseError):
    """Raised when file operations fail"""
    
    def __init__(self, message: str, filename: Optional[str] = None, **kwargs):
        details = kwargs.get('details', {})
        if filename:
            details['filename'] = filename
        
        kwargs['details'] = details
        kwargs['error_code'] = kwargs.get('error_code', 'FILE_ERROR')
        kwargs['recovery_suggestions'] = kwargs.get('recovery_suggestions', [
            "Check if the file is not corrupted",
            "Ensure the file format is supported",
            "Try uploading a different file"
        ])
        super().__init__(message, **kwargs)

class DatabaseError(ClaimWiseError):
    """Raised when database operations fail"""
    
    def __init__(self, message: str, operation: Optional[str] = None, **kwargs):
        details = kwargs.get('details', {})
        if operation:
            details['database_operation'] = operation
        
        kwargs['details'] = details
        kwargs['error_code'] = kwargs.get('error_code', 'DATABASE_ERROR')
        kwargs['recovery_suggestions'] = kwargs.get('recovery_suggestions', [
            "Try the operation again in a moment",
            "Check your internet connection",
            "Contact support if the issue persists"
        ])
        super().__init__(message, **kwargs)

class ExternalAPIError(ClaimWiseError):
    """Raised when external API calls fail"""
    
    def __init__(self, message: str, service: Optional[str] = None, status_code: Optional[int] = None, **kwargs):
        details = kwargs.get('details', {})
        if service:
            details['service'] = service
        if status_code:
            details['status_code'] = status_code
        
        kwargs['details'] = details
        kwargs['error_code'] = kwargs.get('error_code', 'EXTERNAL_API_ERROR')
        kwargs['recovery_suggestions'] = kwargs.get('recovery_suggestions', [
            "Try again in a few moments",
            "Check if the service is available",
            "Contact support if the issue continues"
        ])
        super().__init__(message, **kwargs)

class RateLimitError(ClaimWiseError):
    """Raised when rate limits are exceeded"""
    
    def __init__(self, message: str = "Rate limit exceeded", retry_after: Optional[int] = None, **kwargs):
        details = kwargs.get('details', {})
        if retry_after:
            details['retry_after_seconds'] = retry_after
        
        kwargs['details'] = details
        kwargs['error_code'] = kwargs.get('error_code', 'RATE_LIMIT_ERROR')
        kwargs['recovery_suggestions'] = kwargs.get('recovery_suggestions', [
            f"Please wait {retry_after or 60} seconds before trying again",
            "Reduce the frequency of your requests"
        ])
        super().__init__(message, **kwargs)

def handle_exceptions(logger_instance: Optional[logging.Logger] = None):
    """Decorator for consistent exception handling"""
    
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            try:
                return await func(*args, **kwargs)
            except ClaimWiseError:
                # Re-raise our custom exceptions
                raise
            except HTTPException:
                # Re-raise FastAPI HTTP exceptions
                raise
            except Exception as e:
                if logger_instance:
                    logger_instance.error(f"Unexpected error in {func.__name__}: {e}")
                    logger_instance.debug(traceback.format_exc())
                
                # Convert to ProcessingError
                raise ProcessingError(
                    message=f"Unexpected error in {func.__name__}",
                    operation=func.__name__,
                    original_exception=e
                )
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except ClaimWiseError:
                # Re-raise our custom exceptions
                raise
            except HTTPException:
                # Re-raise FastAPI HTTP exceptions
                raise
            except Exception as e:
                if logger_instance:
                    logger_instance.error(f"Unexpected error in {func.__name__}: {e}")
                    logger_instance.debug(traceback.format_exc())
                
                # Convert to ProcessingError
                raise ProcessingError(
                    message=f"Unexpected error in {func.__name__}",
                    operation=func.__name__,
                    original_exception=e
                )
        
        # Return appropriate wrapper based on whether function is async
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator

def convert_to_http_exception(error: ClaimWiseError) -> HTTPException:
    """Convert ClaimWise exceptions to FastAPI HTTPExceptions"""
    
    # Map error types to HTTP status codes
    status_code_map = {
        ValidationError: 400,
        AuthenticationError: 401,
        AuthorizationError: 403,
        FileHandlingError: 400,
        RateLimitError: 429,
        DatabaseError: 500,
        ExternalAPIError: 502,
        ProcessingError: 500,
        ClaimWiseError: 500
    }
    
    status_code = status_code_map.get(type(error), 500)
    
    return HTTPException(
        status_code=status_code,
        detail=error.to_dict()
    )

async def claimwise_exception_handler(request: Request, exc: ClaimWiseError) -> JSONResponse:
    """Global exception handler for ClaimWise exceptions"""
    
    # Log the exception
    logger.error(
        f"ClaimWise exception in {request.method} {request.url}: {exc.message}",
        extra={
            "error_code": exc.error_code,
            "details": exc.details,
            "severity": exc.severity
        }
    )
    
    if exc.original_exception:
        logger.debug(f"Original exception: {exc.original_exception}")
    
    # Map error types to HTTP status codes
    status_code_map = {
        ValidationError: 400,
        AuthenticationError: 401,
        AuthorizationError: 403,
        FileHandlingError: 400,
        RateLimitError: 429,
        DatabaseError: 500,
        ExternalAPIError: 502,
        ProcessingError: 500,
        ClaimWiseError: 500
    }
    
    status_code = status_code_map.get(type(exc), 500)
    
    return JSONResponse(
        status_code=status_code,
        content=exc.to_dict()
    )

# Predefined error instances for common scenarios
INVALID_FILE_TYPE = ValidationError(
    message="Unsupported file type",
    recovery_suggestions=[
        "Upload a PDF, DOC, or TXT file",
        "Convert your file to a supported format"
    ]
)

FILE_TOO_LARGE = ValidationError(
    message="File size exceeds limit",
    recovery_suggestions=[
        "Reduce the file size",
        "Use a file smaller than 10MB"
    ]
)

POLICY_NOT_FOUND = ValidationError(
    message="Policy not found",
    recovery_suggestions=[
        "Check if the policy ID is correct",
        "Ensure you have access to this policy"
    ]
)

SERVICE_UNAVAILABLE = ExternalAPIError(
    message="Service temporarily unavailable",
    recovery_suggestions=[
        "Try again in a few minutes",
        "Contact support if the issue persists"
    ]
)
