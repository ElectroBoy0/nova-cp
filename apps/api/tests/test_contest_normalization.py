from __future__ import annotations

"""
Unit tests for platform-specific normalisation logic.

These tests are PURE — no database, no HTTP, no async needed.
They test the parsing helper functions directly.
"""

import os

os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/1")
os.environ.setdefault("INTERNAL_API_KEY", "test-key")



from app.fetchers.atcoder import _parse_ac_datetime
from app.fetchers.atcoder import _parse_duration as ac_parse_duration
from app.fetchers.codechef import _cc_status
from app.fetchers.codechef import _parse_contest as cc_parse_contest
from app.fetchers.codechef import _parse_datetime as cc_parse_datetime
from app.fetchers.codechef import _parse_duration as cc_parse_duration
from app.fetchers.codeforces import _cf_status
from app.fetchers.codeforces import _parse_contest as cf_parse_contest

# -------------------------------------------------------
# Codeforces normalisation
# -------------------------------------------------------


class TestCodeforcesParsing:
    def test_phase_before_maps_to_upcoming(self):
        assert _cf_status("BEFORE", 0) == "upcoming"

    def test_phase_coding_maps_to_running(self):
        assert _cf_status("CODING", 0) == "running"

    def test_phase_finished_maps_to_finished(self):
        assert _cf_status("FINISHED", 0) == "finished"

    def test_phase_system_test_maps_to_finished(self):
        assert _cf_status("SYSTEM_TEST", 0) == "finished"

    def test_phase_pending_maps_to_finished(self):
        assert _cf_status("PENDING_SYSTEM_TEST", 0) == "finished"

    def test_parse_valid_contest(self):
        raw = {
            "id": 1234,
            "name": "Codeforces Round 999",
            "phase": "BEFORE",
            "startTimeSeconds": 1700000000,
            "durationSeconds": 7200,
        }
        result = cf_parse_contest(raw)
        assert result is not None
        assert result.platform == "codeforces"
        assert result.platform_contest_id == "1234"
        assert result.contest_name == "Codeforces Round 999"
        assert result.status == "upcoming"
        assert result.duration_seconds == 7200
        assert result.registration_open is True
        assert result.url == "https://codeforces.com/contest/1234"
        assert result.start_time.tzinfo is not None

    def test_parse_running_contest_registration_closed(self):
        raw = {
            "id": 999,
            "name": "Running Contest",
            "phase": "CODING",
            "startTimeSeconds": 1700000000,
            "durationSeconds": 3600,
        }
        result = cf_parse_contest(raw)
        assert result is not None
        assert result.registration_open is False
        assert result.status == "running"

    def test_parse_finished_contest_registration_none(self):
        raw = {
            "id": 100,
            "name": "Old Contest",
            "phase": "FINISHED",
            "startTimeSeconds": 1600000000,
            "durationSeconds": 7200,
        }
        result = cf_parse_contest(raw)
        assert result is not None
        assert result.registration_open is None
        assert result.status == "finished"

    def test_parse_missing_id_returns_none(self):
        raw = {
            "name": "No ID",
            "phase": "BEFORE",
            "startTimeSeconds": 1700000000,
            "durationSeconds": 7200,
        }
        result = cf_parse_contest(raw)
        assert result is None

    def test_parse_missing_start_time_returns_none(self):
        raw = {
            "id": 999,
            "name": "No Time",
            "phase": "BEFORE",
            "durationSeconds": 7200,
        }
        result = cf_parse_contest(raw)
        assert result is None


# -------------------------------------------------------
# CodeChef normalisation
# -------------------------------------------------------


class TestCodeChefParsing:
    def test_status_upcoming(self):
        assert _cc_status("upcoming") == "upcoming"

    def test_status_present_maps_to_running(self):
        assert _cc_status("present") == "running"

    def test_status_running(self):
        assert _cc_status("running") == "running"

    def test_status_past_maps_to_finished(self):
        assert _cc_status("past") == "finished"

    def test_parse_valid_datetime(self):
        dt = cc_parse_datetime("2024-12-21T14:30:00+05:30")
        assert dt is not None
        assert dt.tzinfo is not None
        # Should be converted to UTC: 14:30 IST = 09:00 UTC
        assert dt.hour == 9
        assert dt.minute == 0

    def test_parse_empty_datetime_returns_none(self):
        assert cc_parse_datetime("") is None

    def test_parse_duration_hhmm(self):
        assert cc_parse_duration("02:30:00") == 9000

    def test_parse_duration_with_days(self):
        assert cc_parse_duration("2 Days, 00:00:00") == 2 * 86400

    def test_parse_duration_empty_returns_none(self):
        assert cc_parse_duration("") is None

    def test_parse_valid_contest(self):
        raw = {
            "contest_code": "START180",
            "contest_name": "Starters 180",
            "contest_status": "upcoming",
            "contest_start_date_iso": "2024-12-21T14:30:00+05:30",
            "contest_duration": "03:00:00",
        }
        result = cc_parse_contest(raw)
        assert result is not None
        assert result.platform == "codechef"
        assert result.platform_contest_id == "START180"
        assert result.status == "upcoming"
        assert result.url == "https://www.codechef.com/START180"
        assert result.duration_seconds == 10800

    def test_parse_missing_code_returns_none(self):
        raw = {
            "contest_name": "No Code",
            "contest_status": "upcoming",
            "contest_start_date_iso": "2024-12-21T14:30:00+05:30",
        }
        assert cc_parse_contest(raw) is None

    def test_parse_missing_start_returns_none(self):
        raw = {
            "contest_code": "X",
            "contest_name": "No Start",
            "contest_status": "upcoming",
        }
        assert cc_parse_contest(raw) is None


# -------------------------------------------------------
# AtCoder normalisation
# -------------------------------------------------------


class TestAtCoderParsing:
    def test_parse_datetime_with_offset(self):
        dt = _parse_ac_datetime("2024-12-14 21:00:00+0900")
        assert dt is not None
        assert dt.tzinfo is not None
        # 21:00 JST = 12:00 UTC
        assert dt.hour == 12
        assert dt.minute == 0

    def test_parse_duration_hhmm(self):
        assert ac_parse_duration("01:40") == 6000  # 1h 40m

    def test_parse_duration_hhmmss(self):
        assert ac_parse_duration("02:30:00") == 9000

    def test_parse_duration_empty_returns_none(self):
        assert ac_parse_duration("") is None

    def test_parse_duration_invalid_returns_none(self):
        assert ac_parse_duration("not-a-time") is None
