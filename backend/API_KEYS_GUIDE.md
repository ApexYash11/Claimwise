# 🚀 API Keys Setup Guide - Separate Rate Limits Strategy

## Problem: Multiple Groq Models = Same Rate Limit ❌
Using 5 different Groq models (`llama-3.3-70b`, `llama-3.1-70b`, `gemma-7b-it`, etc.) all count against the **SAME** 100,000 tokens/day limit because they use the same `GROQ_API_KEY`.

## Solution: Different Providers = Different Rate Limits ✅

### Current Working Setup
```bash
# Already working in your .env:
GROQ_API_KEY=gsk_cFUEBYwnaMoy6E2IWXfIWGdyb3FY...  # 100k tokens/day
GEMINI_API_KEY=AIzaSyA5tL3GqVVW6BYAsxBzaIlTzm...  # Separate limits
```

### Additional Free Tier APIs You Can Add

#### 1. Together.ai (Free Tier)
```bash
# Add to .env:
TOGETHER_API_KEY=your_together_api_key_here
```
- **Get it**: https://api.together.xyz/
- **Free Tier**: $5 credit + free models
- **Models**: Llama-2, CodeLlama, Mistral
- **Separate limits** from Groq/Gemini

#### 2. Hugging Face Inference (Free)
```bash
# Add to .env:
HUGGINGFACE_API_KEY=your_hf_token_here
```
- **Get it**: https://huggingface.co/settings/tokens
- **Free Tier**: Rate-limited but free
- **Models**: DialoGPT, BlenderBot, many others
- **Separate limits** from other providers

#### 3. OpenAI (If you have credits)
```bash
# Add to .env:
OPENAI_API_KEY=your_openai_key_here
```
- **Free**: $5 trial credit for new accounts
- **Models**: GPT-3.5-turbo (cheapest)
- **Separate limits** from other providers

#### 4. Multiple Groq Accounts (Advanced)
```bash
# If you create multiple Groq accounts:
GROQ_API_KEY_1=first_account_key
GROQ_API_KEY_2=second_account_key  
GROQ_API_KEY_3=third_account_key
```

## How the Fallback System Works

### Current Flow:
1. **Groq API** (100k tokens/day) → Try first
2. **Gemini API** (separate limits) → Fallback if Groq fails
3. **Rule-based fallback** → Emergency if both fail

### With Additional APIs:
1. **Groq API** → Primary (100k tokens)
2. **Gemini API** → Secondary (separate limits)  
3. **Together.ai** → Third (separate limits)
4. **Hugging Face** → Fourth (separate limits)
5. **Rule-based** → Final emergency

## Recommended Setup Priority

### Quick Win (5 minutes):
```bash
# Get Hugging Face token (easiest):
HUGGINGFACE_API_KEY=hf_your_token_here
```

### Best Reliability (15 minutes):
```bash
# Add Together.ai for high-quality fallback:
TOGETHER_API_KEY=your_together_key
HUGGINGFACE_API_KEY=hf_your_token_here
```

### Maximum Reliability (30 minutes):
```bash
# Full multi-provider setup:
GROQ_API_KEY=your_groq_key          # Primary
GEMINI_API_KEY=your_gemini_key      # Secondary  
TOGETHER_API_KEY=your_together_key   # Third
HUGGINGFACE_API_KEY=hf_your_token   # Fourth
OPENAI_API_KEY=your_openai_key      # Fifth (if you have credits)
```

## Testing the Setup

Run this to test your API keys:
```bash
cd backend
python -c "
from src.llm_groq import make_llm_request
response = make_llm_request('Test message')
print('Response:', response[:100])
"
```

## Key Benefits

### ✅ Separate Rate Limits
- Each provider has independent daily/hourly limits
- When one hits limit, others still work

### ✅ Better Reliability  
- Policy analysis won't fail when one API is down
- Automatic fallback between different providers

### ✅ Cost Optimization
- Use free tiers from multiple providers
- Spread usage across different APIs

## Current Status in Your Code
- ✅ Groq → Gemini fallback is already working
- ✅ Code is ready for additional providers
- ⚠️ Just need to add API keys to .env file

The enhanced system will automatically use these additional APIs when needed!
