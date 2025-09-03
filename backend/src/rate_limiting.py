"""
Advanced rate limiting system for ClaimWise backend.
Provides flexible rate limiting with different strategies and smart throttling.
"""
import time
import asyncio
from typing import Dict, Optional, List, Tuple, Any
from dataclasses import dataclass
from datetime import datetime, timedelta
from collections import defaultdict, deque
import threading
import logging
from enum import Enum
import hashlib

logger = logging.getLogger(__name__)

class RateLimitStrategy(str, Enum):
    """Rate limiting strategies"""
    FIXED_WINDOW = "fixed_window"      # Fixed time windows
    SLIDING_WINDOW = "sliding_window"  # Sliding time windows
    TOKEN_BUCKET = "token_bucket"      # Token bucket algorithm
    LEAKY_BUCKET = "leaky_bucket"      # Leaky bucket algorithm

class RateLimitScope(str, Enum):
    """Rate limiting scopes"""
    GLOBAL = "global"          # Global rate limit
    USER = "user"              # Per user
    IP = "ip"                  # Per IP address
    ENDPOINT = "endpoint"      # Per endpoint
    USER_ENDPOINT = "user_endpoint"  # Per user per endpoint

@dataclass
class RateLimitConfig:
    """Rate limit configuration"""
    max_requests: int           # Maximum requests
    window_seconds: int         # Time window in seconds
    strategy: RateLimitStrategy = RateLimitStrategy.SLIDING_WINDOW
    scope: RateLimitScope = RateLimitScope.USER
    burst_allowance: int = 0    # Additional burst requests allowed
    
class RateLimitResult:
    """Result of rate limit check"""
    def __init__(
        self,
        allowed: bool,
        remaining: int,
        reset_time: datetime,
        retry_after: Optional[int] = None,
        current_usage: int = 0
    ):
        self.allowed = allowed
        self.remaining = remaining
        self.reset_time = reset_time
        self.retry_after = retry_after
        self.current_usage = current_usage
    
    def to_headers(self) -> Dict[str, str]:
        """Convert to HTTP headers"""
        headers = {
            "X-RateLimit-Remaining": str(self.remaining),
            "X-RateLimit-Reset": str(int(self.reset_time.timestamp()))
        }
        
        if self.retry_after:
            headers["Retry-After"] = str(self.retry_after)
        
        return headers

