import asyncio
from collections import defaultdict

# user_id (str) -> set of asyncio.Queue
_subscribers: dict[str, set] = defaultdict(set)


def subscribe(user_id: str) -> asyncio.Queue:
    q = asyncio.Queue(maxsize=50)
    _subscribers[str(user_id)].add(q)
    return q


def unsubscribe(user_id: str, q: asyncio.Queue):
    _subscribers[str(user_id)].discard(q)
    if not _subscribers[str(user_id)]:
        del _subscribers[str(user_id)]


def notify(user_id: str, event: dict):
    for q in list(_subscribers.get(str(user_id), [])):
        try:
            q.put_nowait(event)
        except asyncio.QueueFull:
            pass  # slow consumer — drop the event, client will re-sync on reconnect
