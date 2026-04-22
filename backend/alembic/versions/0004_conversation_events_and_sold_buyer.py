"""Add conversation_events table and actual_buyer_id to listings

Revision ID: 0004
Revises: 0003
Create Date: 2026-04-21
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "conversation_events",
        sa.Column("id",              UUID(as_uuid=True), primary_key=True),
        sa.Column("conversation_id", UUID(as_uuid=True), sa.ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("actor_id",        UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("actor_name",      sa.String(255), nullable=True),
        sa.Column("event_type",      sa.String(50),  nullable=False),
        sa.Column("value",           sa.String(255), nullable=True),
        sa.Column("created_at",      sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_conv_events_conversation_id", "conversation_events", ["conversation_id"])

    op.add_column("listings",
        sa.Column("actual_buyer_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True)
    )

    op.add_column("conversations",
        sa.Column("seen_by_buyer",  sa.Boolean(), nullable=False, server_default=sa.text("true"))
    )
    op.add_column("conversations",
        sa.Column("seen_by_seller", sa.Boolean(), nullable=False, server_default=sa.text("true"))
    )


def downgrade() -> None:
    op.drop_column("conversations", "seen_by_seller")
    op.drop_column("conversations", "seen_by_buyer")
    op.drop_column("listings", "actual_buyer_id")
    op.drop_index("ix_conv_events_conversation_id", table_name="conversation_events")
    op.drop_table("conversation_events")
