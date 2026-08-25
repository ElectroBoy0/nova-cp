import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.services.notification_service import NotificationService


@pytest.mark.asyncio
async def test_user_settings_preferences_persistence(
    client: AsyncClient,
    internal_headers: dict[str, str],
    db_session: AsyncSession,
):
    # 1. Sync new user
    sync_payload = {
        "user_id": "oauth-settings-test-1",
        "email": "settings_tester@example.com",
        "name": "Original Name",
        "image": "https://example.com/avatar.png",
        "provider": "github",
        "timezone": "UTC",
    }
    sync_res = await client.post("/api/v1/users/sync", json=sync_payload, headers=internal_headers)
    assert sync_res.status_code == 200
    user_id = sync_res.json()["id"]

    # 2. Update settings: name, timezone, custom_preferences, notification_settings, onboarding_completed
    update_payload = {
        "name": "Customized Name",
        "timezone": "Asia/Tokyo",
        "onboarding_completed": True,
        "custom_preferences": {
            "primary_language": "rust",
            "recommendation_mode": "hardcore",
            "daily_target_problems": 3,
            "editor_keybinding": "vim",
            "sound_effects": False,
        },
        "notification_settings": {
            "contest_reminders": True,
            "contest_lead_time_minutes": 30,
            "contest_platforms": ["codeforces", "atcoder"],
            "streak_saver": False,
            "daily_mission_alert": True,
            "weekly_digest": False,
            "upsolve_reminders": True,
        },
    }

    patch_res = await client.patch(
        f"/api/v1/users/{user_id}/settings",
        json=update_payload,
        headers=internal_headers,
    )
    assert patch_res.status_code == 200
    data = patch_res.json()
    assert data["name"] == "Customized Name"
    assert data["timezone"] == "Asia/Tokyo"
    assert data["onboarding_completed"] is True
    assert data["custom_preferences"]["primary_language"] == "rust"
    assert data["custom_preferences"]["recommendation_mode"] == "hardcore"
    assert data["custom_preferences"]["daily_target_problems"] == 3
    assert data["custom_preferences"]["editor_keybinding"] == "vim"
    assert data["custom_preferences"]["sound_effects"] is False

    assert data["notification_settings"]["contest_reminders"] is True
    assert data["notification_settings"]["contest_lead_time_minutes"] == 30
    assert data["notification_settings"]["contest_platforms"] == ["codeforces", "atcoder"]
    assert data["notification_settings"]["streak_saver"] is False
    assert data["notification_settings"]["upsolve_reminders"] is True

    # 3. Verify persistence on subsequent GET
    get_res = await client.get(f"/api/v1/users/{user_id}", headers=internal_headers)
    assert get_res.status_code == 200
    get_data = get_res.json()
    assert get_data["name"] == "Customized Name"
    assert get_data["timezone"] == "Asia/Tokyo"
    assert get_data["onboarding_completed"] is True
    assert get_data["custom_preferences"]["primary_language"] == "rust"
    assert get_data["notification_settings"]["upsolve_reminders"] is True


@pytest.mark.asyncio
async def test_notification_creation_filtered_by_preferences(
    client: AsyncClient,
    internal_headers: dict[str, str],
    db_session: AsyncSession,
):
    # 1. Create a user with contest_reminders disabled and daily_mission_alert enabled
    user = User(
        email="notif_pref_user@example.com",
        name="Pref User",
        provider="google",
        provider_account_id="pref-acc-1",
        timezone="UTC",
        custom_preferences={},
        notification_settings={
            "contest_reminders": False,
            "daily_mission_alert": True,
        },
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    service = NotificationService(db_session)

    # 2. Try to create a contest_reminder notification -> should be skipped (None)
    contest_notif = await service.create_notification(
        user_id=str(user.id),
        type="contest_reminder",
        title="Contest starting soon",
        message="Codeforces Round 999 begins in 1 hour",
    )
    assert contest_notif is None

    # 3. Try to create a daily_mission notification -> should be created
    mission_notif = await service.create_notification(
        user_id=str(user.id),
        type="daily_mission",
        title="Daily Mission Ready",
        message="Today's problem: Watermelon",
        link="/dashboard",
    )
    assert mission_notif is not None
    assert mission_notif.type == "daily_mission"
    assert mission_notif.is_read is False


@pytest.mark.asyncio
async def test_notifications_api_lifecycle(
    client: AsyncClient,
    internal_headers: dict[str, str],
    db_session: AsyncSession,
):
    # 1. Create user
    user = User(
        email="lifecycle_user@example.com",
        name="Lifecycle User",
        provider="github",
        provider_account_id="lifecycle-acc-1",
        timezone="UTC",
        notification_settings={},
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    user_id = str(user.id)

    service = NotificationService(db_session)
    n1 = await service.create_notification(user_id, "daily_mission", "Mission 1", "Message 1")
    n2 = await service.create_notification(user_id, "sync_status", "Sync 1", "Message 2")
    n3 = await service.create_notification(user_id, "system", "Welcome", "Message 3")

    assert n1 is not None and n2 is not None and n3 is not None

    # 2. List notifications
    res = await client.get(f"/api/v1/users/{user_id}/notifications", headers=internal_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 3
    assert data["unread_count"] == 3
    assert len(data["items"]) == 3

    # 3. Mark single notification as read
    mark_res = await client.patch(
        f"/api/v1/users/{user_id}/notifications/{n1.id}/read",
        headers=internal_headers,
    )
    assert mark_res.status_code == 200

    # Verify unread count is now 2
    res2 = await client.get(f"/api/v1/users/{user_id}/notifications", headers=internal_headers)
    assert res2.json()["unread_count"] == 2

    # 4. Mark all as read
    read_all_res = await client.post(
        f"/api/v1/users/{user_id}/notifications/read-all",
        headers=internal_headers,
    )
    assert read_all_res.status_code == 200
    assert read_all_res.json()["marked_count"] == 2

    # Verify unread count is now 0
    res3 = await client.get(f"/api/v1/users/{user_id}/notifications", headers=internal_headers)
    assert res3.json()["unread_count"] == 0


@pytest.mark.asyncio
async def test_trigger_test_notification_and_csv_export(
    client: AsyncClient,
    internal_headers: dict[str, str],
    db_session: AsyncSession,
):
    user = User(
        email="export_test_user@example.com",
        name="Export User",
        provider="google",
        provider_account_id="export-acc-1",
        timezone="UTC",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    user_id = str(user.id)

    # 1. Trigger test alert
    test_res = await client.post(
        f"/api/v1/users/{user_id}/notifications/test",
        headers=internal_headers,
    )
    assert test_res.status_code == 200
    assert test_res.json()["status"] == "success"
    assert test_res.json()["created"] is True

    # 2. Test CSV export
    export_res = await client.get(
        f"/api/v1/users/{user_id}/export",
        headers=internal_headers,
    )
    assert export_res.status_code == 200
    assert "text/csv" in export_res.headers["content-type"]
    assert "Submission ID,Contest ID,Index,Problem Name,Rating,Tags,Solved Date (UTC)" in export_res.text