class FixedWindowRateLimiter:
    """Fixed window rate limiter"""
    
    def __init__(self):
        self._windows: Dict[str, Dict[int, int]] = defaultdict(lambda: defaultdict(int))
        self._lock = threading.Lock()
    
    def is_allowed(self, key: str, config: RateLimitConfig) -> RateLimitResult:
        current_time = time.time()
        window_start = int(current_time // config.window_seconds) * config.window_seconds
        
        with self._lock:
            current_count = self._windows[key][window_start]
            
            if current_count >= config.max_requests:
                reset_time = datetime.fromtimestamp(window_start + config.window_seconds)
                retry_after = int(window_start + config.window_seconds - current_time)
                return RateLimitResult(
                    allowed=False,
                    remaining=0,
                    reset_time=reset_time,
                    retry_after=retry_after,
                    current_usage=current_count
                )
            
            # Increment counter
            self._windows[key][window_start] += 1
            remaining = config.max_requests - (current_count + 1)
            reset_time = datetime.fromtimestamp(window_start + config.window_seconds)
            
            return RateLimitResult(
                allowed=True,
                remaining=remaining,
                reset_time=reset_time,
                current_usage=current_count + 1
            )

class SlidingWindowRateLimiter:
    """Sliding window rate limiter using a log of timestamps"""
    
    def __init__(self):
        self._requests: Dict[str, deque] = defaultdict(lambda: deque())
        self._lock = threading.Lock()
    
    def is_allowed(self, key: str, config: RateLimitConfig) -> RateLimitResult:
        current_time = time.time()
        cutoff_time = current_time - config.window_seconds
        
        with self._lock:
            request_times = self._requests[key]
            
            # Remove old requests outside the window
            while request_times and request_times[0] <= cutoff_time:
                request_times.popleft()
            
            # Check if we're at the limit
            if len(request_times) >= config.max_requests:
                # Calculate when the oldest request will expire
                oldest_request = request_times[0]
                retry_after = int(oldest_request + config.window_seconds - current_time + 1)
                reset_time = datetime.fromtimestamp(oldest_request + config.window_seconds)
                
                return RateLimitResult(
                    allowed=False,
                    remaining=0,
                    reset_time=reset_time,
                    retry_after=retry_after,
                    current_usage=len(request_times)
                )
            
            # Add current request
            request_times.append(current_time)
            remaining = config.max_requests - len(request_times)
            
            # Next reset is when the oldest request expires
            if request_times:
                reset_time = datetime.fromtimestamp(request_times[0] + config.window_seconds)
            else:
                reset_time = datetime.fromtimestamp(current_time + config.window_seconds)
            
            return RateLimitResult(
                allowed=True,
                remaining=remaining,
                reset_time=reset_time,
                current_usage=len(request_times)
            )

class TokenBucketRateLimiter:
    """Token bucket rate limiter"""
    
    def __init__(self):
        self._buckets: Dict[str, Dict[str, float]] = defaultdict(lambda: {
            'tokens': 0.0,
            'last_update': time.time()
        })
        self._lock = threading.Lock()
    
    def is_allowed(self, key: str, config: RateLimitConfig) -> RateLimitResult:
        current_time = time.time()
        
        with self._lock:
            bucket = self._buckets[key]
            
            # Calculate tokens to add based on time elapsed
            time_elapsed = current_time - bucket['last_update']
            tokens_to_add = time_elapsed * (config.max_requests / config.window_seconds)
            
            # Add tokens, but don't exceed capacity
            bucket['tokens'] = min(
                config.max_requests + config.burst_allowance,
                bucket['tokens'] + tokens_to_add
            )
            bucket['last_update'] = current_time
            
            if bucket['tokens'] >= 1.0:
                # Consume one token
                bucket['tokens'] -= 1.0
                remaining = int(bucket['tokens'])
                
                # Calculate reset time (when bucket will be full)
                time_to_full = (config.max_requests + config.burst_allowance - bucket['tokens']) / (config.max_requests / config.window_seconds)
                reset_time = datetime.fromtimestamp(current_time + time_to_full)
                
                return RateLimitResult(
                    allowed=True,
                    remaining=remaining,
                    reset_time=reset_time,
                    current_usage=int(config.max_requests + config.burst_allowance - bucket['tokens'])
                )
            else:
                # Calculate retry after
                retry_after = int((1.0 - bucket['tokens']) / (config.max_requests / config.window_seconds))
                reset_time = datetime.fromtimestamp(current_time + retry_after)
                
                return RateLimitResult(
                    allowed=False,
                    remaining=0,
                    reset_time=reset_time,
                    retry_after=retry_after,
                    current_usage=int(config.max_requests + config.burst_allowance - bucket['tokens'])
                )

class RateLimitManager:
    """Main rate limit manager"""
    
    def __init__(self):
        self._limiters = {
            RateLimitStrategy.FIXED_WINDOW: FixedWindowRateLimiter(),
            RateLimitStrategy.SLIDING_WINDOW: SlidingWindowRateLimiter(),
            RateLimitStrategy.TOKEN_BUCKET: TokenBucketRateLimiter()
        }
        self._configs: Dict[str, RateLimitConfig] = {}
        self._stats: Dict[str, Dict[str, Any]] = defaultdict(lambda: {
            'requests': 0,
            'blocked': 0,
            'last_reset': datetime.now()
        })
        self._lock = threading.Lock()
    
    def add_limit(self, name: str, config: RateLimitConfig):
        """Add a rate limit configuration"""
        self._configs[name] = config
    
    def check_rate_limit(
        self,
        limit_name: str,
        identifier: str,
        endpoint: Optional[str] = None
    ) -> RateLimitResult:
        """Check if request is allowed under rate limit"""
        
        if limit_name not in self._configs:
            # No limit configured, allow request
            return RateLimitResult(
                allowed=True,
                remaining=999999,
                reset_time=datetime.now() + timedelta(hours=1)
            )
        
        config = self._configs[limit_name]
        
        # Generate key based on scope
        key = self._generate_key(config.scope, identifier, endpoint, limit_name)
        
        # Get appropriate limiter
        limiter = self._limiters[config.strategy]
        
        # Check rate limit
        result = limiter.is_allowed(key, config)
        
        # Update statistics
        with self._lock:
            stats = self._stats[limit_name]
            stats['requests'] += 1
            if not result.allowed:
                stats['blocked'] += 1
        
        return result
    
    def _generate_key(
        self,
        scope: RateLimitScope,
        identifier: str,
        endpoint: Optional[str],
        limit_name: str
    ) -> str:
        """Generate key for rate limiting based on scope"""
        
        if scope == RateLimitScope.GLOBAL:
            return f"global:{limit_name}"
        elif scope == RateLimitScope.USER:
            return f"user:{identifier}:{limit_name}"
        elif scope == RateLimitScope.IP:
            return f"ip:{identifier}:{limit_name}"
        elif scope == RateLimitScope.ENDPOINT:
            return f"endpoint:{endpoint or 'unknown'}:{limit_name}"
        elif scope == RateLimitScope.USER_ENDPOINT:
            return f"user_endpoint:{identifier}:{endpoint or 'unknown'}:{limit_name}"
        else:
            return f"unknown:{identifier}:{limit_name}"
    
    def get_stats(self) -> Dict[str, Any]:
        """Get rate limiting statistics"""
        with self._lock:
            stats_copy = {}
            for name, stats in self._stats.items():
                total_requests = int(stats['requests']) if isinstance(stats['requests'], int) else 0
                blocked_requests = int(stats['blocked']) if isinstance(stats['blocked'], int) else 0
                block_rate = (blocked_requests / total_requests * 100) if total_requests > 0 else 0
                
                stats_copy[name] = {
                    'total_requests': total_requests,
                    'blocked_requests': blocked_requests,
                    'block_rate_percent': round(block_rate, 2),
                    'config': self._configs[name].__dict__ if name in self._configs else None
                }
            
            return stats_copy
    
    def reset_stats(self):
        """Reset rate limiting statistics"""
        with self._lock:
            self._stats.clear()

# Global rate limit manager
rate_limiter = RateLimitManager()

# Predefined rate limit configurations
def setup_default_limits():
    """Setup default rate limits"""
    
    # Global API rate limit
    rate_limiter.add_limit("global_api", RateLimitConfig(
        max_requests=1000,
        window_seconds=60,
        strategy=RateLimitStrategy.SLIDING_WINDOW,
        scope=RateLimitScope.GLOBAL
    ))
    
    # Per-user rate limits
    rate_limiter.add_limit("user_general", RateLimitConfig(
        max_requests=100,
        window_seconds=60,
        strategy=RateLimitStrategy.SLIDING_WINDOW,
        scope=RateLimitScope.USER,
        burst_allowance=20
    ))
    
    # Upload rate limit (more restrictive)
    rate_limiter.add_limit("upload", RateLimitConfig(
        max_requests=10,
        window_seconds=60,
        strategy=RateLimitStrategy.TOKEN_BUCKET,
        scope=RateLimitScope.USER,
        burst_allowance=5
    ))
    
    # Chat rate limit
    rate_limiter.add_limit("chat", RateLimitConfig(
        max_requests=30,
        window_seconds=60,
        strategy=RateLimitStrategy.SLIDING_WINDOW,
        scope=RateLimitScope.USER
    ))
    
    # Analysis rate limit
    rate_limiter.add_limit("analysis", RateLimitConfig(
        max_requests=20,
        window_seconds=60,
        strategy=RateLimitStrategy.SLIDING_WINDOW,
        scope=RateLimitScope.USER
    ))
    
    # IP-based rate limit for unauthenticated requests
    rate_limiter.add_limit("ip_general", RateLimitConfig(
        max_requests=50,
        window_seconds=60,
        strategy=RateLimitStrategy.SLIDING_WINDOW,
        scope=RateLimitScope.IP
    ))

# Middleware function
def rate_limit_middleware():
    """FastAPI middleware for rate limiting"""
    
    async def middleware(request, call_next):
        # Get user ID or IP for rate limiting
        user_id = getattr(request.state, 'user_id', None)
        identifier = user_id or request.client.host
        
        # Determine rate limit based on endpoint
        endpoint_path = request.url.path
        
        # Choose appropriate rate limit
        if endpoint_path.startswith('/upload'):
            limit_name = "upload"
        elif endpoint_path.startswith('/chat'):
            limit_name = "chat"
        elif endpoint_path.startswith('/analyze'):
            limit_name = "analysis"
        elif user_id:
            limit_name = "user_general"
        else:
            limit_name = "ip_general"
        
        # Check rate limit
        result = rate_limiter.check_rate_limit(limit_name, identifier, endpoint_path)
        
        if not result.allowed:
            from fastapi import HTTPException
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "Rate limit exceeded",
                    "retry_after": result.retry_after,
                    "reset_time": result.reset_time.isoformat()
                },
                headers=result.to_headers()
            )
        
        # Add rate limit headers to response
        response = await call_next(request)
        
        for header, value in result.to_headers().items():
            response.headers[header] = value
        
        return response
    
    return middleware

# Decorator for rate limiting specific functions
def rate_limit(limit_name: str):
    """Decorator to add rate limiting to specific functions"""
    def decorator(func):
        async def async_wrapper(*args, **kwargs):
            # Extract request info (this would need to be adapted based on your setup)
            # For now, this is a placeholder
            identifier = "default"  # You'd extract this from context
            result = rate_limiter.check_rate_limit(limit_name, identifier)
            
            if not result.allowed:
                from src.exceptions import RateLimitError
                raise RateLimitError(
                    message=f"Rate limit exceeded for {limit_name}",
                    retry_after=result.retry_after
                )
            
            return await func(*args, **kwargs)
        
        def sync_wrapper(*args, **kwargs):
            identifier = "default"  # You'd extract this from context
            result = rate_limiter.check_rate_limit(limit_name, identifier)
            
            if not result.allowed:
                from src.exceptions import RateLimitError
                raise RateLimitError(
                    message=f"Rate limit exceeded for {limit_name}",
                    retry_after=result.retry_after
                )
            
            return func(*args, **kwargs)
        
        # Return appropriate wrapper based on whether function is async
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator

# Initialize default limits
setup_default_limits()
