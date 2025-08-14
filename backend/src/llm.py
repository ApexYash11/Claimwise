import google.generativeai as genai
import os
import json
import re
from typing import Optional

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
    You are an insurance expert. Analyze the following insurance policy text:
    {text}

    Provide ONLY valid JSON (no markdown, no extra text) with:
    - coverage: Summary of coverage details.
    - exclusions: Key exclusions or limitations.
    - claim_process: Steps for filing a claim.
    - claim_readiness_score: A score (0-100) indicating readiness if bills are mentioned (assume no bills for now, default to 0).
    """

    try:
        # Correct usage
        response = model.generate_content(prompt)
        output_text = response.text.strip()

        # Remove code block formatting if present
        if output_text.startswith("```"):
            output_text = re.sub(r"^```[a-zA-Z]*\n|\n```$", "", output_text).strip()

        return json.loads(output_text)

    except json.JSONDecodeError:
        return {
            "coverage": "Unable to determine coverage.",
            "exclusions": "Unable to determine exclusions.",
            "claim_process": "Unable to determine claim process.",
            "claim_readiness_score": 0
        }
    except Exception as e:
        return {
            "coverage": f"Error: {str(e)}",
            "exclusions": "",
            "claim_process": "",
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
    
    Do not add external knowledge or assumptions. Provide a concise answer.
    """

    try:
        response = model.generate_content(prompt)
        return response.text

    except Exception as e:
        return f"Error answering Question: {str(e)}"