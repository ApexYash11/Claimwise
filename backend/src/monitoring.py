"""
Performance monitoring system for ClaimWise backend.
Provides request tracking, system metrics collection, and performance analytics.
"""
import time
import asyncio
import logging
import threading
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, field
from collections import defaultdict, deque
from contextlib import asynccontextmanager
import uuid
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

@dataclass
class RequestMetrics:
    endpoint: str
    method: str
    status_code: int
    response_time: float
    timestamp: datetime
    user_id: Optional[str] = None
    error: Optional[str] = None
    request_size: int = 0
    response_size: int = 0

@dataclass
class SystemMetrics:
    timestamp: datetime
    cpu_percent: float = 0.0
    memory_percent: float = 0.0
    disk_percent: float = 0.0
    active_requests: int = 0
    total_requests: int = 0
    error_rate: float = 0.0

@dataclass
class EndpointStats:
    total_requests: int = 0
    total_response_time: float = 0.0
    min_response_time: float = float('inf')
    max_response_time: float = 0.0
    error_count: int = 0
    last_request: Optional[datetime] = None
    recent_response_times: deque = field(default_factory=lambda: deque(maxlen=100))
    
    @property
    def avg_response_time(self) -> float:
        return self.total_response_time / max(1, self.total_requests)
    
    @property
    def error_rate(self) -> float:
        return (self.error_count / max(1, self.total_requests)) * 100
    
    @property
    def p95_response_time(self) -> float:
        if not self.recent_response_times:
            return 0.0
        sorted_times = sorted(self.recent_response_times)
        index = int(len(sorted_times) * 0.95)
        return sorted_times[index] if index < len(sorted_times) else sorted_times[-1]

