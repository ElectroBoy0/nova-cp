"""optimize query performance indexes

Revision ID: 20260824_optimize_indexes
Revises: 20260823_bug_reports
Create Date: 2026-08-24 22:20:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260824_optimize_indexes'
down_revision = '20260823_bug_reports'
branch_labels = None
depends_on = None


def upgrade():
    # 1. Problems table query performance indexes
    op.create_index(
        'ix_problems_rating_contest',
        'problems',
        ['rating', 'contest_id'],
        unique=False,
        if_not_exists=True
    )
    op.create_index(
        'ix_problems_platform_rating',
        'problems',
        ['platform', 'rating'],
        unique=False,
        if_not_exists=True
    )

    # 2. Contests status & schedule index
    op.create_index(
        'ix_contests_status_start_time',
        'contests',
        ['status', 'start_time'],
        unique=False,
        if_not_exists=True
    )

    # 3. Bug reports by user & status
    op.create_index(
        'ix_bug_reports_user_status',
        'bug_reports',
        ['user_id', 'status'],
        unique=False,
        if_not_exists=True
    )

    # 4. Recommendation feedback lookup
    op.create_index(
        'ix_recommendation_feedback_user_problem',
        'recommendation_feedback',
        ['user_id', 'problem_id'],
        unique=False,
        if_not_exists=True
    )


def downgrade():
    op.drop_index('ix_recommendation_feedback_user_problem', table_name='recommendation_feedback', if_exists=True)
    op.drop_index('ix_bug_reports_user_status', table_name='bug_reports', if_exists=True)
    op.drop_index('ix_contests_status_start_time', table_name='contests', if_exists=True)
    op.drop_index('ix_problems_platform_rating', table_name='problems', if_exists=True)
    op.drop_index('ix_problems_rating_contest', table_name='problems', if_exists=True)
