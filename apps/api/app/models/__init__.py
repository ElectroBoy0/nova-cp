from __future__ import annotations

from app.models.analytics import UserAnalytics
from app.models.base import TimestampMixin, UUIDMixin
from app.models.bookmark import Bookmark, Collection, CollectionItem
from app.models.bug_report import BugReport
from app.models.contest import Contest
from app.models.daily_mission import DailyMission
from app.models.hint import ProblemHint
from app.models.hint_feedback import HintFeedback
from app.models.note import ProblemNote
from app.models.notification import Notification
from app.models.problem import Problem, RecommendationFeedback
from app.models.snippet import Snippet, SnippetFavorite
from app.models.submission import Submission
from app.models.upsolve import UpsolveItem
from app.models.user import CFHandle, User

__all__ = [
    "Contest",
    "User",
    "CFHandle",
    "UUIDMixin",
    "TimestampMixin",
    "Submission",
    "UserAnalytics",
    "Problem",
    "RecommendationFeedback",
    "ProblemHint",
    "HintFeedback",
    "UpsolveItem",
    "Bookmark",
    "Collection",
    "CollectionItem",
    "ProblemNote",
    "Snippet",
    "SnippetFavorite",
    "DailyMission",
    "Notification",
    "BugReport",
]
