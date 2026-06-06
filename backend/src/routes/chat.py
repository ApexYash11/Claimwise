import logging

from fastapi import APIRouter, Depends, HTTPException
from src.db import supabase
from src.auth import get_current_user
from src.models import ChatRequest, MultiPolicyChatRequest, ChatResponse
from src.services.activity_service import log_activity
from src.caching import cache_manager

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, user_id: str = Depends(get_current_user)):
    from src.main_app import _enforce_user_rate_limit

    _enforce_user_rate_limit("chat", user_id, "/chat")
    try:
        policy_id = request.policy_id
        question = request.question
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
        extracted_text = policy.get("extracted_text", "")
        if not extracted_text or len(extracted_text) < 50:
            return ChatResponse(
                answer="This policy appears to have no extracted text. Please try re-uploading the policy document.",
                citations=[],
            )
        try:
            from src.rag import retrieve_top_k
        except Exception as e:
            logging.exception("Failed to import rag.retrieve_top_k: %s", e)
            return ChatResponse(
                answer="Server misconfiguration: retrieval not available", citations=[]
            )
        top = []
        try:
            top = await retrieve_top_k(question, k=5, policy_id=policy_id)
        except Exception as e:
            logging.exception("retrieve_top_k failed: %s", e)
        prompt_parts = []
        citations = []
        for idx, content, score in top:
            excerpt = (
                (content[:400] + "...")
                if content and len(content) > 400
                else (content or "")
            )
            prompt_parts.append(excerpt)
            citations.append({"id": idx, "excerpt": excerpt, "score": score})
        if not prompt_parts:
            context_str = extracted_text[:2000]
        else:
            context_str = "\n\n".join(prompt_parts)
        final_prompt = f"You are an insurance expert. Use the provided context to answer the question. Context:\n{context_str}\n\nQuestion: {question}\n\nAnswer succinctly and cite chunks by id when referenced."
        answer = None
        try:
            from src.llm import make_llm_request

            answer = make_llm_request(final_prompt)
        except Exception as e:
            logging.exception("Gemini generation failed, trying fallback: %s", e)
            try:
                from src.llm_groq import chat_with_policy as fallback_chat

                answer = fallback_chat(
                    extracted_text, question, policy.get("policy_number")
                )
            except Exception as e2:
                logging.exception("Fallback chat failed: %s", e2)
                answer = None
        if not answer:
            answer = "I could not generate a response. Please try again or rephrase your question."
        log_activity(
            user_id=user_id,
            activity_type="chat",
            title=f"Asked about {policy.get('policy_name', 'Policy')}",
            description=f"AI assistant answered question about policy coverage",
            details={
                "policy_id": policy_id,
                "question": question[:100] + "..." if len(question) > 100 else question,
                "chat_type": "single_policy",
            },
        )
        supabase.table("chat_logs").insert(
            {
                "user_id": user_id,
                "policy_id": policy_id,
                "question": question,
                "answer": str(answer) if answer is not None else "",
            }
        ).execute()
        hc = cache_manager.create_cache("history", default_ttl=30)
        hc.clear()
        return ChatResponse(
            answer=str(answer) if answer is not None else "", citations=citations
        )
    except IndexError:
        raise HTTPException(status_code=404, detail="Policy not found for this user.")
    except Exception as e:
        logging.exception(
            "Chat error for policy %s: %s",
            getattr(request, "policy_id", "unknown"),
            str(e),
        )
        raise HTTPException(status_code=500, detail="Error processing chat.")


@router.post("/chat-multiple", response_model=ChatResponse)
def chat_multiple_policies(
    request: MultiPolicyChatRequest, user_id: str = Depends(get_current_user)
):
    from src.main_app import _enforce_user_rate_limit

    _enforce_user_rate_limit("chat", user_id, "/chat-multiple")
    try:
        question = request.question
        policies = (
            supabase.table("policies")
            .select("id", "extracted_text", "policy_number")
            .eq("user_id", user_id)
            .execute()
            .data
        )
        if not policies:
            raise HTTPException(
                status_code=404, detail="No policies found for this user."
            )
        policies_data = []
        for policy in policies:
            policies_data.append(
                {
                    "id": policy["id"],
                    "extracted_text": policy["extracted_text"],
                    "policy_number": policy.get(
                        "policy_number", f"Policy {policy['id']}"
                    ),
                }
            )
        from src.llm_groq import chat_with_multiple_policies

        answer = chat_with_multiple_policies(policies_data, question)
        if not answer:
            answer = "I could not generate a comprehensive response across your policies. Please try again."
        answer_str = str(answer) if answer is not None else ""
        supabase.table("chat_logs").insert(
            {
                "user_id": user_id,
                "policy_id": None,
                "question": question,
                "answer": answer_str,
                "chat_type": "multiple_policies",
            }
        ).execute()
        hc = cache_manager.create_cache("history", default_ttl=30)
        hc.clear()
        log_activity(
            user_id=user_id,
            activity_type="chat",
            title="Asked across all policies",
            description=f"AI assistant answered multi-policy question",
            details={
                "question": question[:100] + "..." if len(question) > 100 else question,
                "policies_count": len(policies),
                "chat_type": "multiple_policies",
            },
        )
        return ChatResponse(answer=answer_str, citations=[])
    except HTTPException:
        raise
    except Exception as e:
        logging.exception("chat_multiple_policies failed: %s", e)
        raise HTTPException(
            status_code=500, detail="Error processing multi-policy chat."
        )
