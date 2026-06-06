import logging
import re
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from src.db import supabase
from src.auth import get_current_user
from src.caching import cache_manager

router = APIRouter()


@router.get("/history")
def get_comprehensive_history(
    page: int = 1, page_size: int = 50, user_id: str = Depends(get_current_user)
):
    from src.main_app import _enforce_user_rate_limit

    _enforce_user_rate_limit("user_general", user_id, "/history")
    try:
        cache = cache_manager.create_cache("history", max_size=1000, default_ttl=30)
        cached = cache.get(f"history:{user_id}:{page}:{page_size}")
        if cached:
            return cached
        page = max(1, page)
        page_size = max(1, min(page_size, 100))
        offset = (page - 1) * page_size

        activities = []
        try:
            activities = (
                supabase.table("activities")
                .select("*")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .range(offset, offset + page_size - 1)
                .execute()
                .data
            )
        except Exception as e:
            logging.exception("Error fetching activities: %s", e)
            activities = []

        total_activities = 0
        try:
            count_result = (
                supabase.table("activities")
                .select("id", {"count": "exact", "head": True})
                .eq("user_id", user_id)
                .execute()
            )
            total_activities = int(getattr(count_result, "count", 0) or 0)
        except Exception as e:
            logging.exception("Error counting activities: %s", e)

        formatted = []
        for act in activities:
            formatted.append(
                {
                    "id": act.get("id", ""),
                    "type": act.get("type", "unknown"),
                    "title": act.get("title", ""),
                    "description": act.get("description", ""),
                    "timestamp": act.get("created_at", ""),
                    "status": act.get("status", "completed"),
                    "details": act.get("details", {}),
                }
            )

        stats = {
            "totalActivities": total_activities,
            "uploads": len([a for a in formatted if a["type"] == "upload"]),
            "analyses": len([a for a in formatted if a["type"] == "analysis"]),
            "chats": len([a for a in formatted if a["type"] == "chat"]),
            "comparisons": len([a for a in formatted if a["type"] == "comparison"]),
            "totalPolicies": 0,
        }

        has_more = offset + page_size < total_activities

        result = {
            "activities": formatted,
            "stats": stats,
            "policies": [],
            "chat_logs": [],
            "pagination": {
                "page": page,
                "page_size": page_size,
                "has_more_activities": has_more,
                "has_more_chat_logs": False,
                "next_page": page + 1 if has_more else None,
                "total_activities": total_activities,
                "total_chat_logs": 0,
            },
            "success": True,
        }
        cache.set(f"history:{user_id}:{page}:{page_size}", result)
        return result
    except Exception as e:
        logging.exception("Exception in get_comprehensive_history: %s", str(e))
        raise HTTPException(
            status_code=500, detail="Error fetching comprehensive history."
        )


@router.get("/activities")
def get_activities(user_id: str = Depends(get_current_user)):
    try:
        cache = cache_manager.create_cache("activities", max_size=1000, default_ttl=30)
        cached = cache.get(f"activities:{user_id}")
        if cached:
            return cached
        activities = (
            supabase.table("activities")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(10)
            .execute()
        )
        if (
            activities
            and hasattr(activities, "data")
            and isinstance(activities.data, list)
            and len(activities.data) > 0
        ):
            formatted = []
            for activity in activities.data:
                formatted.append(
                    {
                        "id": activity["id"],
                        "type": activity["type"],
                        "title": activity["title"],
                        "description": activity["description"],
                        "timestamp": activity["created_at"],
                        "status": activity["status"],
                        "details": activity.get("details", {}),
                    }
                )
            result = {"activities": formatted, "total": len(formatted), "success": True}
            cache.set(f"activities:{user_id}", result)
            return result
        else:
            try:
                policies_res = (
                    supabase.table("policies")
                    .select("id, policy_name, created_at")
                    .eq("user_id", user_id)
                    .order("created_at", desc=True)
                    .limit(5)
                    .execute()
                )
                if policies_res.data:
                    generated = []
                    for p in policies_res.data:
                        generated.append(
                            {
                                "id": f"gen-{p['id']}",
                                "type": "upload",
                                "title": "Policy Uploaded",
                                "description": f"Uploaded {p.get('policy_name', 'Policy')}",
                                "timestamp": p["created_at"],
                                "status": "completed",
                                "details": {"policy_id": p["id"]},
                            }
                        )
                    result = {
                        "activities": generated,
                        "total": len(generated),
                        "success": True,
                    }
                    cache.set(f"activities:{user_id}", result)
                    return result
            except Exception as e:
                logging.warning("Failed to generate activities from policies: %s", e)
            result = {
                "activities": [
                    {
                        "id": "sample-1",
                        "type": "upload",
                        "title": "Welcome to ClaimWise!",
                        "description": "Upload your first policy to see activities here",
                        "timestamp": datetime.utcnow().isoformat(),
                        "status": "completed",
                        "details": {},
                    }
                ],
                "total": 1,
                "success": True,
            }
            cache.set(f"activities:{user_id}", result)
            return result
    except Exception as e:
        logging.exception("Error fetching activities: %s", str(e))
        return {"activities": [], "total": 0, "success": False, "error": str(e)}


