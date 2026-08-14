from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.user import UserRole


# ── Request schemas ───────────────────────────────────────────────

class UserCreate(BaseModel):
    """Payload for POST /api/auth/register."""

    name: str = Field(..., min_length=1, max_length=255, examples=["Jane Smith"])
    email: EmailStr = Field(..., examples=["jane@example.com"])
    password: str = Field(..., min_length=6, examples=["s3cur3pass"])

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("name must not be blank")
        return v.strip()


class UserLogin(BaseModel):
    """Payload for POST /api/auth/login."""

    email: EmailStr = Field(..., examples=["jane@example.com"])
    password: str = Field(..., min_length=1, examples=["s3cur3pass"])


# ── Response schemas ──────────────────────────────────────────────

class UserResponse(BaseModel):
    """Public user representation — never includes password_hash."""

    id: str
    name: str
    email: str
    role: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    """Response shape for POST /api/auth/login."""

    access_token: str
    token_type: Literal["bearer"] = "bearer"
    user: "UserInToken"


class UserInToken(BaseModel):
    """Minimal user object embedded in the login token response."""

    id: str
    name: str
    email: str
    role: str

    model_config = {"from_attributes": True}


# Resolve forward reference
TokenResponse.model_rebuild()