class PerformanceMonitor:
    """Central performance monitoring system"""
    
    def __init__(self, max_metrics_history: int = 1000):
        self.max_metrics_history = max_metrics_history
        self.request_metrics: deque = deque(maxlen=max_metrics_history)
        self.system_metrics: deque = deque(maxlen=max_metrics_history)
        self.endpoint_stats: Dict[str, EndpointStats] = defaultdict(EndpointStats)
        self.active_requests: Dict[str, float] = {}  # request_id -> start_time
        self.lock = threading.RLock()
        
        # Performance thresholds
        self.slow_request_threshold = 5.0  # seconds
        self.high_error_rate_threshold = 5.0  # percent
    
    def start_request(self, endpoint: str, method: str, user_id: Optional[str] = None) -> str:
        """Start tracking a new request"""
        request_id = str(uuid.uuid4())[:8]
        
        with self.lock:
            self.active_requests[request_id] = time.time()
        
        logger.debug(f"Started tracking request {request_id}: {method} {endpoint}")
        return request_id
    
    def end_request(
        self,
        request_id: str,
        endpoint: str,
        method: str,
        status_code: int,
        user_id: Optional[str] = None,
        error: Optional[str] = None,
        request_size: int = 0,
        response_size: int = 0
    ):
        """End tracking a request and record metrics"""
        
        with self.lock:
            start_time = self.active_requests.pop(request_id, time.time())
            response_time = time.time() - start_time
            
            # Create metrics record
            metrics = RequestMetrics(
                endpoint=endpoint,
                method=method,
                status_code=status_code,
                response_time=response_time,
                timestamp=datetime.now(),
                user_id=user_id,
                error=error,
                request_size=request_size,
                response_size=response_size
            )
            
            self.request_metrics.append(metrics)
            
            # Update endpoint stats
            endpoint_key = f"{method} {endpoint}"
            stats = self.endpoint_stats[endpoint_key]
            
            stats.total_requests += 1
            stats.total_response_time += response_time
            stats.min_response_time = min(stats.min_response_time, response_time)
            stats.max_response_time = max(stats.max_response_time, response_time)
            stats.last_request = metrics.timestamp
            stats.recent_response_times.append(response_time)
            
            if status_code >= 400 or error:
                stats.error_count += 1
            
            # Log slow requests
            if response_time > self.slow_request_threshold:
                logger.warning(
                    f"Slow request detected: {endpoint} took {response_time:.2f}s",
                    extra={
                        "request_id": request_id,
                        "endpoint": endpoint,
                        "response_time": response_time,
                        "status_code": status_code
                    }
                )
        
        logger.debug(f"Completed tracking request {request_id}: {response_time:.3f}s")
    
    def record_system_metric(self):
        """Record current system metrics"""
        try:
            # Try to get system metrics
            cpu_percent = 0.0
            memory_percent = 0.0
            disk_percent = 0.0
            
            try:
                import psutil
                cpu_percent = psutil.cpu_percent(interval=0.1)
                memory = psutil.virtual_memory()
                memory_percent = memory.percent
                disk = psutil.disk_usage('/')
                disk_percent = disk.percent
            except ImportError:
                logger.debug("psutil not available, using default system metrics")
            except Exception as e:
                logger.debug(f"Error getting system metrics: {e}")
            
            with self.lock:
                active_count = len(self.active_requests)
                total_count = len(self.request_metrics)
                
                # Calculate recent error rate
                recent_metrics = [m for m in list(self.request_metrics)[-100:]]
                error_count = sum(1 for m in recent_metrics if m.status_code >= 400 or m.error)
                error_rate = (error_count / max(1, len(recent_metrics))) * 100
                
                metrics = SystemMetrics(
                    timestamp=datetime.now(),
                    cpu_percent=cpu_percent,
                    memory_percent=memory_percent,
                    disk_percent=disk_percent,
                    active_requests=active_count,
                    total_requests=total_count,
                    error_rate=error_rate
                )
                
                self.system_metrics.append(metrics)
        
        except Exception as e:
            logger.error(f"Error recording system metrics: {e}")
    
    def get_performance_summary(self) -> Dict[str, Any]:
        """Get comprehensive performance summary"""
        with self.lock:
            now = datetime.now()
            hour_ago = now - timedelta(hours=1)
            
            # Recent metrics (last hour)
            recent_requests = [
                m for m in self.request_metrics
                if m.timestamp >= hour_ago
            ]
            
            # Calculate summary stats
            total_requests = len(recent_requests)
            if total_requests == 0:
                return {
                    "period": "last_hour",
                    "total_requests": 0,
                    "avg_response_time": 0,
                    "error_rate": 0,
                    "active_requests": len(self.active_requests),
                    "top_endpoints": []
                }
            
            total_response_time = sum(m.response_time for m in recent_requests)
            avg_response_time = total_response_time / total_requests
            
            error_count = sum(1 for m in recent_requests if m.status_code >= 400 or m.error)
            error_rate = (error_count / total_requests) * 100
            
            # Top endpoints by request count
            endpoint_counts = defaultdict(int)
            for m in recent_requests:
                endpoint_counts[f"{m.method} {m.endpoint}"] += 1
            
            top_endpoints = sorted(
                endpoint_counts.items(),
                key=lambda x: x[1],
                reverse=True
            )[:5]
            
            # Response time percentiles
            response_times = sorted(m.response_time for m in recent_requests)
            p50 = response_times[len(response_times) // 2] if response_times else 0
            p95 = response_times[int(len(response_times) * 0.95)] if response_times else 0
            p99 = response_times[int(len(response_times) * 0.99)] if response_times else 0
            
            return {
                "period": "last_hour",
                "total_requests": total_requests,
                "avg_response_time": round(avg_response_time, 3),
                "p50_response_time": round(p50, 3),
                "p95_response_time": round(p95, 3),
                "p99_response_time": round(p99, 3),
                "error_rate": round(error_rate, 2),
                "error_count": error_count,
                "active_requests": len(self.active_requests),
                "top_endpoints": [
                    {"endpoint": endpoint, "requests": count}
                    for endpoint, count in top_endpoints
                ],
                "slow_requests": len([m for m in recent_requests if m.response_time > self.slow_request_threshold])
            }
    
    def get_endpoint_stats(self, endpoint: Optional[str] = None) -> Dict[str, Any]:
        """Get statistics for specific endpoint or all endpoints"""
        with self.lock:
            if endpoint:
                stats = self.endpoint_stats.get(endpoint)
                if not stats:
                    return {}
                
                return {
                    "endpoint": endpoint,
                    "total_requests": stats.total_requests,
                    "avg_response_time": round(stats.avg_response_time, 3),
                    "min_response_time": round(stats.min_response_time, 3),
                    "max_response_time": round(stats.max_response_time, 3),
                    "p95_response_time": round(stats.p95_response_time, 3),
                    "error_rate": round(stats.error_rate, 2),
                    "error_count": stats.error_count,
                    "last_request": stats.last_request.isoformat() if stats.last_request else None
                }
            else:
                # Return all endpoint stats
                return {
                    endpoint: {
                        "total_requests": stats.total_requests,
                        "avg_response_time": round(stats.avg_response_time, 3),
                        "error_rate": round(stats.error_rate, 2),
                        "p95_response_time": round(stats.p95_response_time, 3)
                    }
                    for endpoint, stats in self.endpoint_stats.items()
                    if stats.total_requests > 0
                }
    
    def get_system_metrics(self, hours: int = 1) -> List[Dict[str, Any]]:
        """Get system metrics for the specified time period"""
        with self.lock:
            cutoff_time = datetime.now() - timedelta(hours=hours)
            recent_metrics = [
                {
                    "timestamp": m.timestamp.isoformat(),
                    "cpu_percent": m.cpu_percent,
                    "memory_percent": m.memory_percent,
                    "disk_percent": m.disk_percent,
                    "active_requests": m.active_requests,
                    "error_rate": m.error_rate
                }
                for m in self.system_metrics
                if m.timestamp >= cutoff_time
            ]
            
            return recent_metrics
    
    def reset_stats(self):
        """Reset all statistics"""
        with self.lock:
            self.request_metrics.clear()
            self.system_metrics.clear()
            self.endpoint_stats.clear()
            self.active_requests.clear()
            logger.info("Performance statistics reset")

# Global monitor instance
monitor = PerformanceMonitor()

@asynccontextmanager
async def track_request(endpoint: str, method: str, user_id: Optional[str] = None):
    """Async context manager for tracking requests"""
    request_id = monitor.start_request(endpoint, method, user_id)
    
    try:
        yield request_id
        monitor.end_request(request_id, endpoint, method, 200, user_id)
    except Exception as e:
        monitor.end_request(request_id, endpoint, method, 500, user_id, str(e))
        raise

def performance_middleware():
    """Middleware for automatic request tracking"""
    async def middleware(request, call_next):
        endpoint = request.url.path
        method = request.method
        
        # Get user ID if available
        user_id = getattr(request.state, 'user_id', None)
        
        request_id = monitor.start_request(endpoint, method, user_id)
        start_time = time.time()
        
        try:
            response = await call_next(request)
            
            # Calculate sizes
            request_size = int(request.headers.get('content-length', 0))
            response_size = len(response.body) if hasattr(response, 'body') else 0
            
            monitor.end_request(
                request_id, endpoint, method, response.status_code,
                user_id, None, request_size, response_size
            )
            
            # Add performance headers
            response_time = time.time() - start_time
            response.headers["X-Response-Time"] = f"{response_time:.3f}s"
            response.headers["X-Request-ID"] = request_id
            
            return response
            
        except Exception as e:
            monitor.end_request(request_id, endpoint, method, 500, user_id, str(e))
            raise
    
    return middleware

# Background metrics collection
async def collect_system_metrics():
    """Background task to collect system metrics"""
    while True:
        try:
            monitor.record_system_metric()
            await asyncio.sleep(60)  # Collect every minute
        except Exception as e:
            logger.error(f"Error in system metrics collection: {e}")
            await asyncio.sleep(60)

def start_monitoring():
    """Start the monitoring system"""
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(collect_system_metrics())
        logger.info("Started performance monitoring system")
    except RuntimeError:
        # No running loop, will start with the app
        pass

# Health check functions
async def get_health_status() -> Dict[str, Any]:
    """Get overall system health status"""
    summary = monitor.get_performance_summary()
    
    # Determine health status
    is_healthy = True
    issues = []
    
    # Check error rate
    if summary["error_rate"] > monitor.high_error_rate_threshold:
        is_healthy = False
        issues.append(f"High error rate: {summary['error_rate']:.1f}%")
    
    # Check response times
    if summary["p95_response_time"] > monitor.slow_request_threshold:
        is_healthy = False
        issues.append(f"Slow response times: P95 = {summary['p95_response_time']:.2f}s")
    
    # Check active requests (basic overload detection)
    if summary["active_requests"] > 50:  # Adjust threshold as needed
        issues.append(f"High active request count: {summary['active_requests']}")
    
    return {
        "healthy": is_healthy,
        "issues": issues,
        "summary": summary,
        "timestamp": datetime.now().isoformat()
    }
