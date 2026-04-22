"""Add conversations table

Revision ID: 0002
Revises: 0001
Create Date: 2026-04-18
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "conversations",
        sa.Column("id",            UUID(as_uuid=True), primary_key=True),
        sa.Column("listing_id",    UUID(as_uuid=True), sa.ForeignKey("listings.id"),  nullable=False),
        sa.Column("buyer_id",      UUID(as_uuid=True), sa.ForeignKey("users.id"),     nullable=False),
        sa.Column("seller_id",     UUID(as_uuid=True), sa.ForeignKey("users.id"),     nullable=False),
        sa.Column("status",        sa.String(30),  nullable=False, server_default="price_pending"),
        sa.Column("suggested_price",    sa.Float(), nullable=True),
        sa.Column("agreed_price",       sa.Float(), nullable=True),
        sa.Column("suggested_pickup",   sa.String(50), nullable=True),
        sa.Column("agreed_pickup",      sa.String(50), nullable=True),
        sa.Column("pickup_suggested_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_conversations_listing_id", "conversations", ["listing_id"])
    op.create_index("ix_conversations_buyer_id",   "conversations", ["buyer_id"])
    op.create_index("ix_conversations_status",     "conversations", ["status"])
    op.create_unique_constraint(
        "uq_conversations_listing_buyer", "conversations", ["listing_id", "buyer_id"]
    )


def downgrade() -> None:
    op.drop_table("conversations")
