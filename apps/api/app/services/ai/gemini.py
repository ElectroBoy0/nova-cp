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
            response = await self.client.aio.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    temperature=0.2,  # Low temp for deterministic hints
                ),
            )
            return response.text
        except Exception as e:
            logger.warning(f"Primary Gemini model {self.model} failed: {e}. Attempting fallback to gemini-2.0-flash...")
            try:
                # Fallback to standard flash model if thinking model encounters quota/error
                response = await self.client.aio.models.generate_content(
                    model="gemini-2.0-flash",
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=system_prompt,
                        temperature=0.2,
                    ),
                )
                return response.text
            except Exception as fallback_err:
                logger.error(f"Gemini fallback also failed: {fallback_err}")
                return "I'm having trouble generating a hint right now. Please try again later."
