import time
import logging
from collections import defaultdict

logger = logging.getLogger(__name__)


class CircuitBreakerOpen(Exception):
    pass


class CircuitBreaker:
    def __init__(self, failure_threshold=3, recovery_timeout=60):
        self.failure_count = defaultdict(int)
        self.last_failure_time = {}
        self.state = defaultdict(lambda: "CLOSED")
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout

    def call(self, service_name, fn, *args, **kwargs):
        now = time.time()

        if self.state[service_name] == "OPEN":
            if (
                now - self.last_failure_time.get(service_name, 0)
                > self.recovery_timeout
            ):
                self.state[service_name] = "HALF_OPEN"
                logger.info(
                    f"Circuit {service_name} \u2192 HALF_OPEN (attempting recovery)"
                )
            else:
                raise CircuitBreakerOpen(
                    f"{service_name} circuit is OPEN (cooldown: {int(self.recovery_timeout - (now - self.last_failure_time.get(service_name, 0)))}s remaining)"
                )

        try:
            result = fn(*args, **kwargs)
            self.failure_count[service_name] = 0
            if self.state[service_name] == "HALF_OPEN":
                logger.info(f"Circuit {service_name} \u2192 CLOSED (recovered)")
            self.state[service_name] = "CLOSED"
            return result
        except Exception as e:
            self.failure_count[service_name] += 1
            self.last_failure_time[service_name] = now
            if self.failure_count[service_name] >= self.failure_threshold:
                self.state[service_name] = "OPEN"
                logger.warning(
                    f"Circuit {service_name} \u2192 OPEN ({self.failure_count[service_name]} failures)"
                )
            raise

    def get_state(self, service_name):
        return self.state.get(service_name, "CLOSED")


circuit_breaker = CircuitBreaker(failure_threshold=3, recovery_timeout=60)
