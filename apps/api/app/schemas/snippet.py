from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class SnippetBase(BaseModel):
    title: str = Field(..., max_length=200)
    description: str | None = None
    language: str = Field(..., max_length=20)
    category: str = Field(..., max_length=50)
    code: str
    complexity: str | None = Field(None, max_length=100)
    usage_notes: str | None = None


class SnippetCreate(SnippetBase):
    pass


class SnippetUpdate(BaseModel):
    title: str | None = Field(None, max_length=200)
    description: str | None = None
    language: str | None = Field(None, max_length=20)
    category: str | None = Field(None, max_length=50)
    code: str | None = None
    complexity: str | None = Field(None, max_length=100)
    usage_notes: str | None = None


class SnippetRead(SnippetBase):
    id: str
    user_id: str | None = None
    is_official: bool
    is_favorited: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SnippetListResponse(BaseModel):
    items: list[SnippetRead]
    total: int
    limit: int
    offset: int
