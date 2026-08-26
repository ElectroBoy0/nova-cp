from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# -------------------------------------------------------
# Base Schema
# All schemas inherit from this for shared config.
# -------------------------------------------------------
class NovaCPBaseModel(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,  # Enable ORM mode for SQLAlchemy model → schema conversion
        populate_by_name=True,
    )


# -------------------------------------------------------
# User Schemas
# -------------------------------------------------------


class UserPreferencesSchema(NovaCPBaseModel):
    primary_language: str = "cpp"
    recommendation_mode: str = "challenge"  # "comfort" | "challenge" | "hardcore"
    daily_target_problems: int = 2
    preferred_topics: list[str] = Field(default_factory=list)
    editor_keybinding: str = "standard"  # "standard" | "vim"
    sound_effects: bool = True


class NotificationSettingsSchema(NovaCPBaseModel):
    contest_reminders: bool = True
    contest_lead_time_minutes: int = 60
    contest_platforms: list[str] = Field(default_factory=lambda: ["codeforces", "codechef", "atcoder"])
    streak_saver: bool = True
    streak_saver_time: str = "20:00"
    daily_mission_alert: bool = True
    sync_updates: bool = True
    recommendation_updates: bool = True
    weekly_digest: bool = True
    upsolve_reminders: bool = False


class UserCreate(NovaCPBaseModel):
    """
    Schema for creating a user record from an Auth.js session.
    Called by Next.js on first sign-in via the internal API.
    """

    email: EmailStr
    name: str | None = None
    image: str | None = None
    provider: str = Field(..., pattern="^(github|google)$")
    provider_account_id: str
    timezone: str = "UTC"
    custom_preferences: dict[str, Any] = Field(default_factory=dict)
    notification_settings: dict[str, Any] = Field(default_factory=dict)


class UserRead(NovaCPBaseModel):
    """Public user representation returned by the API."""

    id: str
    email: str
    name: str | None
    image: str | None
    provider: str
    timezone: str
    custom_preferences: dict[str, Any] = Field(default_factory=dict)
    notification_settings: dict[str, Any] = Field(default_factory=dict)
    onboarding_completed: bool
    created_at: datetime
    updated_at: datetime
    cf_handle: CFHandleRead | None = None


class UserUpdate(NovaCPBaseModel):
    """Fields a user can update on their own profile."""

    name: str | None = None
    image: str | None = None
    timezone: str | None = None
    custom_preferences: dict[str, Any] | None = None
    notification_settings: dict[str, Any] | None = None
    onboarding_completed: bool | None = None


class NotificationRead(NovaCPBaseModel):
    """Representation of an in-app notification."""

    id: str
    user_id: str
    type: str
    title: str
    message: str
    link: str | None = None
    is_read: bool
    created_at: datetime


class NotificationListResponse(NovaCPBaseModel):
    items: list[NotificationRead]
    total: int
    unread_count: int


# -------------------------------------------------------
# CFHandle Schemas
# -------------------------------------------------------


class CFHandleLinkRequest(NovaCPBaseModel):
    """Request body when a user links their CF handle."""

    handle: str = Field(..., min_length=1, max_length=100, pattern=r"^[a-zA-Z0-9_\-\.]+$")


class VerificationTokenResponse(NovaCPBaseModel):
    """Response containing the verification token for the user to set in their profile."""

    token: str
    handle: str
    expires_in_minutes: int


class CFHandleRead(NovaCPBaseModel):
    """CF handle representation embedded in UserRead."""

    id: str
    handle: str
    rating: int | None
    max_rating: int | None
    rank: str | None
    max_rank: str | None
    rating_history: list[Any] | None = None
    sync_status: str
    last_synced_at: datetime | None
    created_at: datetime


# -------------------------------------------------------
# Auth Payload Schema
# -------------------------------------------------------


class AuthPayload(NovaCPBaseModel):
    """
    Payload sent by Next.js when verifying/creating a user session.
    Next.js extracts this from the Auth.js JWT and forwards it to FastAPI.
    """

    user_id: str  # The Auth.js session user ID
    email: EmailStr
    name: str | None = None
    image: str | None = None
    provider: str
    timezone: str = "UTC"


# -------------------------------------------------------
# Analytics Schema
# -------------------------------------------------------


class UserAnalyticsRead(NovaCPBaseModel):
    """Analytics representation returned by the dashboard API."""

    user_id: str
    total_solved: int
    contest_count: int
    current_streak_days: int
    max_streak_days: int
    topic_mastery: dict = {}
    rating_distribution: dict = {}
    verdict_distribution: dict = {}
    recommended_problem: dict | None = None


# Update forward references
UserRead.model_rebuild()
