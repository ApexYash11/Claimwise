import uuid
import logging
from datetime import datetime
from typing import Union, Dict
from src.db import supabase


def log_activity(
    user_id: str,
    activity_type: str,
    title: str,
    description: str,
    details: Union[Dict, None] = None,
):
    try:
        activity_data = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "type": activity_type,
            "title": title,
            "description": description,
            "details": details or {},
            "status": "completed",
            "created_at": datetime.utcnow().isoformat(),
        }
        result = supabase.table("activities").insert(activity_data).execute()
        logging.debug("Activity logged: %s - %s", activity_type, title)
        return result.data[0] if result.data else None
    except Exception as e:
        logging.exception("Error logging activity: %s", e)
        return None
