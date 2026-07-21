import os

import httpx


def trigger_frontend_redeploy() -> bool:
    """Fires a workflow_dispatch on the frontend's GitHub Actions deploy workflow so a newly
    added/edited vertical goes live without a developer needing to remember to redeploy.
    Silent no-op when unconfigured (e.g. local dev) — same "skip until configured" philosophy
    as the console email/WhatsApp fallbacks."""
    repo = os.environ.get("GITHUB_REPO", "")
    token = os.environ.get("GITHUB_DEPLOY_PAT", "")
    if not repo or not token:
        return False

    workflow_file = os.environ.get("GITHUB_DEPLOY_WORKFLOW", "deploy.yml")
    response = httpx.post(
        f"https://api.github.com/repos/{repo}/actions/workflows/{workflow_file}/dispatches",
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
        },
        json={"ref": "main"},
        timeout=10.0,
    )
    response.raise_for_status()
    return True
