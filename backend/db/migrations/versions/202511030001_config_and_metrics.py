"""add config and request_counts tables"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.sqlite import JSON


revision = "202511030001"
down_revision = "202511010001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "config",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("hafnia_key_hash", sa.Text(), nullable=True),
        sa.Column("model_params", JSON().with_variant(sa.JSON(), "postgresql"), nullable=False),
        sa.Column("feature_flags", JSON().with_variant(sa.JSON(), "postgresql"), nullable=False),
        sa.Column("theme_overrides", JSON().with_variant(sa.JSON(), "postgresql"), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("updated_by", sa.String(length=128), nullable=True),
    )

    config_table = sa.table(
        "config",
        sa.column("id", sa.String(length=64)),
        sa.column("hafnia_key_hash", sa.Text()),
        sa.column("model_params", JSON().with_variant(sa.JSON(), "postgresql")),
        sa.column("feature_flags", JSON().with_variant(sa.JSON(), "postgresql")),
        sa.column("theme_overrides", JSON().with_variant(sa.JSON(), "postgresql")),
        sa.column("updated_at", sa.DateTime(timezone=True)),
        sa.column("updated_by", sa.String(length=128)),
    )

    op.bulk_insert(
        config_table,
        [
            {
                "id": "global",
                "hafnia_key_hash": None,
                "model_params": {},
                "feature_flags": {},
                "theme_overrides": None,
                "updated_by": None,
            }
        ],
    )

    op.create_table(
        "request_counts",
        sa.Column("date", sa.Date(), primary_key=True),
    sa.Column("requests", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )


def downgrade() -> None:
    op.drop_table("request_counts")
    op.drop_table("config")
