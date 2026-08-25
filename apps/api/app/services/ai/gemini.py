import asyncio
import logging

from google import genai
from google.genai import types
from google.genai.errors import APIError

from app.config import settings

from .base import AIProvider

logger = logging.getLogger(__name__)

class GeminiProvider(AIProvider):
    def __init__(self):
        if not settings.GEMINI_API_KEY:
            logger.warning("GEMINI_API_KEY is not set. GeminiProvider will fail if called.")
            self.client = None
        else:
            self.client = genai.Client(api_key=settings.GEMINI_API_KEY)

        self.model = getattr(settings, "GEMINI_MODEL", "gemini-2.0-flash")

    async def generate(self, prompt: str, system_prompt: str) -> str:
        if not self.client:
            return "AI hints are currently disabled (missing configuration). Please try again later."

        try:
            # We use an async loop to avoid blocking FastAPI
            asyncio.get_running_loop()

            # genai.Client has both sync and async capabilities, but for simple use cases
            # we can run the sync version in an executor if the async version is tricky.
            # However, google-genai 1.0.0 supports asyncio via client.aio.models.generate_content
            response = await self.client.aio.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    temperature=0.2, # Low temp for more deterministic hints
                ),
            )
            return response.text
        except APIError as e:
            logger.error(f"Gemini API Error: {e}")
            return "I'm having trouble generating a hint right now. Please try again later."
        except Exception as e:
            logger.error(f"Unexpected error in Gemini generation: {e}")
            return "An unexpected error occurred while generating the hint."
