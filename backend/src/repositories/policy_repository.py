import logging
from typing import Optional, Dict, Any, List
from src.db import supabase, supabase_storage


class PolicyRepository:
    def find_by_user(
        self, user_id: str, select_fields: str = "id"
    ) -> List[Dict[str, Any]]:
        try:
            result = (
                supabase.table("policies")
                .select(select_fields)
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .execute()
            )
            return result.data if result.data else []
        except Exception as e:
            logging.exception("PolicyRepository.find_by_user failed: %s", e)
            return []

    def find_by_id(
        self, policy_id: str, user_id: str, select_fields: str = "*"
    ) -> Optional[Dict[str, Any]]:
        try:
            result = (
                supabase.table("policies")
                .select(select_fields)
                .eq("id", policy_id)
                .eq("user_id", user_id)
                .limit(1)
                .execute()
            )
            return result.data[0] if result.data else None
        except Exception as e:
            logging.exception("PolicyRepository.find_by_id failed: %s", e)
            return None

    def create(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        svc = supabase_storage or supabase
        try:
            user_check = (
                svc.table("users").select("id").eq("id", data["user_id"]).execute()
            )
            if not (user_check and getattr(user_check, "data", None)):
                logging.error("User id %s not found in users table", data["user_id"])
                return None
            response = svc.table("policies").insert(data).execute()
            resp_err = getattr(response, "error", None)
            if resp_err:
                logging.error("Supabase insert error: %s", resp_err)
                return None
            return response.data[0] if response.data else None
        except Exception as e:
            logging.exception("PolicyRepository.create failed: %s", e)
            return None

    def delete(self, policy_id: str, auth_client) -> bool:
        try:
            auth_client.table("document_chunks").delete().eq(
                "policy_id", policy_id
            ).execute()
            auth_client.table("policies").delete().eq("id", policy_id).execute()
            return True
        except Exception as e:
            logging.exception("PolicyRepository.delete failed: %s", e)
            return False

    def update(self, policy_id: str, user_id: str, data: Dict[str, Any]) -> bool:
        try:
            result = (
                supabase.table("policies")
                .update(data)
                .eq("id", policy_id)
                .eq("user_id", user_id)
                .execute()
            )
            return bool(result.data)
        except Exception as e:
            logging.exception("PolicyRepository.update failed: %s", e)
            return False
