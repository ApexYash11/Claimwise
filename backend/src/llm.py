import google.generativeai as genai
import os
import json
import re
from typing import Optional, List

# Get API key from environment
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY environment variable must be set")

# Configure Gemini API
genai.configure(api_key=api_key)

# Creating a model instance
model = genai.GenerativeModel("gemini-1.5-flash")

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
        response = model.generate_content(prompt)
        output_text = response.text.strip()

        # Remove code block formatting if present
        if output_text.startswith("```"):
            output_text = re.sub(r"^```[a-zA-Z]*\n|\n```$", "", output_text).strip()

        return json.loads(output_text)

    except json.JSONDecodeError as e:
        print(f"JSON parsing error: {e}")
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
        print(f"LLM Analysis error: {e}")
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
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"Error comparing policies: {str(e)}"
    
def chat_with_policy(text: str, question: str, policy_number: Optional[str] = None) -> str:
    """
    Chat with the policy text using Gemini LLM.
    
    Args:
        text (str): The policy text.
        question (str): The question to ask about the policy.
        policy_number (str, optional): The policy number for context.

    Returns:
        str: The response from the LLM.
    """
    prompt = f"""
    You are an insurance expert. Answer the following question based on the provided policy text:

    Policy Text: {text}
    Question: {question}
    Policy Number: {policy_number if policy_number else "N/A"}
    
    Provide a clear, concise answer based only on the policy information provided. 
    If the policy doesn't contain information to answer the question, say "This information is not available in this policy."
    Format monetary amounts in Indian Rupees (₹) when applicable.
    """

    try:
        response = model.generate_content(prompt)
        return response.text

    except Exception as e:
        return f"Error answering Question: {str(e)}"

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
        response = model.generate_content(prompt)
        return response.text

    except Exception as e:
        return f"Error answering question across multiple policies: {str(e)}"