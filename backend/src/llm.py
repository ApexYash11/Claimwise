import google.generativeai as genai
import os
import json
import re

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
