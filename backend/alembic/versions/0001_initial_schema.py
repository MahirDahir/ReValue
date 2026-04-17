"""Initial schema

Revision ID: 0001
Revises:
Create Date: 2026-04-14

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSON

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("phone", sa.String(20), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("avatar_url", sa.String(500), nullable=True),
        sa.Column("buyer_rating", sa.Float(), nullable=True, server_default="0.0"),
        sa.Column("seller_rating", sa.Float(), nullable=True, server_default="0.0"),
        sa.Column("buyer_rating_count", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("seller_rating_count", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("total_transactions", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("total_earned", sa.Float(), nullable=True, server_default="0.0"),
        sa.Column("total_spent", sa.Float(), nullable=True, server_default="0.0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_users_phone", "users", ["phone"])

    op.create_table(
        "listings",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("seller_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("waste_category", sa.String(50), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("unit", sa.String(20), nullable=False, server_default="pieces"),
        sa.Column("status", sa.String(20), nullable=True, server_default="available"),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("address", sa.String(500), nullable=True),
        sa.Column("images", JSON(), nullable=True),
        sa.Column("estimated_price", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_listings_seller_id", "listings", ["seller_id"])
    op.create_index("ix_listings_status", "listings", ["status"])

    op.create_table(
        "transactions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("listing_id", UUID(as_uuid=True), sa.ForeignKey("listings.id"), nullable=False),
        sa.Column("buyer_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("seller_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("agreed_price", sa.Float(), nullable=False),
        sa.Column("payment_status", sa.String(20), nullable=True, server_default="pending"),
        sa.Column("payment_intent_id", sa.String(255), nullable=True),
        sa.Column("status", sa.String(20), nullable=True, server_default="pending"),
        sa.Column("status_changed_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_transactions_listing_id", "transactions", ["listing_id"])
    op.create_index("ix_transactions_buyer_id", "transactions", ["buyer_id"])
    op.create_index("ix_transactions_seller_id", "transactions", ["seller_id"])
    op.create_index("ix_transactions_status", "transactions", ["status"])

    op.create_table(
        "ratings",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("transaction_id", UUID(as_uuid=True), sa.ForeignKey("transactions.id"), nullable=False),
        sa.Column("rater_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("rated_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("rating_type", sa.String(20), nullable=False),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_ratings_transaction_id", "ratings", ["transaction_id"])
    op.create_index("ix_ratings_rater_id", "ratings", ["rater_id"])
    op.create_index("ix_ratings_rated_id", "ratings", ["rated_id"])


def downgrade() -> None:
    op.drop_table("ratings")
    op.drop_table("transactions")
    op.drop_table("listings")
    op.drop_table("users")
