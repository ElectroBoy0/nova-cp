from __future__ import annotations

import logging
import re
from datetime import UTC, datetime
from html.parser import HTMLParser

from app.fetchers.base import BaseFetcher, ContestData, FetchError

logger = logging.getLogger(__name__)

# AtCoder contest list page — no public JSON API exists
_AC_CONTESTS_URL = "https://atcoder.jp/contests/"

# AtCoder also provides a JSON API for upcoming + active contests (unofficial but stable)
_AC_JSON_URL = "https://atcoder.jp/contests/json"


def _ac_status(start: datetime, end: datetime | None) -> str:
    now = datetime.now(tz=UTC)
    if end and now > end:
        return "finished"
    if now >= start:
        return "running"
    return "upcoming"


def _parse_duration(duration_str: str) -> int | None:
    """
    Parse AtCoder duration strings like "01:40" (HH:MM) into seconds.
    """
    if not duration_str:
        return None
    try:
        parts = duration_str.strip().split(":")
        if len(parts) == 2:  # noqa: PLR2004
            return int(parts[0]) * 3600 + int(parts[1]) * 60
        if len(parts) == 3:  # noqa: PLR2004
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
        return None
    except (ValueError, IndexError):
        return None


class _AtCoderTableParser(HTMLParser):
    """
    Minimal HTML parser that extracts contest rows from the
    AtCoder contests page table.

    The page has three tables with id="contest-table-upcoming",
    "contest-table-recent", and "contest-table-permanent".
    We only parse upcoming and recent (finished) contests.
    """

    def __init__(self) -> None:
        super().__init__()
        self._in_target_table = False
        self._in_tbody = False
        self._in_row = False
        self._in_cell = False
        self._cell_index = 0
        self._current_row: list[str] = []
        self._current_href: str = ""
        self.rows: list[dict] = []  # Parsed contest rows
        self._target_ids = {"contest-table-upcoming", "contest-table-recent"}
        self._current_table_id: str = ""

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr_dict = dict(attrs)

        if tag == "div":
            div_id = attr_dict.get("id", "")
            if div_id in self._target_ids:
                self._in_target_table = True
                self._current_table_id = div_id

        if not self._in_target_table:
            return

        if tag == "tbody":
            self._in_tbody = True
        elif tag == "tr" and self._in_tbody:
            self._in_row = True
            self._current_row = []
            self._cell_index = 0
        elif tag == "td" and self._in_row:
            self._in_cell = True
        elif tag == "a" and self._in_cell:
            self._current_href = attr_dict.get("href", "")

    def handle_endtag(self, tag: str) -> None:
        if tag == "div" and self._in_target_table:
            self._in_target_table = False

        if not self._in_target_table:
            return

        if tag == "tbody":
            self._in_tbody = False
        elif tag == "tr" and self._in_row:
            self._in_row = False
            if len(self._current_row) >= 4:  # noqa: PLR2004
                self.rows.append(
                    {
                        "start": self._current_row[0],
                        "name": self._current_row[1],
                        "duration": self._current_row[2],
                        "rated": self._current_row[3],
                        "url": self._current_href,
                        "table_id": self._current_table_id,
                    }
                )
        elif tag == "td" and self._in_cell:
            self._in_cell = False
            self._cell_index += 1

    def handle_data(self, data: str) -> None:
        if self._in_cell:
            stripped = data.strip()
            if stripped:
                if self._cell_index < len(self._current_row):
                    self._current_row[self._cell_index] += " " + stripped
                else:
                    self._current_row.append(stripped)


def _parse_ac_datetime(dt_str: str) -> datetime | None:
    """
    Parse AtCoder datetime strings.
    Typical format: "2024-12-14 21:00:00+0900"
    """
    dt_str = dt_str.strip()
    # Normalise "+0900" → "+09:00" for fromisoformat compatibility
    dt_str = re.sub(r"([+-])(\d{2})(\d{2})$", r"\1\2:\3", dt_str)
    try:
        dt = datetime.fromisoformat(dt_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=UTC)
        return dt.astimezone(UTC)
    except ValueError:
        return None


class AtCoderFetcher(BaseFetcher):
    """
    Fetches contests from the AtCoder contests page by parsing HTML.

    AtCoder has no public JSON API for their full contest list.
    The parser targets <div id="contest-table-upcoming"> and
    <div id="contest-table-recent"> tables.

    If the page structure changes this fetcher fails gracefully.
    """

    PLATFORM = "atcoder"

    async def fetch(self) -> list[ContestData]:
        logger.info("[atcoder] Starting contest fetch")
        try:
            async with self._make_client() as client:
                response = await client.get(_AC_CONTESTS_URL)
                response.raise_for_status()
                html = response.text
        except Exception as exc:
            raise FetchError("atcoder", str(exc)) from exc

        parser = _AtCoderTableParser()
        try:
            parser.feed(html)
        except Exception as exc:
            raise FetchError("atcoder", f"HTML parse error: {exc}") from exc

        contests: list[ContestData] = []
        for row in parser.rows:
            parsed = self._parse_row(row)
            if parsed is not None:
                contests.append(parsed)

        logger.info("[atcoder] Fetched %d contests", len(contests))
        return contests

    def _parse_row(self, row: dict) -> ContestData | None:
        try:
            url_path = row.get("url", "")
            if not url_path:
                return None

            # Extract contest slug from URL path e.g. "/contests/abc380"
            slug = url_path.rstrip("/").rsplit("/", 1)[-1]
            if not slug:
                return None

            full_url = f"https://atcoder.jp{url_path}"
            name = row.get("name", "").strip()
            if not name:
                return None

            start_time = _parse_ac_datetime(row.get("start", ""))
            if start_time is None:
                return None

            duration_seconds = _parse_duration(row.get("duration", ""))
            end_time = None
            if start_time and duration_seconds:
                from datetime import timedelta

                end_time = start_time + timedelta(seconds=duration_seconds)

            status = _ac_status(start_time, end_time)

            return ContestData(
                platform="atcoder",
                platform_contest_id=slug,
                contest_name=name,
                url=full_url,
                start_time=start_time,
                duration_seconds=duration_seconds,
                status=status,
                registration_open=None,  # Not available on the list page
            )
        except Exception as exc:
            logger.warning("Skipping malformed AtCoder row %s: %s", row.get("url"), exc)
            return None
