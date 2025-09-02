import os
import json
import re
import time
import logging
from typing import Optional, List
import importlib

# Get API key from environment
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY environment variable must be set")

# Dynamically import google.generativeai and attempt to use a client-based approach.
genai = None
model = None
try:
    genai = importlib.import_module('google.generativeai')
    ClientCtor = getattr(genai, 'Client', None)
    if ClientCtor:
        try:
            client = ClientCtor(api_key=api_key)
            model = getattr(client, 'models', None)
        except Exception:
            model = None
    else:
        # Fallback: try top-level helpers (some SDKs expose GenerativeModel)
        GenerativeModel = getattr(genai, 'GenerativeModel', None)
        if GenerativeModel:
            try:
                model = GenerativeModel('gemini-1.5-pro')
            except Exception:
                model = None
except Exception:
    genai = None
    model = None

# Rate limiting for API calls and preferred provider configuration
PREFER_GROQ = os.getenv("PREFER_GROQ", "true").lower() == "true"  # Use Groq as primary LLM

def make_llm_request(prompt: str, max_retries: int = 3, delay: float = 1.0, prefer_groq: Optional[bool] = None):
    """
    Make an LLM request with intelligent provider selection and comprehensive fallbacks.
    
    Priority chain: Groq → Gemini → Pattern Matching
    
    Args:
        prompt: Text prompt for the LLM
        max_retries: Number of retry attempts per provider
        delay: Initial delay for retries  
        prefer_groq: Override global preference (None = use PREFER_GROQ setting)
        
    Returns:
        Response text from the LLM or fallback
    """
    if prefer_groq is None:
        prefer_groq = PREFER_GROQ
    
    # Log the attempt
    logging.info(f"LLM request initiated, prefer_groq={prefer_groq}, prompt_length={len(prompt)}")
    
    # Chain 1: Try Groq first if preferred (usually faster and cheaper)
    if prefer_groq:
        try:
            from src.llm_groq import make_llm_request as groq_make_request
            logging.info("Trying Groq API (primary choice)")
            response = groq_make_request(prompt)
            if response and not response.startswith("Error") and len(response) > 10:
                logging.info(f"Groq success: {len(response)} chars")
                return response
            logging.warning("Groq returned empty/error response, falling back to Gemini")
        except Exception as e:
            logging.warning(f"Groq request failed: {e}, falling back to Gemini")
    
    # Chain 2: Try Gemini (fallback or if Gemini is preferred)
    try:
        logging.info("Trying Gemini API")
        response = make_gemini_request(prompt, max_retries, delay)
        text_response = response.text if hasattr(response, 'text') else str(response)
        if text_response and len(text_response) > 10:
            logging.info(f"Gemini success: {len(text_response)} chars")
            return text_response
        logging.warning("Gemini returned empty response")
    except Exception as e:
        logging.warning(f"Gemini request failed: {e}")
        
        # If Gemini was preferred and failed, try Groq as fallback
        if not prefer_groq:
            try:
                from src.llm_groq import make_llm_request as groq_make_request
                logging.info("Trying Groq API (fallback from Gemini)")
                response = groq_make_request(prompt)
                if response and not response.startswith("Error") and len(response) > 10:
                    logging.info(f"Groq fallback success: {len(response)} chars")
                    return response
            except Exception as groq_e:
                logging.warning(f"Groq fallback also failed: {groq_e}")
    
        # Chain 3: Pattern matching fallback for basic queries
        logging.warning("All LLM providers failed, using pattern matching fallback")
        return _pattern_matching_fallback(prompt)


