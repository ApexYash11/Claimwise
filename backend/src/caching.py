"""
Advanced caching system for ClaimWise backend.
Provides multi-layer caching with LRU, Redis-like features, and smart cache invalidation.
"""
import time
import hashlib
import json
import pickle
import threading
from typing import Any, Optional, Dict, List, Tuple, Callable, Union
from datetime import datetime, timedelta
from collections import OrderedDict
from dataclasses import dataclass
from enum import Enum
import logging
import asyncio
from contextlib import asynccontextmanager

logger = logging.getLogger(__name__)

class CacheStrategy(str, Enum):
    """Cache eviction strategies"""
    LRU = "lru"  # Least Recently Used
    LFU = "lfu"  # Least Frequently Used
    TTL = "ttl"  # Time To Live
    FIFO = "fifo"  # First In, First Out

@dataclass
class CacheItem:
    """Cache item with metadata"""
    key: str
    value: Any
    created_at: datetime
    last_accessed: datetime
    access_count: int
    ttl: Optional[int] = None  # TTL in seconds
    size_bytes: int = 0
    
    def is_expired(self, current_time: Optional[datetime] = None) -> bool:
        """Check if item has expired using provided timestamp or current time"""
        if self.ttl is None:
            return False
        check_time = current_time or datetime.now()
        return check_time > self.created_at + timedelta(seconds=self.ttl)
    
    @property
    def age_seconds(self) -> int:
        """Get age of item in seconds"""
        return int((datetime.now() - self.created_at).total_seconds())

