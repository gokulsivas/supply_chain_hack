import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User, UserRole
from app.schemas.auth import TokenResponse, UserCreate, UserInToken, UserLogin, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])


# ── POST /auth/register ───────────────────────────────────────────

@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
def register(payload: UserCreate, db: Session = Depends(get_db)) -> User:
    """
    Create a new user account.

    - Role is always defaulted to ``PROCUREMENT_USER`` (cannot be set by the caller).
    - Duplicate email returns **409 Conflict**.
    """
    # Check for duplicate email before attempting insert (cheaper than catching IntegrityError)
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    user = User(
        id=str(uuid.uuid4()),
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=UserRole.PROCUREMENT_USER,
    )
    db.add(user)
    try:
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    return user


# ── POST /auth/login ──────────────────────────────────────────────

@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Obtain a bearer token",
)
def login(payload: UserLogin, db: Session = Depends(get_db)) -> TokenResponse:
    """
    Authenticate with email + password and return a JWT.

    Response shape:
    ```json
    {
      "access_token": "<jwt>",
      "token_type": "bearer",
      "user": { "id": "...", "name": "...", "email": "...", "role": "..." }
    }
    ```

    Invalid credentials return **401 Unauthorized**.
    """
    user = db.query(User).filter(User.email == payload.email).first()

    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(
        subject=user.id,
        extra_claims={"role": user.role, "email": user.email},
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserInToken(
            id=user.id,
            name=user.name,
            email=user.email,
            role=user.role,
        ),
    )


# ── GET /auth/me ──────────────────────────────────────────────────

@router.get(
    "/me",
    response_model=UserResponse,
    summary="Return the authenticated user",
)
def me(current_user: User = Depends(get_current_user)) -> User:
    """Return the profile of the currently authenticated user."""
    return current_user
