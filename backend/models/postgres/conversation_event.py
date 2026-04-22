from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from db.session import Base


class ConversationEvent(Base):
    __tablename__ = "conversation_events"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    actor_id        = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    actor_name      = Column(String(255), nullable=True)
    event_type      = Column(String(50), nullable=False)
    value           = Column(String(255), nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
