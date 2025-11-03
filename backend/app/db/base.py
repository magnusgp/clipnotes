"""Shared SQLAlchemy declarative base for ClipNotes."""

from __future__ import annotations

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Declarative base used by migration metadata and ORM models."""

    pass
