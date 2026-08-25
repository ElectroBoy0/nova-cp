from .base import AIProvider
from .gemini import GeminiProvider


def get_ai_provider() -> AIProvider:
    """Factory to return the configured AI Provider."""
    # We can easily swap to OpenAIProvider or AnthropicProvider here later
    return GeminiProvider()
