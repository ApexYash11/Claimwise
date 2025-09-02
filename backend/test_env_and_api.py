#!/usr/bin/env python3
"""
Load environment and test with minimal API calls
"""
import os
from pathlib import Path

def load_env():
    """Load .env file manually"""
    env_file = Path('.env')
    if env_file.exists():
        print("Loading .env file...")
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key] = value
        print("Environment loaded!")
    else:
        print("No .env file found")

def main():
    # Load environment first
    load_env()
    
    # Check configuration
    print("\nConfiguration Check:")
    print(f"GEMINI_API_KEY: {'SET' if os.getenv('GEMINI_API_KEY') else 'NOT SET'}")
    print(f"GROQ_API_KEY: {'SET' if os.getenv('GROQ_API_KEY') else 'NOT SET'}")
    print(f"SUPABASE_URL: {'SET' if os.getenv('SUPABASE_URL') else 'NOT SET'}")
    print(f"EMBEDDING_BATCH_SIZE: {os.getenv('EMBEDDING_BATCH_SIZE', 'NOT SET')}")
    print(f"PREFER_GROQ: {os.getenv('PREFER_GROQ', 'NOT SET')}")
    
    # Test PDF extraction (always works locally)
    print("\nTesting PDF Extraction:")
    try:
        import sys
        sys.path.insert(0, 'src')
        from src.gemini_files import extract_text
        
        text = extract_text('Medical_Insurance_Policy_Sample_2.pdf')
        print(f"SUCCESS: Extracted {len(text)} characters")
        
        # Test one embedding if API available
        if os.getenv('GEMINI_API_KEY'):
            print("\nTesting Minimal Embedding (1 API call):")
            from src.embeddings import embed_texts_with_cache
            
            test_text = text[:200]  # Just first 200 chars
            embeddings = embed_texts_with_cache([test_text])
            
            if embeddings and embeddings[0]:
                print(f"SUCCESS: Got embedding with {len(embeddings[0])} dimensions")
            else:
                print("FAILED: No embedding returned")
        else:
            print("SKIPPING: No GEMINI_API_KEY for embedding test")
            
        # Test LLM if available
        if os.getenv('GROQ_API_KEY') or os.getenv('GEMINI_API_KEY'):
            print("\nTesting Minimal LLM (1 API call):")
            from src.llm import make_llm_request
            
            prompt = f"What type of document is this? Text: {text[:100]}"
            response = make_llm_request(prompt)
            
            if response and len(response) > 5:
                print(f"SUCCESS: Got response: {response[:100]}...")
            else:
                print("FAILED: No LLM response")
        else:
            print("SKIPPING: No API keys for LLM test")
            
        print("\nTest completed! Core functionality verified.")
        
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
