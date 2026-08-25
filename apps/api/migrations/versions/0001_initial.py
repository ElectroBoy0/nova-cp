"""Initial schema — users and cf_handles tables.

Revision ID: 0001
Revises:
Create Date: 2026-07-03 UTC
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic
revision: str = "0001"
down_revision: str | None = None
branch_labels: str | tuple[str, ...] | None = None
depends_on: str | tuple[str, ...] | None = None


def upgrade() -> None:
    # ---- Enum types ----
    cf_rank_enum = sa.Enum(
        "newbie",
        "pupil",
        "specialist",
        "expert",
        "candidate_master",
        "master",
        "international_master",
        "grandmaster",
        "international_grandmaster",
        "legendary_grandmaster",
        name="cf_rank",
    )
    sync_status_enum = sa.Enum(
        "pending",
        "syncing",
        "completed",
        "failed",
        name="sync_status",
    )

    # ---- users table ----
    op.create_table(
        "users",
        sa.Column("id", sa.String(36), primary_key=True, nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("name", sa.String(255), nullable=True),
        sa.Column("image", sa.Text, nullable=True),
        sa.Column("provider", sa.String(50), nullable=False),
        sa.Column("provider_account_id", sa.String(255), nullable=False),
        sa.Column(
            "onboarding_completed",
            sa.Boolean,
            nullable=False,
            default=False,
            server_default=sa.false(),
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
        ),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index(
        "ix_users_provider_account",
        "users",
        ["provider", "provider_account_id"],
        unique=True,
    )

    # ---- cf_handles table ----
    op.create_table(
        "cf_handles",
        sa.Column("id", sa.String(36), primary_key=True, nullable=False),
        sa.Column("user_id", sa.String(36), nullable=False),
        sa.Column("handle", sa.String(100), nullable=False),
        sa.Column("rating", sa.Integer, nullable=True),
        sa.Column("max_rating", sa.Integer, nullable=True),
        sa.Column("rank", cf_rank_enum, nullable=True),
        sa.Column("max_rank", cf_rank_enum, nullable=True),
        sa.Column("sync_status", sync_status_enum, nullable=False, server_default="pending"),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("sync_error", sa.Text, nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_cf_handles_user_id", "cf_handles", ["user_id"], unique=True)
    op.create_index("ix_cf_handles_handle", "cf_handles", ["handle"])

    # ---- updated_at trigger (PostgreSQL) ----
    # Auto-update the updated_at column on every row update
    op.execute("""
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ language 'plpgsql';
    """)

    for table in ["users", "cf_handles"]:
        op.execute(f"""
            CREATE TRIGGER trigger_{table}_updated_at
            BEFORE UPDATE ON {table}
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        """)


def downgrade() -> None:
    # Drop triggers
    for table in ["users", "cf_handles"]:
        op.execute(f"DROP TRIGGER IF EXISTS trigger_{table}_updated_at ON {table};")

    op.execute("DROP FUNCTION IF EXISTS update_updated_at_column;")

    # Drop tables (cascade drops FKs and indexes)
    op.drop_table("cf_handles")
    op.drop_table("users")

    # Drop enum types
    sa.Enum(name="sync_status").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="cf_rank").drop(op.get_bind(), checkfirst=True)
