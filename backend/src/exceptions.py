"""
Enhanced exception handling for ClaimWise backend.
Provides structured error types, logging, and recovery strategies.
"""
from enum import Enum
from typing import Optional, Dict, Any, List
from fastapi import HTTPException
import logging
import traceback
from datetime import datetime
import uuid

class ErrorCategory(str, Enum):
    """Error categories for better classification and handling"""
    AUTHENTICATION = "authentication"
    AUTHORIZATION = "authorization"
    VALIDATION = "validation"
    PROCESSING = "processing"
    EXTERNAL_API = "external_api"
    DATABASE = "database"
    FILE_HANDLING = "file_handling"
    RATE_LIMIT = "rate_limit"
    SYSTEM = "system"

class ErrorSeverity(str, Enum):
    """Error severity levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ClaimWiseError(Exception):
    """Base exception class for ClaimWise application"""
    
    def __init__(
        self,
        message: str,
        category: ErrorCategory,
        severity: ErrorSeverity = ErrorSeverity.MEDIUM,
        error_code: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        recovery_suggestions: Optional[List[str]] = None,
        user_message: Optional[str] = None,
        original_exception: Optional[Exception] = None
    ):
        self.message = message
        self.category = category
        self.severity = severity
        self.error_code = error_code or f"{category.value}_{int(datetime.now().timestamp())}"
        self.details = details or {}
        self.recovery_suggestions = recovery_suggestions or []
        self.user_message = user_message or self._generate_user_message()
        self.original_exception = original_exception
        self.timestamp = datetime.now()
        self.trace_id = str(uuid.uuid4())[:8]
        
        super().__init__(self.message)
    
    def _generate_user_message(self) -> str:
        """Generate user-friendly error message based on category"""
        user_messages = {
            ErrorCategory.AUTHENTICATION: "Please log in to continue.",
            ErrorCategory.AUTHORIZATION: "You don't have permission to perform this action.",
            ErrorCategory.VALIDATION: "Please check your input and try again.",
            ErrorCategory.PROCESSING: "We're having trouble processing your request. Please try again.",
            ErrorCategory.EXTERNAL_API: "External service is temporarily unavailable. Please try again later.",
            ErrorCategory.DATABASE: "Database connection issue. Please try again in a moment.",
            ErrorCategory.FILE_HANDLING: "There was an issue with your file. Please check the file and try again.",
            ErrorCategory.RATE_LIMIT: "Too many requests. Please wait a moment before trying again.",
            ErrorCategory.SYSTEM: "System error occurred. Our team has been notified."
        }
        return user_messages.get(self.category, "An error occurred. Please try again.")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert error to dictionary for logging/API response"""
        return {
            "error_code": self.error_code,
            "message": self.message,
            "user_message": self.user_message,
            "category": self.category.value,
            "severity": self.severity.value,
            "timestamp": self.timestamp.isoformat(),
            "trace_id": self.trace_id,
            "details": self.details,
            "recovery_suggestions": self.recovery_suggestions
        }
    
    def log_error(self, logger: logging.Logger):
        """Log error with appropriate level based on severity"""
        error_dict = self.to_dict()
        
        if self.original_exception:
            error_dict["original_error"] = str(self.original_exception)
            error_dict["traceback"] = traceback.format_exception(
                type(self.original_exception),
                self.original_exception,
                self.original_exception.__traceback__
            )
        
        log_level = {
            ErrorSeverity.LOW: logging.INFO,
            ErrorSeverity.MEDIUM: logging.WARNING,
            ErrorSeverity.HIGH: logging.ERROR,
            ErrorSeverity.CRITICAL: logging.CRITICAL
        }[self.severity]
        
        logger.log(log_level, f"ClaimWise Error [{self.trace_id}]: {self.message}", extra=error_dict)

# Specific exception classes
class AuthenticationError(ClaimWiseError):
    def __init__(self, message: str = "Authentication failed", **kwargs):
        super().__init__(
            message=message,
            category=ErrorCategory.AUTHENTICATION,
            severity=ErrorSeverity.MEDIUM,
            recovery_suggestions=["Please log in again", "Check your credentials"],
            **kwargs
        )

class AuthorizationError(ClaimWiseError):
    def __init__(self, message: str = "Access denied", **kwargs):
        super().__init__(
            message=message,
            category=ErrorCategory.AUTHORIZATION,
            severity=ErrorSeverity.MEDIUM,
            recovery_suggestions=["Contact administrator for access", "Check your permissions"],
            **kwargs
        )

class ValidationError(ClaimWiseError):
    def __init__(self, message: str, field: Optional[str] = None, **kwargs):
        details = kwargs.get('details', {})
        if field:
            details['field'] = field
        super().__init__(
            message=message,
            category=ErrorCategory.VALIDATION,
            severity=ErrorSeverity.LOW,
            recovery_suggestions=["Check your input format", "Ensure all required fields are filled"],
            details=details,
            **kwargs
        )

