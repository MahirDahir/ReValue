"""Add listing_removed flag to conversations and make listing_id nullable

Revision ID: 0006
Revises: 0005
Create Date: 2026-04-23
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "0006"
down_revision: Union[str, None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add listing_removed flag
    op.add_column("conversations",
        sa.Column("listing_removed", sa.Boolean(), nullable=False, server_default=sa.text("false"))
    )
    # Store listing title on conversation so history still shows it after listing is deleted
    op.add_column("conversations",
        sa.Column("listing_title_snapshot", sa.String(200), nullable=True)
    )
    # Drop old FK constraint and re-add as nullable with SET NULL on delete
    op.drop_constraint("conversations_listing_id_fkey", "conversations", type_="foreignkey")
    op.alter_column("conversations", "listing_id", nullable=True)
    op.create_foreign_key(
        "conversations_listing_id_fkey",
        "conversations", "listings",
        ["listing_id"], ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("conversations_listing_id_fkey", "conversations", type_="foreignkey")
    op.alter_column("conversations", "listing_id", nullable=False)
    op.create_foreign_key(
        "conversations_listing_id_fkey",
        "conversations", "listings",
        ["listing_id"], ["id"],
    )
    op.drop_column("conversations", "listing_title_snapshot")
    op.drop_column("conversations", "listing_removed")
