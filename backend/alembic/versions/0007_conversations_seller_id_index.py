"""Add missing seller_id index on conversations

Revision ID: 0007
Revises: 0006
Create Date: 2026-05-08
"""
from alembic import op

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index("ix_conversations_seller_id", "conversations", ["seller_id"])


def downgrade() -> None:
    op.drop_index("ix_conversations_seller_id", table_name="conversations")
