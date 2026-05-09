"""Add weight pricing to listings and business profile to users

Revision ID: 0008
Revises: 0007
Create Date: 2026-05-09
"""
from alembic import op
import sqlalchemy as sa

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Listings: weight-based pricing fields
    op.add_column("listings", sa.Column("quantity_kg",   sa.Float(), nullable=True))
    op.add_column("listings", sa.Column("price_per_kg",  sa.Float(), nullable=True))

    # Users: business profile fields
    op.add_column("users", sa.Column("business_name", sa.String(255), nullable=True))
    op.add_column("users", sa.Column("business_type", sa.String(50),  nullable=True))
    op.add_column("users", sa.Column("is_verified",   sa.Boolean(),   nullable=False, server_default="false"))


def downgrade() -> None:
    op.drop_column("listings", "quantity_kg")
    op.drop_column("listings", "price_per_kg")
    op.drop_column("users", "business_name")
    op.drop_column("users", "business_type")
    op.drop_column("users", "is_verified")
