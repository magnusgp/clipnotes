"""add insight_shares table"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.sqlite import JSON


revision = "202511070001"
down_revision = "202511030001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "insight_shares",
        sa.Column("token_hash", sa.String(length=128), primary_key=True),
        sa.Column("window", sa.String(length=8), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("last_accessed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "payload",
            JSON().with_variant(sa.JSON(), "postgresql"),
            nullable=False,
        ),
    )

    op.create_index("ix_insight_shares_window", "insight_shares", ["window"])


def downgrade() -> None:
    op.drop_index("ix_insight_shares_window", table_name="insight_shares")
    op.drop_table("insight_shares")
