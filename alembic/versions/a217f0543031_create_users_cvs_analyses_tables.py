"""create users cvs analyses tables

Revision ID: a217f0543031
Revises:
Create Date: 2026-04-05 16:09:11.904921

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'a217f0543031'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("email", sa.String(255), unique=True, nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )

    op.create_table(
        "cvs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False),
        sa.Column("raw_text", sa.Text, nullable=False),
        sa.Column("profile", postgresql.JSONB, nullable=False),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )

    op.create_table(
        "analyses",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("job_description", sa.Text, nullable=False),
        sa.Column("job_profile", postgresql.JSONB, nullable=False),
        sa.Column("alignment", postgresql.JSONB, nullable=False),
        sa.Column("cv_suggestions", postgresql.JSONB, nullable=False),
        sa.Column("cover_letter", sa.Text, nullable=False),
        sa.Column("scorer_output", postgresql.JSONB, nullable=False),
        sa.Column("cv_changed", sa.Boolean, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )

    op.create_index("idx_analyses_user_created", "analyses", ["user_id", sa.text("created_at DESC")])


def downgrade() -> None:
    op.drop_index("idx_analyses_user_created", table_name="analyses")
    op.drop_table("analyses")
    op.drop_table("cvs")
    op.drop_table("users")
