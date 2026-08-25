"""add bug_reports table

Revision ID: 20260823_bug_reports
Revises: 20260823_settings_notifications
Create Date: 2026-08-23 23:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20260823_bug_reports'
down_revision = '20260823_settings_notifications'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'bug_reports',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('category', sa.String(length=64), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('reproduction_steps', sa.Text(), nullable=True),
        sa.Column('expected_behavior', sa.Text(), nullable=True),
        sa.Column('actual_behavior', sa.Text(), nullable=True),
        sa.Column('priority', sa.String(length=32), server_default='MEDIUM', nullable=False),
        sa.Column('status', sa.String(length=32), server_default='OPEN', nullable=False),
        sa.Column('screenshot_url', sa.String(length=1024), nullable=True),
        sa.Column('environment_metadata', sa.JSON(), server_default='{}', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_bug_reports_user_id', 'bug_reports', ['user_id'])
    op.create_index('ix_bug_reports_user_status', 'bug_reports', ['user_id', 'status'])
    op.create_index('ix_bug_reports_priority', 'bug_reports', ['priority'])
    op.create_index('ix_bug_reports_created_at', 'bug_reports', ['created_at'])


def downgrade():
    op.drop_index('ix_bug_reports_created_at', table_name='bug_reports')
    op.drop_index('ix_bug_reports_priority', table_name='bug_reports')
    op.drop_index('ix_bug_reports_user_status', table_name='bug_reports')
    op.drop_index('ix_bug_reports_user_id', table_name='bug_reports')
    op.drop_table('bug_reports')
