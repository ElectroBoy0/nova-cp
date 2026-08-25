import re

with open("app/services/bookmark_service.py", "r") as f:
    content = f.read()

import_uuid = "import uuid\n"

if "import uuid" not in content:
    content = content.replace("import logging", "import logging\nimport uuid")

content = content.replace(
    """        # Verify problem exists
        prob_stmt = select(Problem).where(Problem.id == problem_id)""",
    """        # Verify problem exists
        if hasattr(uuid, "UUID"):
            try:
                uuid.UUID(str(problem_id))
                prob_stmt = select(Problem).where(Problem.id == problem_id)
            except ValueError:
                prob_stmt = select(Problem).where(Problem.platform_problem_id == problem_id)
        else:
            prob_stmt = select(Problem).where(Problem.id == problem_id)"""
)

# And after getting problem, we must update problem_id to problem.id to insert properly!
content = content.replace(
    """        # Check if bookmark exists
        bm_stmt = select(Bookmark).where(Bookmark.user_id == user_id, Bookmark.problem_id == problem_id)""",
    """        # Use the correct UUID
        problem_id = problem.id

        # Check if bookmark exists
        bm_stmt = select(Bookmark).where(Bookmark.user_id == user_id, Bookmark.problem_id == problem_id)"""
)

with open("app/services/bookmark_service.py", "w") as f:
    f.write(content)
