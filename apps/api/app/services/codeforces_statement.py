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

    # Clean inner HTML
    return "".join(str(c) for c in element.children).strip()


class CodeforcesStatementService:
    @classmethod
    def get_statement(cls, contest_id: int | str, index: str) -> dict[str, Any]:
        cache_key = f"{contest_id}_{index.upper()}"
        if cache_key in _STATEMENT_CACHE:
            return _STATEMENT_CACHE[cache_key]

        # Attempt fetching statement from Codeforces with fallback mirrors and short timeout
        urls = [
            f"https://codeforces.com/problemset/problem/{contest_id}/{index}",
            f"https://codeforces.com/contest/{contest_id}/problem/{index}",
        ]

        for url in urls:
            for attempt in range(2):
                try:
                    r = requests.get(url, impersonate="chrome120", timeout=6)
                    if r.status_code == 200:
                        soup = BeautifulSoup(r.text, "html.parser")
                        stmt = soup.find("div", class_="problem-statement")
                        if stmt:
                            parsed = cls._parse_statement_soup(stmt, contest_id, index)
                            _STATEMENT_CACHE[cache_key] = parsed
                            return parsed
                except Exception as e:
                    logger.debug("Attempt %d failed to fetch %s: %s", attempt + 1, url, e)

        logger.warning("Codeforces statement fetch failed for %s%s (contest load or network issue). Serving graceful fallback.", contest_id, index)

        # Fallback structure with informative details so the Solve IDE remains 100% usable
        fallback_data = {
            "title": f"Problem {contest_id}{index.upper()}",
            "time_limit": "2.0s",
            "memory_limit": "256MB",
            "description": f"<p class='text-muted-foreground italic'>The live statement for <strong>{contest_id}{index.upper()}</strong> is temporarily unavailable from Codeforces. You can view the original problem directly on Codeforces or test your solution using custom test cases below.</p>",
            "input_specification": "",
            "output_specification": "",
            "sample_tests": [
                {
                    "input": "1\n5\n1 2 3 4 5\n",
                    "output": "15\n"
                }
            ],
            "note": "",
            "is_fallback": True,
            "cf_url": f"https://codeforces.com/problemset/problem/{contest_id}/{index}"
        }
        return fallback_data

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
