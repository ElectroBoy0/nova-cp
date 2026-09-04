import logging
from typing import Any
from curl_cffi import requests
from bs4 import BeautifulSoup, Tag

logger = logging.getLogger(__name__)

# In-memory cache for fast repeated statement lookups
_STATEMENT_CACHE: dict[str, dict[str, Any]] = {}


def _clean_cf_html(element: Tag | None) -> str:
    """
    Cleans Codeforces statement HTML, converting custom tex-font-* spans into
    standard semantic HTML (em, strong, code) while preserving paragraphs, lists, and TeX math delimiters.
    """
    if not element:
        return ""

    import re

    # Decompose section title
    for title in element.find_all("div", class_="section-title"):
        title.decompose()

    # Convert font style classes to semantic HTML
    for it in element.find_all("span", class_="tex-font-style-it"):
        it.name = "em"
    for bf in element.find_all("span", class_="tex-font-style-bf"):
        bf.name = "strong"
    for tt in element.find_all("span", class_="tex-font-style-tt"):
        tt.name = "code"

    # Normalize image URLs to resilient, unblocked HTTPS mirrors
    for img in element.find_all("img"):
        src = img.get("src", "")
        if not src:
            continue

        if "archive.org/web/" in src:
            # Preserve working archive mirror, upgrading http to secure https to prevent mixed content blocking
            if src.startswith("http://"):
                src = "https://" + src[7:]
            img["src"] = src
        elif "espresso.codeforces.com" in src or "codeforces.com" in src:
            # Direct Codeforces / espresso images block cross-origin requests with Cloudflare Turnstile 403.
            # Route through the Web Archive mirror which serves the assets with CORS headers.
            clean_cf_url = src
            if clean_cf_url.startswith("//"):
                clean_cf_url = f"https:{clean_cf_url}"
            elif clean_cf_url.startswith("/"):
                clean_cf_url = f"https://codeforces.com{clean_cf_url}"
            img["src"] = f"https://web.archive.org/web/2/{clean_cf_url}"
        elif src.startswith("//"):
            img["src"] = f"https:{src}"
        elif src.startswith("/"):
            img["src"] = f"https://web.archive.org/web/2/https://codeforces.com{src}"

        # Add resilient display attributes
        img["loading"] = "lazy"
        img["referrerpolicy"] = "no-referrer"

    # Clean inner HTML
    return "".join(str(c) for c in element.children).strip()