def _pattern_matching_fallback(prompt: str) -> str:
    """
    Basic pattern matching fallback when all LLM providers fail.
    Provides simple responses for common insurance queries.
    """
    prompt_lower = prompt.lower()
    
    # Common insurance questions and basic responses
    if any(word in prompt_lower for word in ['sum insured', 'coverage amount', 'insured amount']):
        return "Based on the policy document, please check the 'Sum Insured' section for coverage amounts. This information is typically listed in the policy schedule."
    
    elif any(word in prompt_lower for word in ['premium', 'cost', 'price']):
        return "Premium information can be found in the policy schedule section. The amount may vary based on coverage type and duration."
    
    elif any(word in prompt_lower for word in ['claim', 'how to claim']):
        return "To file a claim, contact the insurance company's claim department. Required documents typically include policy details, medical bills, and claim forms."
    
    elif any(word in prompt_lower for word in ['maturity', 'tenure', 'duration']):
        return "Policy tenure and maturity details are specified in the policy terms section. Please refer to the policy schedule for specific dates."
    
    elif any(word in prompt_lower for word in ['exclusion', 'not covered', 'excluded']):
        return "Policy exclusions are listed in the exclusions section of the policy document. Please review this section carefully for items not covered."
    
    elif any(word in prompt_lower for word in ['deductible', 'copay', 'co-payment']):
        return "Deductible and co-payment information is specified in the policy terms. Check the 'Terms and Conditions' section for exact amounts."
    
    elif any(word in prompt_lower for word in ['renewal', 'renew']):
        return "Policy renewal information and procedures are outlined in the renewal section of your policy document."
    
    else:
        return "I apologize, but I cannot provide a detailed response at the moment due to service limitations. Please refer to your policy document or contact your insurance provider directly for specific information."


def make_gemini_request(prompt: str, max_retries: int = 3, delay: float = 1.0):
    """
    Make a Gemini API request with retry logic for rate limiting.
    """
    for attempt in range(max_retries):
        try:
            if model is None:
                raise Exception("Gemini model not initialized")
            response = model.generate_content(prompt)
            return response
        except Exception as e:
            error_str = str(e)

            # If it's a rate limit error, wait and retry
            if "429" in error_str or "rate" in error_str.lower():
                if attempt < max_retries - 1:  # Don't sleep on last attempt
                    logging.warning("Rate limit hit, waiting %s seconds before retry %d/%d", delay, attempt + 1, max_retries)
                    time.sleep(delay)
                    delay *= 2  # Exponential backoff
                    continue

            # For other errors or final attempt, raise the exception
            raise e

    raise Exception("Max retries exceeded")

def analyze_policy(text: str) -> dict:
    """
    Analyze insurance policy text using Gemini LLM.
    """
    prompt = f"""
    You are an insurance expert. Analyze the following insurance policy text and extract key information:
    {text}

    Provide ONLY valid JSON (no markdown, no extra text) with these exact fields:
    {{
        "policy_type": "string (e.g., Health, Auto, Home, Life)",
        "provider": "string (insurance company name)",
        "policy_number": "string (if found, otherwise 'Not specified')",
        "coverage_amount": "string (coverage limit/amount if found, format with ₹ symbol and Indian numbering)",
        "premium": "string (monthly/yearly premium if found, format with ₹ symbol and Indian numbering like ₹12,000)",
        "deductible": "string (deductible amount if found, format with ₹ symbol and Indian numbering)",
        "expiration_date": "string (policy end date if found, format YYYY-MM-DD)",
        "coverage": "string (detailed summary of what's covered)",
        "exclusions": "string (what's not covered or limitations)",
        "claim_process": "string (how to file claims)",
        "key_features": ["array of strings with main policy benefits/features"],
        "claim_readiness_score": "number (0-100 indicating how ready this policy is for claims)"
    }}

    Extract actual values from the policy text. For all monetary amounts, format them with Indian Rupee (₹) symbol and Indian numbering format (e.g., ₹1,50,000 not $1,500). If information is not found, use appropriate defaults like "Not specified" or "Not found in policy".
    """

    try:
        response = make_gemini_request(prompt)
        output_text = response.text.strip()

        # Remove code block formatting if present
        if output_text.startswith("```"):
            output_text = re.sub(r"^```[a-zA-Z]*\n|\n```$", "", output_text).strip()

        return json.loads(output_text)

    except json.JSONDecodeError as e:
        logging.error("JSON parsing error: %s", e)
        return {
            "policy_type": "Unknown",
            "provider": "Unknown Provider",
            "policy_number": "Not specified",
            "coverage_amount": "Not specified",
            "premium": "Not specified",
            "deductible": "Not specified",
            "expiration_date": "",
            "coverage": "Unable to determine coverage details.",
            "exclusions": "Unable to determine exclusions.",
            "claim_process": "Unable to determine claim process.",
            "key_features": ["Analysis unavailable"],
            "claim_readiness_score": 0
        }
    except Exception as e:
        logging.exception("LLM Analysis error: %s", e)
        return {
            "policy_type": "Unknown",
            "provider": "Unknown Provider", 
            "policy_number": "Not specified",
            "coverage_amount": "Not specified",
            "premium": "Not specified",
            "deductible": "Not specified",
            "expiration_date": "",
            "coverage": f"Error: {str(e)}",
            "exclusions": "",
            "claim_process": "",
            "key_features": ["Error occurred during analysis"],
            "claim_readiness_score": 0
        }
    
