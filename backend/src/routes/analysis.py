import logging

from fastapi import APIRouter, Form, Depends, HTTPException
from src.db import supabase
from src.auth import get_current_user
from src.models import CompareRequest
from src.llm_groq import analyze_policy, compare_policies
from src.services.activity_service import log_activity

router = APIRouter()


@router.post("/analyze-policy")
def analyze(policy_id: str = Form(...), user_id: str = Depends(get_current_user)):
    from src.main_app import _enforce_user_rate_limit

    _enforce_user_rate_limit("analysis", user_id, "/analyze-policy")
    try:
        result = (
            supabase.table("policies")
            .select("extracted_text", "policy_number", "policy_name")
            .eq("id", policy_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not result.data:
            raise HTTPException(
                status_code=404, detail="Policy not found for this user."
            )
        policy = result.data[0]
        analysis = analyze_policy(policy["extracted_text"])
        metadata = policy.get("validation_metadata") or {}
        if not isinstance(metadata, dict):
            metadata = {}
        metadata["analysis_result"] = analysis
        gaps_count = len(analysis.get("gaps_and_risks", []))
        exclusions_count = len(analysis.get("exclusions", []))
        total_risks = gaps_count + exclusions_count
        risk_impact = min(total_risks * 0.5, 90)
        validation_score = max((100 - risk_impact) / 100, 0.1)
        risks_list = []
        if analysis.get("exclusions"):
            risks_list.append("exclusions")
        if analysis.get("gaps_and_risks"):
            risks_list.extend(analysis.get("gaps_and_risks", []))
        metadata["computed_metrics"] = {
            "coverage_amount": analysis.get("coverage_amount", "0"),
            "risk_count": len(risks_list),
            "has_exclusions": bool(analysis.get("exclusions")),
            "protection_score": analysis.get("claim_readiness_score", 0),
        }
        supabase.table("policies").update(
            {"validation_metadata": metadata, "validation_score": validation_score}
        ).eq("id", policy_id).execute()
        log_activity(
            user_id=user_id,
            activity_type="analysis",
            title="Policy Analysis Completed",
            description=f"{policy.get('policy_name', 'Policy')} analyzed successfully",
            details={
                "policy_id": policy_id,
                "policy_type": analysis.get("policy_type", "Unknown"),
                "provider": analysis.get("provider", "Unknown"),
                "analysis_score": analysis.get("claim_readiness_score", 0),
            },
        )
        return {"analysis": analysis}
    except IndexError:
        raise HTTPException(status_code=404, detail="Policy not found for this user.")
    except Exception as e:
        logging.exception("Analyze policy failed: %s", e)
        raise HTTPException(status_code=500, detail="Error analyzing policy.")


@router.post("/compare-policies")
def compare(request: CompareRequest, user_id: str = Depends(get_current_user)):
    from src.main_app import _enforce_user_rate_limit

    _enforce_user_rate_limit("analysis", user_id, "/compare-policies")
    try:
        policy_ids = request.policy_ids
        policy_1_id = policy_ids[0]
        policy_2_id = policy_ids[1]
        res1 = (
            supabase.table("policies")
            .select("extracted_text", "policy_number", "policy_name")
            .eq("id", policy_1_id)
            .eq("user_id", user_id)
            .execute()
        )
        res2 = (
            supabase.table("policies")
            .select("extracted_text", "policy_number", "policy_name")
            .eq("id", policy_2_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not res1.data or not res2.data:
            raise HTTPException(
                status_code=404, detail="One or both policies not found for this user."
            )
        pol1 = res1.data[0]
        pol2 = res2.data[0]
        comparison_result_text = compare_policies(
            pol1["extracted_text"],
            pol2["extracted_text"],
            pol1.get("policy_number"),
            pol2.get("policy_number"),
        )
        comparison_data = {
            "user_id": user_id,
            "policy_1_id": policy_1_id,
            "policy_2_id": policy_2_id,
            "comparison_result": comparison_result_text,
        }
        result = supabase.table("comparisons").insert(comparison_data).execute()
        log_activity(
            user_id=user_id,
            activity_type="comparison",
            title="Policy Comparison Completed",
            description=f"Compared {pol1.get('policy_name', 'Policy 1')} vs {pol2.get('policy_name', 'Policy 2')}",
            details={
                "policy_1_id": policy_1_id,
                "policy_2_id": policy_2_id,
                "policy_1_name": pol1.get("policy_name", "Policy 1"),
                "policy_2_name": pol2.get("policy_name", "Policy 2"),
                "total_policies": len(policy_ids),
            },
        )
        return {
            "comparison": comparison_result_text,
            "comparison_id": result.data[0].get("id") if result.data else None,
        }
    except IndexError:
        raise HTTPException(
            status_code=404, detail="One or both policies not found for this user."
        )
    except HTTPException:
        raise
    except Exception as e:
        logging.exception("Error in compare-policies: %s", str(e))
        raise HTTPException(status_code=500, detail="Error comparing policies.")
