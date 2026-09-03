from __future__ import annotations

import logging
import re
from typing import Any
from bs4 import BeautifulSoup
from curl_cffi import requests

logger = logging.getLogger(__name__)

LANGUAGE_TO_CF_ID: dict[str, int] = {
    "cpp": 89,       # GNU G++20 13.2 (64 bit, winlibs)
    "cpp20": 89,
    "cpp17": 54,     # GNU G++17 7.3.0
    "c++": 89,
    "python": 70,    # PyPy 3.10 (7.3.15, 64bit)
    "python3": 31,   # Python 3.8.10
    "pypy": 70,
    "java": 87,      # Java 21 64bit
    "rust": 75,      # Rust 1.75.0 (2021)
    "go": 32,        # Go 1.22.2
}


def parse_cookie_string(cookie_str: str) -> dict[str, str]:
    """Parse raw cookie header string into key-value dictionary."""
    cookies: dict[str, str] = {}
    if not cookie_str:
        return cookies

    parts = cookie_str.strip().split(";")
    for part in parts:
        if "=" in part:
            k, v = part.strip().split("=", 1)
            cookies[k.strip()] = v.strip()
    return cookies


class CodeforcesSubmitService:
    @classmethod
    async def submit_solution(
        cls,
        contest_id: int | str,
        problem_index: str,
        code: str,
        language: str = "cpp",
        session_cookie: str | None = None,
    ) -> dict[str, Any]:
        """
        Submits code to Codeforces via curl_cffi using user's authenticated session cookies.
        """
        if not session_cookie:
            raise ValueError(
                "Codeforces session cookie required for automated submission. "
                "Please configure your JSESSIONID and 39ce7 cookie in settings."
            )

        cookies = parse_cookie_string(session_cookie)
        if not cookies.get("JSESSIONID") and not cookies.get("39ce7"):
            raise ValueError("Invalid session cookie. JSESSIONID or 39ce7 is required.")

        cf_lang_id = LANGUAGE_TO_CF_ID.get(language.lower().strip(), 89)

        # 1. Fetch submit page to extract CSRF token
        submit_url = f"https://codeforces.com/contest/{contest_id}/submit"
        session = requests.Session(impersonate="chrome120")
        session.cookies.update(cookies)

        try:
            get_resp = session.get(submit_url, timeout=12)
            if get_resp.status_code != 200:
                raise ValueError(
                    f"Codeforces submit page returned status {get_resp.status_code}. "
                    "Your session cookie may have expired."
                )

            soup = BeautifulSoup(get_resp.text, "html.parser")

            # Check if user is logged in
            enter_link = soup.find("a", href=re.compile(r"/enter(\?.*)?$"))
            if enter_link and "Enter" in enter_link.text:
                raise ValueError(
                    "Codeforces session cookie has expired or is invalid. "
                    "Please update your Codeforces cookie in Settings."
                )

            # Extract CSRF token
            csrf_token = None
            csrf_span = soup.find("span", class_="csrf-token")
            if csrf_span and csrf_span.get("data-csrf"):
                csrf_token = csrf_span["data-csrf"]
            else:
                csrf_input = soup.find("input", {"name": "csrf_token"})
                if csrf_input and csrf_input.get("value"):
                    csrf_token = csrf_input["value"]

            if not csrf_token:
                raise ValueError("Could not extract Codeforces CSRF token from submit form.")

            # 2. POST submission
            post_url = f"https://codeforces.com/contest/{contest_id}/submit?csrf_token={csrf_token}"
            payload = {
                "csrf_token": csrf_token,
                "action": "submitSolutionFormSubmitted",
                "submittedProblemIndex": problem_index.upper().strip(),
                "programTypeId": str(cf_lang_id),
                "source": code,
                "tabSize": "4",
                "_tta": "176",
            }

            post_resp = session.post(
                post_url,
                data=payload,
                headers={"Referer": submit_url},
                timeout=20,
            )

            post_soup = BeautifulSoup(post_resp.text, "html.parser")
            error_box = post_soup.find("span", class_="error for__source") or post_soup.find("div", class_="error")
            if error_box and error_box.text.strip():
                error_text = error_box.text.strip()
                # Codeforces anti-spam duplicate filter check
                if "submitted exactly the same code before" in error_text.lower():
                    import random
                    import time

                    nonce = f"{int(time.time())}_{random.randint(100, 999)}"
                    is_py = str(language).lower() in ("python", "python3", "pypy")
                    modified_code = code.rstrip() + (f"\n# [NovaCP {nonce}]\n" if is_py else f"\n// [NovaCP {nonce}]\n")
                    payload["source"] = modified_code

                    retry_resp = session.post(
                        post_url,
                        data=payload,
                        headers={"Referer": submit_url},
                        timeout=20,
                    )
                    retry_soup = BeautifulSoup(retry_resp.text, "html.parser")
                    retry_error = retry_soup.find("span", class_="error for__source") or retry_soup.find("div", class_="error")
                    if not retry_error or not retry_error.text.strip():
                        return {
                            "status": "submitted",
                            "message": f"Successfully submitted problem {contest_id}{problem_index.upper()} to Codeforces!",
                            "contest_id": str(contest_id),
                            "index": problem_index.upper(),
                            "language_id": cf_lang_id,
                        }
                    error_text = retry_error.text.strip()

                raise ValueError(f"Codeforces error: {error_text}")

            return {
                "status": "submitted",
                "message": f"Successfully submitted problem {contest_id}{problem_index.upper()} to Codeforces!",
                "contest_id": str(contest_id),
                "index": problem_index.upper(),
                "language_id": cf_lang_id,
            }

        except ValueError:
            raise
        except Exception as e:
            logger.exception("Codeforces direct submission failed: %s", e)
            raise ValueError(f"Direct Codeforces submission failed: {str(e)}") from e
