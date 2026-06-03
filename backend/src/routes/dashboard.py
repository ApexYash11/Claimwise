import logging
import re
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from src.db import supabase, supabase_storage
from src.auth import get_current_user

router = APIRouter()


@router.get("/history")
def get_comprehensive_history(
    page: int = 1, page_size: int = 50, user_id: str = Depends(get_current_user)
):
    from src.main_app import _enforce_user_rate_limit

    _enforce_user_rate_limit("user_general", user_id, "/history")
    try:
        page = max(1, page)
        page_size = max(1, min(page_size, 100))
        offset = (page - 1) * page_size
        policies = []
        try:
            policies = (
                supabase.table("policies")
                .select(
                    "id",
                    "policy_name",
                    "policy_number",
                    "created_at",
                    "uploaded_file_url",
                )
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .execute()
                .data
            )
        except Exception as e:
            logging.exception("Error fetching policies: %s", e)
            policies = []
        total_chat_logs = 0
        chat_logs = []
        try:
            chat_logs = (
                supabase.table("chat_logs")
                .select(
                    "id", "policy_id", "question", "answer", "created_at", "chat_type"
                )
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .range(offset, offset + page_size - 1)
                .execute()
                .data
            )
            chat_logs_count_result = (
                supabase.table("chat_logs")
                .select("id", **{"count": "exact", "head": True})
                .eq("user_id", user_id)
                .execute()
            )
            total_chat_logs = int(getattr(chat_logs_count_result, "count", 0) or 0)
        except Exception as e:
            logging.exception("Error fetching chat logs: %s", e)
            chat_logs = []
            total_chat_logs = 0
        comparisons = []
        try:
            comparisons = (
                supabase.table("comparisons")
                .select(
                    "id",
                    "policy_1_id",
                    "policy_2_id",
                    "created_at",
                    "comparison_result",
                )
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .execute()
                .data
            )
        except Exception as e:
            logging.exception("Error fetching comparisons: %s", e)
            comparisons = []
        activities = []
        for policy in policies:
            activities.append(
                {
                    "id": f"upload_{policy['id']}",
                    "type": "upload",
                    "title": f"Policy Upload: {policy.get('policy_name', 'Unnamed Policy')}",
                    "description": policy.get(
                        "policy_number", "No policy number provided"
                    ),
                    "timestamp": policy["created_at"],
                    "status": "completed",
                    "details": {
                        "filesProcessed": 1,
                        "policyId": policy["id"],
                        "hasFile": bool(policy.get("uploaded_file_url")),
                    },
                }
            )
        for chat in chat_logs:
            chat_type = chat.get("chat_type", "single_policy")
            title_suffix = (
                "Multi-Policy Chat"
                if chat_type == "multiple_policies"
                else "Policy Chat"
            )
            activities.append(
                {
                    "id": f"chat_{chat['id']}",
                    "type": "chat",
                    "title": f"{title_suffix}: {chat['question'][:50]}{'...' if len(chat['question']) > 50 else ''}",
                    "description": f"Asked about: {chat['question'][:120]}{'...' if len(chat['question']) > 120 else ''}",
                    "timestamp": chat["created_at"],
                    "status": "completed",
                    "details": {
                        "questionsAnswered": 1,
                        "chatType": chat_type,
                        "policyId": chat.get("policy_id"),
                        "questionLength": len(chat["question"]),
                        "answerLength": len(chat.get("answer", "")),
                    },
                }
            )
        for comp in comparisons:
            activities.append(
                {
                    "id": f"comparison_{comp['id']}",
                    "type": "comparison",
                    "title": "Policy Comparison",
                    "description": f"Compared policies {comp['policy_1_id']} and {comp['policy_2_id']}",
                    "timestamp": comp["created_at"],
                    "status": "completed",
                    "details": {
                        "policiesCompared": 2,
                        "policy1Id": comp["policy_1_id"],
                        "policy2Id": comp["policy_2_id"],
                        "hasResult": bool(comp.get("comparison_result")),
                    },
                }
            )
        activities.sort(key=lambda x: x["timestamp"], reverse=True)
        analysis_activities = []
        for policy in policies:
            analysis_activities.append(
                {
                    "id": f"analysis_{policy['id']}",
                    "type": "analysis",
                    "title": f"Policy Analysis: {policy.get('policy_name', 'Unnamed Policy')}",
                    "description": f"Analyzed {policy.get('policy_name', 'policy')} for coverage details and insights",
                    "timestamp": policy["created_at"],
                    "status": "completed",
                    "details": {
                        "insightsGenerated": 3,
                        "policyId": policy["id"],
                        "analysisType": "automatic",
                    },
                }
            )
        all_activities = activities + analysis_activities
        all_activities.sort(key=lambda x: x["timestamp"], reverse=True)
        total_activities = len(all_activities)
        paginated_activities = all_activities[offset : offset + page_size]
        stats = {
            "totalActivities": total_activities,
            "uploads": len([a for a in all_activities if a["type"] == "upload"]),
            "analyses": len([a for a in all_activities if a["type"] == "analysis"]),
            "chats": len([a for a in all_activities if a["type"] == "chat"]),
            "comparisons": len(
                [a for a in all_activities if a["type"] == "comparison"]
            ),
            "totalPolicies": len(policies),
        }
        has_more_activities = offset + page_size < total_activities
        has_more_chat_logs = offset + page_size < total_chat_logs
        return {
            "activities": paginated_activities,
            "stats": stats,
            "policies": policies,
            "chat_logs": chat_logs,
            "pagination": {
                "page": page,
                "page_size": page_size,
                "has_more_activities": has_more_activities,
                "has_more_chat_logs": has_more_chat_logs,
                "next_page": page + 1
                if (has_more_activities or has_more_chat_logs)
                else None,
                "total_activities": total_activities,
                "total_chat_logs": total_chat_logs,
            },
            "success": True,
        }
    except Exception as e:
        logging.exception("Exception in get_comprehensive_history: %s", str(e))
        raise HTTPException(
            status_code=500, detail="Error fetching comprehensive history."
        )