def compare_policies(text1: str, text2: str, policy_number1: Optional[str] = None, policy_number2: Optional[str] = None) -> str:
    """

     compare two policies and highlight differences ussin llm 

     args:
     text 1: text of policy 1
     text 2: text of policy 2
     policy number 1: policy number of policy 1
     policy number 2: policy number of policy 2

     return :
      table covering differences between the two policies
    """
    prompt = f"""
    You are an insurance expert. Compare the following two insurance policies:
    Policy 1 Text: {text1}
    {'Policy 1 Number (if available): ' + policy_number1 if policy_number1 else ''}

    Policy 2 Text: {text2}
    {'Policy 2 Number (if available): ' + policy_number2 if policy_number2 else ''}

    Provide a side-by-side comparison table in Markdown format with the following columns:
    - Coverage
    - Exclusions
    - Premiums
    - Benefits

    Ensure the output is a valid Markdown table.
    """
    try:
        response = make_gemini_request(prompt)
        return response.text
    except Exception as e:
        return f"Error comparing policies: {str(e)}"
    
def get_basic_policy_answer(text: str, question: str, policy_number: Optional[str] = None) -> str:
    """
    Basic pattern matching for common insurance questions when API is unavailable.
    """
    text_lower = text.lower()
    question_lower = question.lower()
    
    # Extract basic info from policy text using pattern matching
    policy_info = {
        "policy_number": policy_number or "Not specified",
        "text_length": len(text),
        "contains_premium": "premium" in text_lower,
        "contains_coverage": "coverage" in text_lower or "cover" in text_lower,
        "contains_deductible": "deductible" in text_lower,
        "contains_claim": "claim" in text_lower,
    }
    
    # Common question patterns
    if any(word in question_lower for word in ["premium", "cost", "price", "pay"]):
        if policy_info["contains_premium"]:
            return f"Based on policy {policy_info['policy_number']}, premium information is mentioned in your policy document. Please review the document directly for specific premium amounts as the AI service is temporarily unavailable."
        else:
            return "Premium information is not clearly mentioned in this policy text."
    
    elif any(word in question_lower for word in ["coverage", "cover", "covered", "benefit"]):
        if policy_info["contains_coverage"]:
            return f"Your policy {policy_info['policy_number']} contains coverage information. Please review the document directly for detailed coverage terms as the AI service is temporarily unavailable."
        else:
            return "Coverage information is not clearly mentioned in this policy text."
    
    elif any(word in question_lower for word in ["claim", "filing", "process"]):
        if policy_info["contains_claim"]:
            return f"Your policy {policy_info['policy_number']} contains claim process information. Please review the document directly for claim procedures as the AI service is temporarily unavailable."
        else:
            return "Claim process information is not clearly mentioned in this policy text."
    
    elif any(word in question_lower for word in ["deductible", "excess"]):
        if policy_info["contains_deductible"]:
            return f"Your policy {policy_info['policy_number']} mentions deductible information. Please review the document directly for deductible amounts as the AI service is temporarily unavailable."
        else:
            return "Deductible information is not clearly mentioned in this policy text."
    
    else:
        return f"""I apologize, but the AI service is temporarily unavailable due to quota limits. 

**Your policy {policy_info['policy_number']} contains {policy_info['text_length']} characters of text.**

**For immediate answers:**
• Review your policy document directly
• Contact your insurance provider
• Try again in 24 hours when quota resets

**Policy contains references to:**
{' • Premium information' if policy_info['contains_premium'] else ''}
{' • Coverage details' if policy_info['contains_coverage'] else ''}
{' • Claim procedures' if policy_info['contains_claim'] else ''}
{' • Deductible terms' if policy_info['contains_deductible'] else ''}"""

