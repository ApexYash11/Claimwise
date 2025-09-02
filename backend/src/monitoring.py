"""
Performance monitoring and metrics collection for ClaimWise backend.
Provides API latency tracking, resource usage monitoring, and performance insights.
"""
import time
import psutil
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from collections import defaultdict, deque
from dataclasses import dataclass, asdict
from threading import Lock
import asyncio
from contextlib import asynccontextmanager
import json

@dataclass
class RequestMetric:
    """Individual request performance metric"""
    endpoint: str
    method: str
    status_code: int
    duration_ms: float
    timestamp: datetime
    user_id: Optional[str] = None
    error_trace_id: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            **asdict(self),
            'timestamp': self.timestamp.isoformat()
        }

@dataclass
class SystemMetric:
    """System performance metric"""
    cpu_percent: float
    memory_percent: float
    memory_used_mb: float
    disk_usage_percent: float
    active_connections: int
    timestamp: datetime
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            **asdict(self),
            'timestamp': self.timestamp.isoformat()
        }

class PerformanceMonitor:
    """Performance monitoring singleton"""
    
    _instance = None
    _lock = Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if hasattr(self, '_initialized'):
            return
        
        self._initialized = True
        self.request_metrics: deque = deque(maxlen=10000)  # Keep last 10k requests
        self.system_metrics: deque = deque(maxlen=1440)    # Keep last 24 hours (1 per minute)
        self.endpoint_stats: Dict[str, Dict[str, Any]] = defaultdict(lambda: {
            'count': 0,
            'total_duration': 0,
            'avg_duration': 0,
            'min_duration': float('inf'),
            'max_duration': 0,
            'error_count': 0,
            'last_accessed': None
        })
        self.active_requests: Dict[str, datetime] = {}
        self._metrics_lock = Lock()
        self.logger = logging.getLogger(__name__)
        
    def record_request(self, metric: RequestMetric):
        """Record a request metric"""
        with self._metrics_lock:
            self.request_metrics.append(metric)
            
            # Update endpoint statistics
            key = f"{metric.method} {metric.endpoint}"
            stats = self.endpoint_stats[key]
            
            stats['count'] += 1
            stats['total_duration'] += metric.duration_ms
            stats['avg_duration'] = stats['total_duration'] / stats['count']
            stats['min_duration'] = min(stats['min_duration'], metric.duration_ms)
            stats['max_duration'] = max(stats['max_duration'], metric.duration_ms)
            stats['last_accessed'] = metric.timestamp
            
            if metric.status_code >= 400:
                stats['error_count'] += 1
    
    def record_system_metric(self):
        """Record current system metrics"""
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            metric = SystemMetric(
                cpu_percent=cpu_percent,
                memory_percent=memory.percent,
                memory_used_mb=memory.used / (1024 * 1024),
                disk_usage_percent=disk.percent,
                active_connections=len(self.active_requests),
                timestamp=datetime.now()
            )
            
            with self._metrics_lock:
                self.system_metrics.append(metric)
                
        except Exception as e:
            self.logger.error(f"Failed to record system metrics: {e}")
    
    def get_endpoint_stats(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Get top endpoints by various metrics"""
        with self._metrics_lock:
            stats_list = []
            for endpoint, stats in self.endpoint_stats.items():
                stats_copy = stats.copy()
                stats_copy['endpoint'] = endpoint
                stats_copy['error_rate'] = (stats['error_count'] / stats['count']) * 100 if stats['count'] > 0 else 0
                if stats_copy['last_accessed']:
                    stats_copy['last_accessed'] = stats_copy['last_accessed'].isoformat()
                stats_list.append(stats_copy)
            
            # Sort by request count (most used endpoints first)
            return sorted(stats_list, key=lambda x: x['count'], reverse=True)[:limit]
    
    def get_recent_requests(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get recent request metrics"""
        with self._metrics_lock:
            recent = list(self.request_metrics)[-limit:]
            return [metric.to_dict() for metric in reversed(recent)]
    
    def get_system_metrics(self, hours: int = 1) -> List[Dict[str, Any]]:
        """Get system metrics for the last N hours"""
        cutoff = datetime.now() - timedelta(hours=hours)
        with self._metrics_lock:
            recent_metrics = [
                metric for metric in self.system_metrics 
                if metric.timestamp >= cutoff
            ]
            return [metric.to_dict() for metric in recent_metrics]
    
    def get_performance_summary(self) -> Dict[str, Any]:
        """Get overall performance summary"""
        with self._metrics_lock:
            total_requests = len(self.request_metrics)
            if total_requests == 0:
                return {"message": "No requests recorded yet"}
            
            # Calculate error rates
            error_requests = sum(1 for m in self.request_metrics if m.status_code >= 400)
            error_rate = (error_requests / total_requests) * 100
            
            # Calculate average response time
            total_duration = sum(m.duration_ms for m in self.request_metrics)
            avg_response_time = total_duration / total_requests
            
            # Get recent system metrics
            recent_system = list(self.system_metrics)[-10:] if self.system_metrics else []
            avg_cpu = sum(m.cpu_percent for m in recent_system) / len(recent_system) if recent_system else 0
            avg_memory = sum(m.memory_percent for m in recent_system) / len(recent_system) if recent_system else 0
            
            # Most used endpoints
            top_endpoints = self.get_endpoint_stats(5)
            
            return {
                "total_requests": total_requests,
                "error_rate_percent": round(error_rate, 2),
                "avg_response_time_ms": round(avg_response_time, 2),
                "avg_cpu_percent": round(avg_cpu, 2),
                "avg_memory_percent": round(avg_memory, 2),
                "active_requests": len(self.active_requests),
                "top_endpoints": top_endpoints,
                "monitoring_since": min(m.timestamp for m in self.request_metrics).isoformat() if self.request_metrics else None
            }
    
    def start_request_tracking(self, request_id: str):
        """Start tracking a request"""
        self.active_requests[request_id] = datetime.now()
    
    def end_request_tracking(self, request_id: str):
        """End tracking a request"""
        self.active_requests.pop(request_id, None)
    
    def get_slow_requests(self, threshold_ms: float = 1000, limit: int = 50) -> List[Dict[str, Any]]:
        """Get requests slower than threshold"""
        with self._metrics_lock:
            slow_requests = [
                metric for metric in self.request_metrics 
                if metric.duration_ms > threshold_ms
            ]
            # Sort by duration (slowest first)
            slow_requests.sort(key=lambda x: x.duration_ms, reverse=True)
            return [metric.to_dict() for metric in slow_requests[:limit]]

# Global monitor instance
monitor = PerformanceMonitor()

@asynccontextmanager
async def track_request(endpoint: str, method: str, user_id: Optional[str] = None):
    """Async context manager for tracking request performance"""
    start_time = time.time()
    request_id = f"{method}_{endpoint}_{int(start_time)}"
    
    monitor.start_request_tracking(request_id)
    
    try:
        yield
        status_code = 200
        error_trace_id = None
    except Exception as e:
        status_code = 500
        error_trace_id = getattr(e, 'trace_id', None)
        raise
    finally:
        duration_ms = (time.time() - start_time) * 1000
        
        metric = RequestMetric(
            endpoint=endpoint,
            method=method,
            status_code=status_code,
            duration_ms=duration_ms,
            timestamp=datetime.now(),
            user_id=user_id,
            error_trace_id=error_trace_id
        )
        
        monitor.record_request(metric)
        monitor.end_request_tracking(request_id)

def performance_middleware():
    """FastAPI middleware for automatic performance tracking"""
    async def middleware(request, call_next):
        start_time = time.time()
        user_id = getattr(request.state, 'user_id', None)
        
        response = await call_next(request)
        
        duration_ms = (time.time() - start_time) * 1000
        
        metric = RequestMetric(
            endpoint=request.url.path,
            method=request.method,
            status_code=response.status_code,
            duration_ms=duration_ms,
            timestamp=datetime.now(),
            user_id=user_id
        )
        
        monitor.record_request(metric)
        
        # Add performance headers
        response.headers["X-Response-Time"] = f"{duration_ms:.2f}ms"
        
        return response
    
    return middleware

# Background task to collect system metrics
async def collect_system_metrics():
    """Background task to collect system metrics periodically"""
    while True:
        try:
            monitor.record_system_metric()
            await asyncio.sleep(60)  # Collect every minute
        except Exception as e:
            logging.error(f"Error collecting system metrics: {e}")
            await asyncio.sleep(60)