@router.get("/activities")
def get_activities(user_id: str = Depends(get_current_user)):
    try:
        try:
            activities = (
                supabase_storage.table("activities")
                .select("*")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .limit(10)
                .execute()
            )
        except Exception:
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
            return {"activities": formatted, "total": len(formatted), "success": True}
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
                    return {
                        "activities": generated,
                        "total": len(generated),
                        "success": True,
                    }
            except Exception as e:
                logging.warning("Failed to generate activities from policies: %s", e)
            return {
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
    except Exception as e:
        logging.exception("Error fetching activities: %s", str(e))
        return {"activities": [], "total": 0, "success": False, "error": str(e)}


@router.get("/dashboard/stats")
def dashboard_stats(user_id: str = Depends(get_current_user)):
    try:
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
        return {
            "uploadedDocuments": uploaded_count,
            "documentsProcessed": documents_processed,
            "analysesCompleted": analyses_completed,
            "comparisonsRun": comparisons_run,
        }
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
        policies_res = (
            supabase.table("policies")
            .select(
                "id, validation_score, validation_metadata, extracted_text, policy_name, created_at"
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
                analysis_result = metadata.get("analysis_result", {})
                if not analysis_result and policy.get("extracted_text"):
                    text = policy.get("extracted_text", "")
                    coverage_patterns = [
                        r"Sum Insured\s*[:\-\s]\s*(?:Rs\.?|INR|₹)?\s*([\d,]+)",
                        r"Coverage Amount\s*[:\-\s]\s*(?:Rs\.?|INR|₹)?\s*([\d,]+)",
                        r"Total Coverage\s*[:\-\s]\s*(?:Rs\.?|INR|₹)?\s*([\d,]+)",
                    ]
                    for pattern in coverage_patterns:
                        match = re.search(pattern, text, re.IGNORECASE)
                        if match:
                            try:
                                amount_str = match.group(1).replace(",", "")
                                coverage_amounts.append(float(amount_str))
                                break
                            except Exception:
                                pass
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
        return {
            "protectionScore": protection_score,
            "risksFound": risks_found,
            "totalCoverage": total_coverage_formatted,
            "quickInsight": quick_insight,
            "policiesCount": len(policies),
        }
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
