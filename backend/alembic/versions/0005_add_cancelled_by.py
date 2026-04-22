"""Add cancelled_by to conversations

Revision ID: 0005
Revises: 0004
Create Date: 2026-04-22
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


revision = '0005'
down_revision = '0004'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('conversations',
        sa.Column('cancelled_by', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True)
    )


def downgrade():
    op.drop_column('conversations', 'cancelled_by')
