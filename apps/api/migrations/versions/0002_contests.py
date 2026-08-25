"""Add contests table.

Revision ID: 0002
Revises: 0001
Create Date: 2026-07-12 UTC
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic
revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | tuple[str, ...] | None = None
depends_on: str | tuple[str, ...] | None = None


def upgrade() -> None:
    # ---- contests table ----
    op.create_table(
        "contests",
        sa.Column("id", sa.String(36), primary_key=True, nullable=False),
        sa.Column("platform", sa.String(50), nullable=False),
        sa.Column("platform_contest_id", sa.String(255), nullable=False),
        sa.Column("contest_name", sa.String(500), nullable=False),
        sa.Column("url", sa.Text, nullable=False),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("duration_seconds", sa.Integer, nullable=True),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("registration_open", sa.Boolean, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    # ---- Indexes ----
    op.create_index("ix_contests_platform", "contests", ["platform"])
    op.create_index("ix_contests_start_time", "contests", ["start_time"])
    op.create_index("ix_contests_status", "contests", ["status"])
    op.create_index(
        "ix_contests_platform_platform_contest_id",
        "contests",
        ["platform", "platform_contest_id"],
        unique=True,
    )

    # ---- updated_at trigger ----
    # Reuse the update_updated_at_column() function created in 0001.
    op.execute("""
        CREATE TRIGGER trigger_contests_updated_at
        BEFORE UPDATE ON contests
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trigger_contests_updated_at ON contests;")
    op.drop_table("contests")