@router.get("/dashboard/stats")
def dashboard_stats(user_id: str = Depends(get_current_user)):
    try:
        cache = cache_manager.create_cache("dashboard", max_size=1000, default_ttl=60)
        cached = cache.get(f"stats:{user_id}")
        if cached:
            return cached
        uploaded_count = 0
        try:
            policies = (
                supabase.table("policies").select("id").eq("user_id", user_id).execute()
            )
            uploaded_count = (
                len(policies.data) if policies and policies.data is not None else 0
            )
        except Exception as e:
            logging.exception("Error counting policies: %s", e)
            uploaded_count = 0
        documents_processed = uploaded_count
        analyses_completed = uploaded_count
        comparisons_run = 0
        try:
            comparisons = (
                supabase.table("comparisons")
                .select("id")
                .eq("user_id", user_id)
                .execute()
                .data
            )
            comparisons_run = len(comparisons) if comparisons else 0
        except Exception as e:
            logging.exception("Error counting comparisons: %s", e)
            comparisons_run = 0
        result = {
            "uploadedDocuments": uploaded_count,
            "documentsProcessed": documents_processed,
            "analysesCompleted": analyses_completed,
            "comparisonsRun": comparisons_run,
        }
        cache.set(f"stats:{user_id}", result)
        return result
    except Exception as e:
        logging.exception("Exception in dashboard_stats: %s", str(e))
        raise HTTPException(status_code=500, detail="Error fetching dashboard stats.")


@router.get("/dashboard/stats-dev")
def dashboard_stats_dev(user_id: str = Depends(get_current_user)):
    from src.main_app import _require_debug_routes_enabled, _require_admin_user

    _require_debug_routes_enabled()
    _require_admin_user(user_id)
    try:
        uploaded_count = 0
        documents_processed = 0
        analyses_completed = 0
        comparisons_run = 0
        try:
            policies_res = (
                supabase.table("policies").select("id", "extracted_text").execute()
            )
            policies = policies_res.data if policies_res and policies_res.data else []
            uploaded_count = len(policies)
            documents_processed = len([p for p in policies if p.get("extracted_text")])
        except Exception as e:
            logging.exception("/dashboard/stats-dev - policies query failed: %s", e)
        try:
            analyses_res = supabase.table("analyses").select("id").execute()
            analyses_completed = (
                len(analyses_res.data) if analyses_res and analyses_res.data else 0
            )
        except Exception:
            analyses_completed = uploaded_count
        try:
            comparisons_res = supabase.table("comparisons").select("id").execute()
            comparisons_run = (
                len(comparisons_res.data)
                if comparisons_res and comparisons_res.data
                else 0
            )
        except Exception as e:
            logging.exception("/dashboard/stats-dev - comparisons query failed: %s", e)
            comparisons_run = 0
        if (
            uploaded_count == 0
            and documents_processed == 0
            and analyses_completed == 0
            and comparisons_run == 0
        ):
            return {
                "uploadedDocuments": 2,
                "documentsProcessed": 2,
                "analysesCompleted": 2,
                "comparisonsRun": 1,
            }
        return {
            "uploadedDocuments": uploaded_count,
            "documentsProcessed": documents_processed,
            "analysesCompleted": analyses_completed,
            "comparisonsRun": comparisons_run,
        }
    except Exception as e:
        logging.exception("Exception in dashboard_stats_dev: %s", str(e))
        return {
            "uploadedDocuments": 2,
            "documentsProcessed": 2,
            "analysesCompleted": 2,
            "comparisonsRun": 1,
        }


