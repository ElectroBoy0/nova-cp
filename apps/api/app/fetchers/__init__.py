from __future__ import annotations

from app.fetchers.atcoder import AtCoderFetcher
from app.fetchers.base import BaseFetcher, ContestData, FetchError
from app.fetchers.codechef import CodeChefFetcher
from app.fetchers.codeforces import CodeforcesFetcher

__all__ = [
    "BaseFetcher",
    "ContestData",
    "FetchError",
    "get_all_fetchers",
]


def get_all_fetchers() -> list[BaseFetcher]:
    """
    Return one instance of every registered platform fetcher.

    This is the single registry point — the contest service calls
    this function and knows nothing about individual fetchers.

    To add a new platform:
      1. Create app/fetchers/<platform>.py
      2. Subclass BaseFetcher + implement fetch()
      3. Add MyPlatformFetcher() to the list below
    """
    return [
        CodeforcesFetcher(),
        CodeChefFetcher(),
        AtCoderFetcher(),
    ]
