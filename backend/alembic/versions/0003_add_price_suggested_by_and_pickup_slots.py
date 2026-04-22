"""Add price_suggested_by to conversations and pickup_slots to listings

Revision ID: 0003
Revises: 0002
Create Date: 2026-04-18
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("conversations",
        sa.Column("price_suggested_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True)
    )
    op.add_column("listings",
        sa.Column("pickup_slots", sa.JSON(), nullable=True, server_default=sa.text("'[]'"))
    )


def downgrade() -> None:
    op.drop_column("conversations", "price_suggested_by")
    op.drop_column("listings", "pickup_slots")
