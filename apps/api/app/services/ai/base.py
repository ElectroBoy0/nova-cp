from abc import ABC, abstractmethod


class AIProvider(ABC):
    """Abstract base class for AI providers."""

    @abstractmethod
    async def generate(self, prompt: str, system_prompt: str) -> str:
        """Send a prompt to the AI and return the text response."""
        pass
