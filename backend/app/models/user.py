import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class UserRole:
    ADMIN = "ADMIN"
    PROCUREMENT_USER = "PROCUREMENT_USER"
    LOGISTICS_USER = "LOGISTICS_USER"
    FINANCE_USER = "FINANCE_USER"
    WAREHOUSE_OPERATOR = "WAREHOUSE_OPERATOR"

    ALL = [ADMIN, PROCUREMENT_USER, LOGISTICS_USER, FINANCE_USER, WAREHOUSE_OPERATOR]


class User(Base):
    """Application user stored in the ``users`` table."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(
        String(320),
        unique=True,
        index=True,
        nullable=False,
    )
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default=UserRole.PROCUREMENT_USER,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<User id={self.id!r} email={self.email!r} role={self.role!r}>"