@router.get("/dashboard/metrics")
def dashboard_metrics(user_id: str = Depends(get_current_user)):
    try:
        cache = cache_manager.create_cache("dashboard", max_size=1000, default_ttl=60)
        cached = cache.get(f"metrics:{user_id}")
        if cached:
            return cached
        policies_res = (
            supabase.table("policies")
            .select(
                "id, validation_score, validation_metadata, policy_name, created_at"
            )
            .eq("user_id", user_id)
            .execute()
        )
        policies = policies_res.data if policies_res and policies_res.data else []
        protection_score = 0
        risks_found = 0
        total_coverage = 0
        if policies:
            validation_scores = []
            risk_count = 0
            coverage_amounts = []
            for policy in policies:
                validation_score = policy.get("validation_score", 0.75)
                validation_scores.append(validation_score * 100)
                metadata = policy.get("validation_metadata") or {}
                if not isinstance(metadata, dict):
                    metadata = {}
                computed = metadata.get("computed_metrics")
                if isinstance(computed, dict):
                    risk_count += computed.get("risk_count", 0)
                    coverage = computed.get("coverage_amount", "0")
                    if coverage:
                        try:
                            clean_coverage = re.sub(r"[^\d.]", "", str(coverage))
                            if clean_coverage:
                                coverage_amounts.append(float(clean_coverage))
                        except (ValueError, TypeError):
                            pass
                else:
                    analysis_result = metadata.get("analysis_result", {})
                    if isinstance(analysis_result, dict):
                        risk_count += len(analysis_result.get("gaps_and_risks", []))
                        risk_count += len(analysis_result.get("exclusions", []))
                        coverage = analysis_result.get("coverage_amount")
                        if coverage:
                            try:
                                clean_coverage = re.sub(r"[^\d.]", "", str(coverage))
                                if clean_coverage:
                                    coverage_amounts.append(float(clean_coverage))
                            except (ValueError, TypeError):
                                pass
            if validation_scores:
                protection_score = int(sum(validation_scores) / len(validation_scores))
            risks_found = risk_count
            if coverage_amounts:
                total_coverage = sum(coverage_amounts)
        coverage_in_lakh = total_coverage / 100000 if total_coverage > 0 else 0
        total_coverage_formatted = (
            f"₹{coverage_in_lakh:.2f} Lakh" if total_coverage > 0 else "₹0 Lakh"
        )
        quick_insight = ""
        if not policies:
            quick_insight = (
                "Scan your first policy to get personalized savings insights."
            )
        elif risks_found > 0:
            quick_insight = f"Found {risks_found} potential gaps in your coverage. Review analysis for savings opportunities."
        elif protection_score >= 80:
            quick_insight = "Your policies provide comprehensive coverage. Consider reviewing annually for best deals."
        else:
            quick_insight = "Some coverage gaps detected. Explore our comparison tool to find better options."
        result = {
            "protectionScore": protection_score,
            "risksFound": risks_found,
            "totalCoverage": total_coverage_formatted,
            "quickInsight": quick_insight,
            "policiesCount": len(policies),
        }
        cache.set(f"metrics:{user_id}", result)
        return result
    except Exception as e:
        logging.exception("Exception in dashboard_metrics: %s", str(e))
        raise HTTPException(status_code=500, detail="Error fetching dashboard metrics.")


@router.get("/dashboard/metrics-dev")
def dashboard_metrics_dev(user_id: str = Depends(get_current_user)):
    from src.main_app import _require_debug_routes_enabled, _require_admin_user

    _require_debug_routes_enabled()
    _require_admin_user(user_id)
    try:
        policies_res = supabase.table("policies").select("*").execute()
        policies = policies_res.data if policies_res and policies_res.data else []
        protection_score = 78
        risks_found = 0
        total_coverage = 0
        if policies:
            validation_scores = []
            risk_count = 0
            coverage_amounts = []
            for policy in policies[:5]:
                validation_score = policy.get("validation_score", 0.75)
                validation_scores.append(validation_score * 100)
                analysis = (
                    supabase.table("analyses")
                    .select("analysis_result")
                    .eq("policy_id", policy["id"])
                    .execute()
                )
                if analysis.data:
                    analysis_result = analysis.data[0].get("analysis_result", {})
                    if isinstance(analysis_result, dict):
                        risk_count += len(analysis_result.get("gaps_and_risks", []))
                coverage = policy.get("coverage_amount")
                if coverage:
                    try:
                        coverage_amounts.append(float(coverage))
                    except (ValueError, TypeError):
                        pass
            if validation_scores:
                protection_score = int(sum(validation_scores) / len(validation_scores))
            risks_found = risk_count
            if coverage_amounts:
                total_coverage = sum(coverage_amounts)
        coverage_in_lakh = total_coverage / 100000 if total_coverage > 0 else 0
        total_coverage_formatted = (
            f"₹{coverage_in_lakh:.2f} Lakh" if total_coverage > 0 else "₹50.00 Lakh"
        )
        quick_insight = (
            "You could save 15% on premiums by switching to HDFC Ergo."
            if policies
            else "Scan your first policy to get personalized savings insights."
        )
        return {
            "protectionScore": protection_score,
            "risksFound": risks_found,
            "totalCoverage": total_coverage_formatted,
            "quickInsight": quick_insight,
            "policiesCount": len(policies),
        }
    except Exception as e:
        logging.exception("Exception in dashboard_metrics_dev: %s", str(e))
        return {
            "protectionScore": 78,
            "risksFound": 3,
            "totalCoverage": "₹50.00 Lakh",
            "quickInsight": "You could save 15% on premiums by switching to HDFC Ergo.",
            "policiesCount": 0,
        }


@router.get("/history-legacy")
def history(user_id: str = Depends(get_current_user)):
    from src.main_app import _require_debug_routes_enabled

    _require_debug_routes_enabled()
    try:
        policies = (
            supabase.table("policies")
            .select("id", "policy_name", "policy_number", "created_at")
            .eq("user_id", user_id)
            .execute()
            .data
        )
        comparisons = (
            supabase.table("comparisons")
            .select(
                "id", "policy_1_id", "policy_2_id", "created_at", "comparison_result"
            )
            .eq("user_id", user_id)
            .execute()
            .data
        )
        return {"policies": policies, "comparisons": comparisons}
    except Exception as e:
        logging.exception("history_legacy failed: %s", e)
        raise HTTPException(status_code=500, detail="Error fetching history.")
