import os
import logging
from typing import Any

from fastapi import HTTPException
from src.db import supabase
from src.rate_limiting import rate_limiter


APP_ENV = os.getenv("APP_ENV", os.getenv("ENVIRONMENT", "development")).lower()
ALLOW_DEBUG_ROUTES = os.getenv("ALLOW_DEBUG_ROUTES", "false").lower() == "true"


def _configured_admin_user_ids() -> set[str]:
    raw_ids = os.getenv("CLAIMWISE_ADMIN_USER_IDS", "")
    return {admin_id.strip() for admin_id in raw_ids.split(",") if admin_id.strip()}


def _is_admin_user(user_id: str) -> bool:
    if not user_id:
        return False
    if user_id in _configured_admin_user_ids():
        return True
    try:
        role_row = (
            supabase.table("users")
            .select("role, is_admin")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )
        if role_row and getattr(role_row, "data", None):
            row = role_row.data[0]
            role = str(row.get("role", "")).strip().lower()
            is_admin = bool(row.get("is_admin", False))
            return is_admin or role == "admin"
    except (OSError, ValueError) as admin_check_err:
        logging.debug(
            "Admin check via users table unavailable; using env allowlist only: %s",
            admin_check_err,
        )
    return False


def _require_admin_user(user_id: str) -> None:
    if not _is_admin_user(user_id):
        raise HTTPException(status_code=403, detail="Admin access required.")


def _enforce_user_rate_limit(limit_name: str, user_id: str, endpoint: str) -> None:
    result = rate_limiter.check_rate_limit(
        limit_name=limit_name, identifier=user_id, endpoint=endpoint
    )
    if not result.allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Retry after {result.retry_after or 1} seconds.",
            headers=result.to_headers(),
        )


def _require_debug_routes_enabled() -> None:
    if APP_ENV == "production" and not ALLOW_DEBUG_ROUTES:
        raise HTTPException(status_code=404, detail="Not found")


def _duplicate_conflict_detail(error_obj: Any) -> str:
    default_message = "A resource already exists"
    constraint_name = None
    try:
        if error_obj is None:
            return default_message
        constraint_name = getattr(error_obj, "constraint_name", None)
        if not constraint_name:
            diag = getattr(error_obj, "diag", None)
            constraint_name = (
                getattr(diag, "constraint_name", None) if diag is not None else None
            )
        if not constraint_name:
            orig = getattr(error_obj, "orig", None)
            if orig is not None:
                diag = getattr(orig, "diag", None)
                constraint_name = (
                    getattr(diag, "constraint_name", None) if diag is not None else None
                )
    except AttributeError:
        constraint_name = None
    if constraint_name:
        return f"Conflict: duplicate value for constraint '{constraint_name}'"
    return default_message