class CodeforcesStatementService:
    @classmethod
    async def get_statement(
        cls,
        contest_id: int | str,
        index: str,
        session_cookie: str | None = None,
        problem_name: str | None = None,
    ) -> dict[str, Any]:
        cache_key = f"{contest_id}_{index.upper()}"
        if cache_key in _STATEMENT_CACHE:
            return _STATEMENT_CACHE[cache_key]

        # Check persistent Redis cache
        try:
            import json
            from app.redis import redis_client
            cached_str = await redis_client.get(f"stmt:{cache_key}")
            if cached_str:
                data = json.loads(cached_str)
                _STATEMENT_CACHE[cache_key] = data
                return data
        except Exception as redis_err:
            logger.debug("Redis statement cache miss/error: %s", redis_err)

        # Attempt fetching statement from Codeforces with fallback mirrors and 12s timeout
        urls = [
            f"https://codeforces.com/problemset/problem/{contest_id}/{index}",
            f"https://codeforces.com/contest/{contest_id}/problem/{index}",
        ]

        headers = {
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": "https://codeforces.com/",
        }
        if session_cookie:
            headers["Cookie"] = session_cookie

        import asyncio

        def _do_fetch():
            # 1. Attempt direct fetch from Codeforces with browser impersonation and session cookie
            for url in urls:
                try:
                    r = requests.get(url, headers=headers, impersonate="chrome120", timeout=2.5)
                    if r.status_code == 200:
                        soup = BeautifulSoup(r.text, "html.parser")
                        stmt = soup.find("div", class_="problem-statement")
                        if stmt:
                            parsed = cls._parse_statement_soup(stmt, contest_id, index)
                            return parsed
                    elif r.status_code == 403:
                        # Cloudflare Bot Challenge (403) detected on datacenter IP; immediately use archive mirror
                        logger.debug("Codeforces Cloudflare challenge (403) on %s, switching to archive fallback", url)
                        break
                except Exception as e:
                    logger.debug("Failed direct fetch for %s: %s", url, e)

            # 2. Secondary fallback: Web Archive mirror for public problemset problems
            canonical_cf_url = f"https://codeforces.com/problemset/problem/{contest_id}/{index}"
            try:
                api_url = f"https://archive.org/wayback/available?url={canonical_cf_url}"
                res = requests.get(api_url, timeout=2.5)
                if res.status_code == 200:
                    data = res.json()
                    snap = data.get("archived_snapshots", {}).get("closest")
                    if snap and snap.get("available") and snap.get("url"):
                        snap_url = snap["url"]
                        snap_resp = requests.get(snap_url, timeout=4.0)
                        if snap_resp.status_code == 200:
                            soup = BeautifulSoup(snap_resp.text, "html.parser")
                            stmt = soup.find("div", class_="problem-statement")
                            if stmt:
                                parsed = cls._parse_statement_soup(stmt, contest_id, index)
                                if parsed:
                                    logger.info(
                                        "Successfully fetched statement for %s%s from web archive mirror",
                                        contest_id,
                                        index,
                                    )
                                    return parsed
            except Exception as arc_err:
                logger.debug("Archive fetch error for %s: %s", canonical_cf_url, arc_err)

            return None

        try:
            parsed = await asyncio.wait_for(asyncio.to_thread(_do_fetch), timeout=4.5)
        except asyncio.TimeoutError:
            logger.info(
                "Statement fetch exceeded 4.5s for %s%s; continuing in background",
                contest_id,
                index,
            )
            parsed = None
            asyncio.create_task(cls._bg_fetch_and_cache(contest_id, index, session_cookie))

        if parsed:
            parsed["is_fallback"] = False
            parsed["cf_url"] = f"https://codeforces.com/problemset/problem/{contest_id}/{index}"
            _STATEMENT_CACHE[cache_key] = parsed
            try:
                import json
                from app.redis import redis_client
                await redis_client.setex(f"stmt:{cache_key}", 86400 * 14, json.dumps(parsed))
            except Exception:
                pass
            return parsed

        logger.warning(
            "Codeforces statement fetch failed for %s%s (contest load or network issue). Serving graceful fallback.",
            contest_id,
            index,
        )

        # Fallback structure without dummy placeholders so frontend algorithmic details render cleanly
        fallback_data = {
            "title": f"Problem {contest_id}{index.upper()}",
            "time_limit": "2.0s",
            "memory_limit": "256MB",
            "description": "",
            "input_specification": "",
            "output_specification": "",
            "sample_tests": [],
            "note": "",
            "is_fallback": True,
            "cf_url": f"https://codeforces.com/problemset/problem/{contest_id}/{index}",
        }
        return fallback_data

    @classmethod
    async def _bg_fetch_and_cache(
        cls,
        contest_id: int | str,
        index: str,
        session_cookie: str | None,
    ) -> None:
        import asyncio
        from bs4 import BeautifulSoup
        import json

        def _bg_worker():
            canonical_cf_url = f"https://codeforces.com/problemset/problem/{contest_id}/{index}"
            try:
                api_url = f"https://archive.org/wayback/available?url={canonical_cf_url}"
                res = requests.get(api_url, timeout=5)
                if res.status_code == 200:
                    data = res.json()
                    snap = data.get("archived_snapshots", {}).get("closest")
                    if snap and snap.get("available") and snap.get("url"):
                        snap_url = snap["url"]
                        snap_resp = requests.get(snap_url, timeout=8)
                        if snap_resp.status_code == 200:
                            soup = BeautifulSoup(snap_resp.text, "html.parser")
                            stmt = soup.find("div", class_="problem-statement")
                            if stmt:
                                return cls._parse_statement_soup(stmt, contest_id, index)
            except Exception as e:
                logger.debug("Background statement fetch error: %s", e)
            return None

        try:
            parsed = await asyncio.to_thread(_bg_worker)
            if parsed:
                parsed["is_fallback"] = False
                parsed["cf_url"] = f"https://codeforces.com/problemset/problem/{contest_id}/{index}"
                cache_key = f"{contest_id}_{index.upper()}"
                _STATEMENT_CACHE[cache_key] = parsed
                from app.redis import redis_client
                await redis_client.setex(f"stmt:{cache_key}", 86400 * 14, json.dumps(parsed))
                logger.info("Background worker cached statement for %s%s in Redis", contest_id, index)
        except Exception as e:
            logger.debug("Background worker error for %s%s: %s", contest_id, index, e)

    @classmethod
    def _parse_statement_soup(cls, stmt: Tag, contest_id: int | str, index: str) -> dict[str, Any]:
        header = stmt.find("div", class_="header")
        title_tag = header.find("div", class_="title") if header else None
        title = title_tag.get_text().strip() if title_tag else f"{contest_id}{index}"

        time_tag = stmt.find("div", class_="time-limit")
        time_limit = time_tag.get_text().replace("time limit per test", "").strip() if time_tag else "2.0s"

        mem_tag = stmt.find("div", class_="memory-limit")
        memory_limit = mem_tag.get_text().replace("memory limit per test", "").strip() if mem_tag else "256MB"

        # Problem description: all children before input-specification
        desc_parts = []
        for child in stmt.children:
            if child == header or not isinstance(child, Tag):
                continue
            classes = child.get("class", [])
            if any(c in classes for c in ["header", "input-specification", "output-specification", "sample-tests", "note"]):
                continue
            desc_parts.append(_clean_cf_html(child))
        description = "".join(desc_parts).strip()

        # Input specification
        input_div = stmt.find("div", class_="input-specification")
        input_spec = _clean_cf_html(input_div)

        # Output specification
        output_div = stmt.find("div", class_="output-specification")
        output_spec = _clean_cf_html(output_div)

        # Sample test cases
        sample_tests = []
        sample_div = stmt.find("div", class_="sample-test")
        if sample_div:
            inputs = sample_div.find_all("div", class_="input")
            outputs = sample_div.find_all("div", class_="output")
            for i, (inp, outp) in enumerate(zip(inputs, outputs)):
                in_pre = inp.find("pre")
                out_pre = outp.find("pre")
                if not in_pre or not out_pre:
                    continue

                in_lines = in_pre.find_all("div", class_="test-example-line")
                out_lines = out_pre.find_all("div", class_="test-example-line")

                in_text = "\n".join([d.get_text() for d in in_lines]) if in_lines else in_pre.get_text("\n")
                out_text = "\n".join([d.get_text() for d in out_lines]) if out_lines else out_pre.get_text("\n")

                sample_tests.append({
                    "id": f"sample-{i+1}",
                    "name": f"Sample {i+1}",
                    "input": in_text.strip() + "\n",
                    "expected_output": out_text.strip() + "\n",
                })

        # Note section
        note_div = stmt.find("div", class_="note")
        note = _clean_cf_html(note_div)

        return {
            "title": title,
            "time_limit": time_limit,
            "memory_limit": memory_limit,
            "description": description,
            "input_specification": input_spec,
            "output_specification": output_spec,
            "sample_tests": sample_tests,
            "note": note,
        }
