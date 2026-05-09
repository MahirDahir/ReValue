import asyncio
import json
import os

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from jose import JWTError, jwt
from sqlalchemy.orm import Session
import redis.asyncio as aioredis

from config import get_settings
from db.session import get_db
from models.postgres.user import User

settings = get_settings()
router   = APIRouter(prefix="/events", tags=["events"])

_REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
_KEEPALIVE_INTERVAL = 25  # seconds


def _user_from_token(token: str, db: Session) -> User | None:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        user_id: str = payload.get("sub")
        if not user_id:
            return None
    except JWTError:
        return None
    return db.query(User).filter(User.id == user_id).first()


@router.get("/stream")
async def sse_stream(
    token: str = Query(...),
    db: Session = Depends(get_db),
):
    user = _user_from_token(token, db)
    if not user:
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="Invalid token")

    channel = f"sse:{user.id}"

    async def event_generator():
        # Each SSE connection gets its own async Redis pubsub handle
        try:
            r = aioredis.from_url(_REDIS_URL, decode_responses=True)
            pubsub = r.pubsub()
            await pubsub.subscribe(channel)
        except Exception:
            # Redis unreachable — yield a clean disconnect comment so the client
            # can reconnect later rather than spinning in a tight error loop
            yield ": redis_unavailable\n\n"
            return

        try:
            while True:
                try:
                    # Block for up to keepalive interval — releases the event loop while waiting
                    msg = await asyncio.wait_for(
                        pubsub.get_message(ignore_subscribe_messages=True, timeout=_KEEPALIVE_INTERVAL),
                        timeout=_KEEPALIVE_INTERVAL + 1,
                    )
                    if msg and msg["type"] == "message":
                        yield f"data: {msg['data']}\n\n"
                    else:
                        yield ": keepalive\n\n"
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"
                except Exception:
                    # Transient Redis error mid-stream — yield keepalive and let browser reconnect
                    yield ": keepalive\n\n"
                    break
        except asyncio.CancelledError:
            pass
        finally:
            try:
                await pubsub.unsubscribe(channel)
                await r.aclose()
            except Exception:
                pass

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
