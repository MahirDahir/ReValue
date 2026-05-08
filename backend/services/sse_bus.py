import json
import redis
import os

# Sync client — used by service layer (synchronous FastAPI routes) to publish events
_redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
_client: redis.Redis | None = None


def _get_client() -> redis.Redis:
    global _client
    if _client is None:
        _client = redis.from_url(_redis_url, decode_responses=True)
    return _client


def _channel(user_id: str) -> str:
    return f"sse:{user_id}"


def notify(user_id: str, event: dict):
    """Publish an event to a user's Redis channel. Called from sync service layer."""
    try:
        _get_client().publish(_channel(str(user_id)), json.dumps(event))
    except redis.RedisError:
        # Redis unavailable — degrade gracefully, client will re-sync on next HTTP request
        pass