class AdvancedCache:
    """Advanced in-memory cache with multiple eviction strategies"""
    
    def __init__(
        self,
        max_size: int = 1000,
        max_memory_mb: int = 100,
        strategy: CacheStrategy = CacheStrategy.LRU,
        default_ttl: Optional[int] = None
    ):
        self.max_size = max_size
        self.max_memory_bytes = max_memory_mb * 1024 * 1024
        self.strategy = strategy
        self.default_ttl = default_ttl
        
        self._cache: Dict[str, CacheItem] = {}
        self._access_order: OrderedDict = OrderedDict()  # For LRU
        self._lock = threading.RLock()
        self._current_memory_usage = 0
        
        # Statistics
        self._hits = 0
        self._misses = 0
        self._evictions = 0
        
    def _calculate_size(self, value: Any) -> int:
        """Calculate approximate size of value in bytes"""
        try:
            if isinstance(value, (str, bytes)):
                return len(value)
            else:
                # Use pickle to estimate size
                return len(pickle.dumps(value))
        except Exception:
            return 100  # Default estimate
    
    def _evict_if_needed(self):
        """Evict items if cache exceeds limits"""
        while (len(self._cache) >= self.max_size or 
               self._current_memory_usage >= self.max_memory_bytes):
            
            if not self._cache:
                break
                
            # Choose item to evict based on strategy
            key_to_evict = self._choose_eviction_key()
            if key_to_evict:
                self._remove_item(key_to_evict)
                self._evictions += 1
    
    def _choose_eviction_key(self) -> Optional[str]:
        """Choose which key to evict based on strategy"""
        if not self._cache:
            return None
            
        if self.strategy == CacheStrategy.LRU:
            # Remove least recently accessed
            return min(self._cache.keys(), 
                      key=lambda k: self._cache[k].last_accessed)
        
        elif self.strategy == CacheStrategy.LFU:
            # Remove least frequently used
            return min(self._cache.keys(), 
                      key=lambda k: self._cache[k].access_count)
        
        elif self.strategy == CacheStrategy.TTL:
            # Remove oldest expired item, or oldest if none expired
            current_time = datetime.now()
            expired_keys = [k for k, v in self._cache.items() if v.is_expired(current_time)]
            if expired_keys:
                return min(expired_keys, 
                          key=lambda k: self._cache[k].created_at)
            else:
                return min(self._cache.keys(), 
                          key=lambda k: self._cache[k].created_at)
        
        elif self.strategy == CacheStrategy.FIFO:
            # Remove oldest item
            return min(self._cache.keys(), 
                      key=lambda k: self._cache[k].created_at)
        
        return None
    
    def _remove_item(self, key: str):
        """Remove item from cache and update memory usage"""
        if key in self._cache:
            item = self._cache[key]
            self._current_memory_usage -= item.size_bytes
            del self._cache[key]
            self._access_order.pop(key, None)
    
    def _clean_expired(self, current_time: Optional[datetime] = None):
        """Remove expired items"""
        check_time = current_time or datetime.now()
        expired_keys = [k for k, v in self._cache.items() if v.is_expired(check_time)]
        for key in expired_keys:
            self._remove_item(key)
    
    def get(self, key: str, default: Any = None) -> Any:
        """Get value from cache"""
        with self._lock:
            current_time = datetime.now()
            self._clean_expired(current_time)
            
            if key not in self._cache:
                self._misses += 1
                return default
            
            item = self._cache[key]
            if item.is_expired(current_time):
                self._remove_item(key)
                self._misses += 1
                return default
            
            # Update access information
            item.last_accessed = current_time
            item.access_count += 1
            self._access_order.move_to_end(key)
            self._hits += 1
            
            return item.value
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in cache"""
        with self._lock:
            # Calculate size
            size_bytes = self._calculate_size(value)
            
            # Check if single item would exceed memory limit
            if size_bytes > self.max_memory_bytes:
                logger.warning(f"Cache item too large: {size_bytes} bytes")
                return False
            
            # Remove existing item if present
            if key in self._cache:
                self._remove_item(key)
            
            # Create new cache item
            item = CacheItem(
                key=key,
                value=value,
                created_at=datetime.now(),
                last_accessed=datetime.now(),
                access_count=1,
                ttl=ttl or self.default_ttl,
                size_bytes=size_bytes
            )
            
            # Add to cache
            self._cache[key] = item
            self._access_order[key] = True
            self._current_memory_usage += size_bytes
            
            # Evict if needed
            self._evict_if_needed()
            
            return True
    
    def delete(self, key: str) -> bool:
        """Delete value from cache"""
        with self._lock:
            if key in self._cache:
                self._remove_item(key)
                return True
            return False
    
    def exists(self, key: str) -> bool:
        """Check if key exists in cache"""
        with self._lock:
            current_time = datetime.now()
            self._clean_expired(current_time)
            return key in self._cache and not self._cache[key].is_expired(current_time)
    
    def clear(self):
        """Clear all items from cache"""
        with self._lock:
            self._cache.clear()
            self._access_order.clear()
            self._current_memory_usage = 0
    
    def keys(self) -> List[str]:
        """Get all cache keys"""
        with self._lock:
            current_time = datetime.now()
            self._clean_expired(current_time)
            return list(self._cache.keys())
    
    def stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        with self._lock:
            total_requests = self._hits + self._misses
            hit_rate = (self._hits / total_requests * 100) if total_requests > 0 else 0
            
            return {
                "hits": self._hits,
                "misses": self._misses,
                "hit_rate_percent": round(hit_rate, 2),
                "evictions": self._evictions,
                "size": len(self._cache),
                "max_size": self.max_size,
                "memory_usage_mb": round(self._current_memory_usage / (1024 * 1024), 2),
                "max_memory_mb": round(self.max_memory_bytes / (1024 * 1024), 2),
                "memory_usage_percent": round((self._current_memory_usage / self.max_memory_bytes) * 100, 2),
                "strategy": self.strategy.value
            }

class CacheManager:
    """Manages multiple cache instances for different purposes"""
    
    def __init__(self):
        self._caches: Dict[str, AdvancedCache] = {}
        self._lock = threading.Lock()
    
    def create_cache(
        self,
        name: str,
        max_size: int = 1000,
        max_memory_mb: int = 100,
        strategy: CacheStrategy = CacheStrategy.LRU,
        default_ttl: Optional[int] = None
    ) -> AdvancedCache:
        """Create or get a named cache"""
        with self._lock:
            if name not in self._caches:
                self._caches[name] = AdvancedCache(
                    max_size=max_size,
                    max_memory_mb=max_memory_mb,
                    strategy=strategy,
                    default_ttl=default_ttl
                )
            return self._caches[name]
    
    def get_cache(self, name: str) -> Optional[AdvancedCache]:
        """Get existing cache by name"""
        return self._caches.get(name)
    
    def clear_all(self):
        """Clear all caches"""
        with self._lock:
            for cache in self._caches.values():
                cache.clear()
    
    def get_all_stats(self) -> Dict[str, Dict[str, Any]]:
        """Get statistics for all caches"""
        return {name: cache.stats() for name, cache in self._caches.items()}

# Global cache manager
cache_manager = CacheManager()

# Predefined caches for common use cases
def get_embedding_cache() -> AdvancedCache:
    """Get cache for embeddings"""
    return cache_manager.create_cache(
        "embeddings",
        max_size=5000,
        max_memory_mb=200,
        strategy=CacheStrategy.LRU,
        default_ttl=3600 * 24  # 24 hours
    )

def get_llm_response_cache() -> AdvancedCache:
    """Get cache for LLM responses"""
    return cache_manager.create_cache(
        "llm_responses",
        max_size=2000,
        max_memory_mb=50,
        strategy=CacheStrategy.LRU,
        default_ttl=3600  # 1 hour
    )

def get_analysis_cache() -> AdvancedCache:
    """Get cache for policy analysis results"""
    return cache_manager.create_cache(
        "analysis",
        max_size=1000,
        max_memory_mb=30,
        strategy=CacheStrategy.LRU,
        default_ttl=3600 * 6  # 6 hours
    )

def get_user_session_cache() -> AdvancedCache:
    """Get cache for user session data"""
    return cache_manager.create_cache(
        "user_sessions",
        max_size=500,
        max_memory_mb=10,
        strategy=CacheStrategy.TTL,
        default_ttl=3600 * 2  # 2 hours
    )

# Cache decorators
def cached(
    cache_name: str,
    ttl: Optional[int] = None,
    key_func: Optional[Callable] = None
):
    """Decorator to cache function results"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            cache = cache_manager.get_cache(cache_name)
            if not cache:
                # If cache doesn't exist, just call function
                return func(*args, **kwargs)
            
            # Generate cache key
            if key_func:
                cache_key = key_func(*args, **kwargs)
            else:
                # Default key generation
                key_data = {
                    'func': func.__name__,
                    'args': args,
                    'kwargs': kwargs
                }
                cache_key = hashlib.md5(
                    json.dumps(key_data, sort_keys=True, default=str).encode()
                ).hexdigest()
            
            # Try to get from cache
            result = cache.get(cache_key)
            if result is not None:
                return result
            
            # Call function and cache result
            result = func(*args, **kwargs)
            cache.set(cache_key, result, ttl)
            return result
        
        return wrapper
    return decorator

@asynccontextmanager
async def cache_context(cache_name: str):
    """Async context manager for cache operations"""
    cache = cache_manager.get_cache(cache_name)
    if not cache:
        cache = cache_manager.create_cache(cache_name)
    
    try:
        yield cache
    finally:
        # Any cleanup if needed
        pass