def chat_with_policy(text: str, question: str, policy_number: Optional[str] = None) -> str:
    """
    Chat with the policy text using Gemini LLM with quota management.
    
    Args:
        text (str): The policy text.
        question (str): The question to ask about the policy.
        policy_number (str, optional): The policy number for context.

    Returns:
        str: The response from the LLM.
    """
    
    # Check for quota exceeded error patterns
    try:
        prompt = f"""
        You are an insurance expert. Answer the following question based on the provided policy text:

        Policy Text: {text}
        Question: {question}
        Policy Number: {policy_number if policy_number else "N/A"}
        
        Provide a clear, concise answer based only on the policy information provided. 
        If the policy doesn't contain information to answer the question, say "This information is not available in this policy."
        Format monetary amounts in Indian Rupees (₹) when applicable.
        """

        response = make_gemini_request(prompt)
        return response.text

    except Exception as e:
        error_str = str(e)
        
        # Handle quota exceeded errors specifically
        if "429" in error_str or "quota" in error_str.lower() or "exceeded" in error_str.lower():
            # Use basic pattern matching as fallback
            return get_basic_policy_answer(text, question, policy_number)
        
        # Handle other API errors
        return f"Service temporarily unavailable. Please try again later. (Error: {error_str[:100]})"

def chat_with_multiple_policies(policies_data: List[dict], question: str) -> str:
    """
    Chat with multiple policies using Gemini LLM to provide comprehensive answers.
    
    Args:
        policies_data (List[dict]): List of policies with their text and metadata.
        question (str): The question to ask about the policies.

    Returns:
        str: The consolidated response from the LLM.
    """
    
    # Create a consolidated prompt with all policy information
    policies_text = ""
    for i, policy in enumerate(policies_data, 1):
        policy_number = policy.get('policy_number', f'Policy {i}')
        policy_text = policy.get('extracted_text', '')
        policies_text += f"\n--- POLICY {i} ({policy_number}) ---\n{policy_text}\n"
    
    prompt = f"""
    You are an insurance expert. Answer the following question based on the provided multiple insurance policies:

    POLICIES INFORMATION:
    {policies_text}
    
    QUESTION: {question}
    
    Instructions:
    1. Analyze all provided policies to give a comprehensive answer
    2. If the answer varies by policy, explain the differences clearly
    3. Reference specific policies when mentioning coverage details
    4. If no policy contains relevant information, state that clearly
    5. Format monetary amounts in Indian Rupees (₹) when applicable
    6. Provide actionable insights when possible
    
    Provide a well-structured response that addresses the question using information from all relevant policies.
    """

    try:
        response = make_gemini_request(prompt)
        return response.text

    except Exception as e:
        return f"Error answering question across multiple policies: {str(e)}"