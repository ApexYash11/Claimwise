# Medical Policy Validation Setup Guide

## 🎯 Overview

Your project now has a **comprehensive 4-stage medical policy validation pipeline** that filters out non-policy documents like tickets, invoices, presentations, etc.

## 🔧 Implementation Summary

### New Files Created:
1. `src/medical_policy_validator.py` - Main validation engine
2. `src/policy_validation_integration.py` - FastAPI integration helpers
3. `test_medical_validator.py` - Test script to verify functionality

### Modified Files:
- `src/main.py` - Updated upload endpoint to use the new validator

## 🛠 Validation Pipeline Stages

### Stage 1: Keyword Pre-Check (Fast Filter)
- Scans for medical insurance keywords like "policy number", "sum insured", "premium"
- Requires minimum 3 keywords to proceed
- **Purpose**: Quickly filter out obvious non-policy documents

### Stage 2: LLM Classification
- Uses your existing Groq LLM to classify document type
- Categories: Medical Policy, Health Record, Travel Ticket, Invoice, Others
- **Purpose**: AI-powered document type detection

### Stage 3: Field Extraction
- Uses regex patterns to extract mandatory fields:
  - Policy Number
  - Provider Name  
  - Sum Insured
  - Premium Amount
  - Policy Holder
  - Expiry Date
- **Purpose**: Validate document completeness

### Stage 4: Confidence Scoring
- Calculates confidence based on:
  - Field completeness (60% weight)
  - Keyword presence (40% weight)
- Minimum 60% confidence required
- **Purpose**: Ensure document quality

## 🚀 Testing Your Setup

### 1. Test the Validator Standalone
```bash
cd D:\claimwise\backend
python test_medical_validator.py
```

This will test with 4 sample documents:
- ✅ Valid medical policy (should pass)
- ❌ Travel ticket (should reject)
- ❌ Medical invoice (should reject)  
- ❌ Academic timetable (should reject)

### 2. Test via Your Web Interface
1. Start your backend server:
   ```bash
   cd D:\claimwise\backend
   uvicorn src.main:app --reload
   ```

2. Start your frontend:
   ```bash
   cd D:\claimwise\frontend
   npm run dev
   ```

3. Go to `http://localhost:3000/upload` and try uploading:
   - A real medical insurance policy (should work)
   - A resume, timetable, or invoice (should be rejected with helpful message)

## 📋 Error Messages

The system now provides user-friendly error messages for different scenarios:

### Document Not Recognized
```json
{
  "error_type": "invalid_not_policy",
  "message": "This appears to be a travel ticket document, not a medical insurance policy.",
  "suggestions": [
    "Upload medical insurance policy documents instead of travel tickets",
    "Ensure the document contains policy terms and coverage details"
  ]
}
```

### Insufficient Keywords
```json
{
  "error_type": "invalid_insufficient_keywords", 
  "message": "The document doesn't contain enough medical insurance policy keywords.",
  "suggestions": [
    "Ensure you're uploading a medical insurance policy document",
    "Look for documents containing policy numbers and coverage details"
  ]
}
```

### Incomplete Policy
```json
{
  "error_type": "invalid_incomplete_policy",
  "message": "Missing critical policy information: Policy Number, Provider Name",
  "suggestions": [
    "Upload a complete medical insurance policy document",
    "Contact your insurance provider for official policy documents"
  ]
}
```

## 🎛 Configuration Options

You can adjust validation strictness in `medical_policy_validator.py`:

```python
# Make validation stricter (require more keywords)
validator = MedicalPolicyValidator(min_keywords_required=5, min_confidence_threshold=70.0)

# Make validation more lenient 
validator = MedicalPolicyValidator(min_keywords_required=2, min_confidence_threshold=50.0)
```

## 🔍 Monitoring & Logging

The system logs detailed validation metrics:
- Keywords found
- Fields extracted
- Confidence scores
- Classification results
- Rejection reasons

Check your logs to see validation performance and adjust thresholds as needed.

## ✅ Success Indicators

When validation works correctly, you'll see:

1. **Valid policies pass** with high confidence (60%+)
2. **Non-policies rejected** with clear error messages
3. **Extracted fields** populated for valid policies
4. **User-friendly suggestions** for rejected documents

## 🔧 Troubleshooting

### If LLM Classification Fails
The system automatically falls back to keyword-based classification, so validation will still work.

### If Too Many False Positives
Increase `min_confidence_threshold` from 60.0 to 70.0 or higher.

### If Too Many False Negatives  
Decrease `min_keywords_required` from 3 to 2, or add more keywords to the `REQUIRED_KEYWORDS` list.

## 🎉 Next Steps

Your medical policy validation is now active! The system will:
- ✅ Accept only medical insurance policies
- ❌ Reject tickets, invoices, presentations, resumes, etc.
- 📊 Provide confidence scores and detailed feedback
- 🔍 Extract key policy information automatically

Test it with various document types to see the validation in action!