class ProcessingError(ClaimWiseError):
    def __init__(self, message: str, operation: Optional[str] = None, **kwargs):
        details = kwargs.get('details', {})
        if operation:
            details['operation'] = operation
        super().__init__(
            message=message,
            category=ErrorCategory.PROCESSING,
            severity=ErrorSeverity.MEDIUM,
            recovery_suggestions=["Try again in a moment", "Check your file format"],
            details=details,
            **kwargs
        )

class ExternalAPIError(ClaimWiseError):
    def __init__(self, message: str, service: Optional[str] = None, status_code: Optional[int] = None, **kwargs):
        details = kwargs.get('details', {})
        if service:
            details['service'] = service
        if status_code:
            details['status_code'] = status_code
        
        severity = ErrorSeverity.HIGH if status_code and status_code >= 500 else ErrorSeverity.MEDIUM
        
        super().__init__(
            message=message,
            category=ErrorCategory.EXTERNAL_API,
            severity=severity,
            recovery_suggestions=["Try again later", "Contact support if problem persists"],
            details=details,
            **kwargs
        )

class DatabaseError(ClaimWiseError):
    def __init__(self, message: str, operation: Optional[str] = None, **kwargs):
        details = kwargs.get('details', {})
        if operation:
            details['operation'] = operation
        super().__init__(
            message=message,
            category=ErrorCategory.DATABASE,
            severity=ErrorSeverity.HIGH,
            recovery_suggestions=["Try again in a moment", "Contact support if problem persists"],
            details=details,
            **kwargs
        )

class FileHandlingError(ClaimWiseError):
    def __init__(self, message: str, filename: Optional[str] = None, **kwargs):
        details = kwargs.get('details', {})
        if filename:
            details['filename'] = filename
        super().__init__(
            message=message,
            category=ErrorCategory.FILE_HANDLING,
            severity=ErrorSeverity.MEDIUM,
            recovery_suggestions=["Check file format", "Ensure file is not corrupted", "Try a smaller file"],
            details=details,
            **kwargs
        )

class RateLimitError(ClaimWiseError):
    def __init__(self, message: str = "Rate limit exceeded", retry_after: Optional[int] = None, **kwargs):
        details = kwargs.get('details', {})
        if retry_after:
            details['retry_after'] = retry_after
        
        recovery_suggestions = [f"Wait {retry_after} seconds before trying again" if retry_after else "Wait before trying again"]
        
        super().__init__(
            message=message,
            category=ErrorCategory.RATE_LIMIT,
            severity=ErrorSeverity.LOW,
            recovery_suggestions=recovery_suggestions,
            details=details,
            **kwargs
        )

def convert_to_http_exception(error: ClaimWiseError) -> HTTPException:
    """Convert ClaimWiseError to FastAPI HTTPException"""
    status_code_map = {
        ErrorCategory.AUTHENTICATION: 401,
        ErrorCategory.AUTHORIZATION: 403,
        ErrorCategory.VALIDATION: 400,
        ErrorCategory.PROCESSING: 422,
        ErrorCategory.EXTERNAL_API: 502,
        ErrorCategory.DATABASE: 500,
        ErrorCategory.FILE_HANDLING: 400,
        ErrorCategory.RATE_LIMIT: 429,
        ErrorCategory.SYSTEM: 500
    }
    
    status_code = status_code_map.get(error.category, 500)
    
    # Add retry-after header for rate limit errors
    headers = {}
    if error.category == ErrorCategory.RATE_LIMIT:
        retry_after = error.details.get('retry_after', 60)
        headers['Retry-After'] = str(retry_after)
    
    return HTTPException(
        status_code=status_code,
        detail={
            "error_code": error.error_code,
            "message": error.user_message,
            "category": error.category.value,
            "trace_id": error.trace_id,
            "recovery_suggestions": error.recovery_suggestions,
            "details": error.details
        },
        headers=headers if headers else None
    )

# Error handling decorator
def handle_exceptions(logger: logging.Logger):
    """Decorator to handle exceptions in route handlers"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except ClaimWiseError as e:
                e.log_error(logger)
                raise convert_to_http_exception(e)
            except HTTPException:
                # Re-raise FastAPI exceptions as-is
                raise
            except Exception as e:
                # Convert unexpected exceptions to ClaimWiseError
                system_error = ClaimWiseError(
                    message=f"Unexpected error in {func.__name__}: {str(e)}",
                    category=ErrorCategory.SYSTEM,
                    severity=ErrorSeverity.HIGH,
                    original_exception=e
                )
                system_error.log_error(logger)
                raise convert_to_http_exception(system_error)
        return wrapper
    return decorator
