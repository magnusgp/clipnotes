"""create reasoning_history table"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "202511010001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "reasoning_history",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("clip_selection_hash", sa.String(length=128), nullable=False),
        sa.Column("clip_ids", sa.JSON(), nullable=False),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("answer", sa.JSON(), nullable=False),
        sa.Column(
            "answer_type",
            sa.String(length=32),
            nullable=False,
            server_default=sa.text("'chat'"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_reasoning_history_selection",
        "reasoning_history",
        ["clip_selection_hash", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_reasoning_history_selection", table_name="reasoning_history")
    op.drop_table("reasoning_history")
