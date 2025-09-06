"""
Medical Insurance Policy Document Validation Pipeline
====================================================

A comprehensive validation system for medical insurance policy PDFs that filters out
non-policy documents (tickets, invoices, etc.) using multi-stage validation.

Pipeline Stages:
1. Keyword Pre-Check (fast filter)
2. LLM-based Document Classification 
3. Field Extraction & Validation
4. Confidence Scoring

Author: ClaimWise AI System
"""

import re
import logging
from typing import Dict, List, Tuple, Optional, Any
from enum import Enum
from dataclasses import dataclass
import json

logger = logging.getLogger(__name__)

class DocumentCategory(str, Enum):
    """Document classification categories"""
    MEDICAL_POLICY = "Medical Policy"
    HEALTH_RECORD = "Health Record"
    TRAVEL_TICKET = "Travel Ticket"
    INVOICE = "Invoice"
    OTHERS = "Others"

class ValidationResult(str, Enum):
    """Validation result types"""
    VALID_POLICY = "valid_policy"
    INVALID_NOT_POLICY = "invalid_not_policy"
    INVALID_INSUFFICIENT_KEYWORDS = "invalid_insufficient_keywords"
    INVALID_INCOMPLETE_POLICY = "invalid_incomplete_policy"
    INVALID_LOW_CONFIDENCE = "invalid_low_confidence"

@dataclass
class ValidationReport:
    """Comprehensive validation report"""
    is_valid: bool
    result: ValidationResult
    category: DocumentCategory
    confidence_score: float  # 0.0 to 100.0
    found_keywords: List[str]
    extracted_fields: Dict[str, str]
    missing_fields: List[str]
    error_message: str
    user_friendly_message: str
    suggestions: List[str]

class MedicalPolicyValidator:
    """
    Main validator class for medical insurance policy documents
    """
    
    # Stage 1: Required keywords for medical insurance policies
    REQUIRED_KEYWORDS = [
        "policy number", "sum insured", "premium", "insurance company", 
        "coverage", "claim", "validity", "policy holder", "insured person",
        "medical insurance", "health insurance", "cashless", "co-payment",
        "deductible", "expiry date", "effective date", "provider network"
    ]
    
    # Stage 4: Mandatory fields for complete policy validation
    MANDATORY_FIELDS = {
        'policy_number': [r'policy\s*(?:no|number|#)[\s:]*([A-Z0-9\-/]+)', r'policy[\s:]+([A-Z0-9\-/]{6,})'],
        'provider_name': [r'insurance\s*company[\s:]*([A-Za-z\s&]+)', r'insurer[\s:]*([A-Za-z\s&]+)'],
        'sum_insured': [r'sum\s*insured[\s:]*₹?\s*([0-9,]+)', r'coverage\s*amount[\s:]*₹?\s*([0-9,]+)'],
        'premium_amount': [r'premium[\s:]*₹?\s*([0-9,]+)', r'annual\s*premium[\s:]*₹?\s*([0-9,]+)'],
        'policy_holder': [r'policy\s*holder[\s:]*([A-Za-z\s]+)', r'insured\s*person[\s:]*([A-Za-z\s]+)'],
        'expiry_date': [r'expiry[\s:]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})', r'valid\s*till[\s:]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})']
    }
    
    # LLM Classification prompt
    CLASSIFICATION_PROMPT = """
    Analyze the following document text and classify it into exactly one of these categories:
    - Medical Policy: Medical/health insurance policy documents
    - Health Record: Medical records, prescriptions, lab reports
    - Travel Ticket: Flight, train, bus tickets or travel documents
    - Invoice: Bills, receipts, invoices for any services/products
    - Others: Any other type of document
    
    Document text:
    {text}
    
    Instructions:
    - Read the document carefully
    - Return ONLY the category name from the list above
    - Do not provide explanations or additional text
    - Be strict: only classify as "Medical Policy" if it's clearly an insurance policy document
    
    Category:"""
    
    def __init__(self, min_keywords_required: int = 3, min_confidence_threshold: float = 60.0):
        """
        Initialize the medical policy validator
        
        Args:
            min_keywords_required: Minimum keywords needed to pass stage 1
            min_confidence_threshold: Minimum confidence score to accept document
        """
        self.min_keywords_required = min_keywords_required
        self.min_confidence_threshold = min_confidence_threshold
    
    def validate_document(self, text: str, filename: str = "") -> ValidationReport:
        """
        Main validation pipeline - orchestrates all validation stages
        
        Args:
            text: Extracted PDF text content
            filename: Original filename for context
            
        Returns:
            ValidationReport with complete validation results
        """
        logger.info(f"Starting validation pipeline for document: {filename}")
        
        try:
            # Stage 1: Keyword Pre-Check (fast filter)
            logger.info("Stage 1: Running keyword pre-check...")
            keywords_result = self._keyword_precheck(text)
            
            if not keywords_result['passed']:
                return self._create_error_report(
                    ValidationResult.INVALID_INSUFFICIENT_KEYWORDS,
                    DocumentCategory.OTHERS,
                    keywords_result['found_keywords'],
                    {},
                    "Uploaded file is not a valid medical insurance policy.",
                    "The document doesn't contain enough medical insurance policy keywords.",
                    [
                        "Ensure you're uploading a medical insurance policy document",
                        "Look for documents containing policy numbers, coverage details, and premium information",
                        "Avoid uploading medical records, tickets, invoices, or other non-policy documents"
                    ]
                )
            
            # Stage 2: LLM-based Document Classification
            logger.info("Stage 2: Running LLM classification...")
            classification_result = self._classify_document(text[:3000])  # First 3000 chars for LLM
            
            if classification_result['category'] != DocumentCategory.MEDICAL_POLICY:
                return self._create_error_report(
                    ValidationResult.INVALID_NOT_POLICY,
                    classification_result['category'],
                    keywords_result['found_keywords'],
                    {},
                    f"Document classified as '{classification_result['category'].value}' rather than a medical insurance policy.",
                    f"This appears to be a {classification_result['category'].value.lower()} document, not a medical insurance policy.",
                    [
                        f"Upload medical insurance policy documents instead of {classification_result['category'].value.lower()}s",
                        "Ensure the document contains policy terms, coverage details, and premium information",
                        "Contact your insurance provider for official policy documents"
                    ]
                )
            
            # Stage 3: Field Extraction & Validation
            logger.info("Stage 3: Extracting and validating fields...")
            extraction_result = self._extract_fields(text)
            
            # Stage 4: Confidence Scoring
            logger.info("Stage 4: Calculating confidence score...")
            confidence_result = self._calculate_confidence(
                extraction_result['extracted_fields'],
                keywords_result['found_keywords']
            )
            
            # Check if document has enough mandatory fields
            if len(extraction_result['missing_fields']) > 3:  # Allow missing up to 3 fields
                return self._create_error_report(
                    ValidationResult.INVALID_INCOMPLETE_POLICY,
                    DocumentCategory.MEDICAL_POLICY,
                    keywords_result['found_keywords'],
                    extraction_result['extracted_fields'],
                    "Document incomplete or not a valid medical insurance policy.",
                    f"Missing critical policy information: {', '.join(extraction_result['missing_fields'][:3])}",
                    [
                        "Upload a complete medical insurance policy document",
                        "Ensure the document includes policy number, provider details, and coverage information",
                        "Contact your insurance provider if you need a complete policy document"
                    ]
                )
            
            # Check confidence threshold
            if confidence_result['score'] < self.min_confidence_threshold:
                return self._create_error_report(
                    ValidationResult.INVALID_LOW_CONFIDENCE,
                    DocumentCategory.MEDICAL_POLICY,
                    keywords_result['found_keywords'],
                    extraction_result['extracted_fields'],
                    f"Document validation confidence too low ({confidence_result['score']:.1f}%).",
                    "The document may be incomplete or not a standard medical insurance policy format.",
                    [
                        "Ensure you're uploading a complete medical insurance policy",
                        "Check that the document is clearly readable and not corrupted",
                        "Try uploading the original policy document from your insurance provider"
                    ]
                )
            
            # SUCCESS: Document passed all validation stages
            logger.info(f"Document validation successful with {confidence_result['score']:.1f}% confidence")
            
            return ValidationReport(
                is_valid=True,
                result=ValidationResult.VALID_POLICY,
                category=DocumentCategory.MEDICAL_POLICY,
                confidence_score=confidence_result['score'],
                found_keywords=keywords_result['found_keywords'],
                extracted_fields=extraction_result['extracted_fields'],
                missing_fields=extraction_result['missing_fields'],
                error_message="",
                user_friendly_message=f"Valid medical insurance policy detected ({confidence_result['score']:.1f}% confidence)",
                suggestions=[]
            )
            
        except Exception as e:
            logger.error(f"Validation pipeline error: {e}")
            return self._create_error_report(
                ValidationResult.INVALID_NOT_POLICY,
                DocumentCategory.OTHERS,
                [],
                {},
                "Document validation failed due to processing error.",
                "Unable to process the uploaded document. Please try again with a different file.",
                [
                    "Ensure the file is a valid PDF document",
                    "Check that the file is not corrupted or password protected",
                    "Try uploading a different medical insurance policy document"
                ]
            )
    
    def _keyword_precheck(self, text: str) -> Dict[str, Any]:
        """
        Stage 1: Fast keyword-based filtering
        Scans for medical insurance policy keywords
        """
        text_lower = text.lower()
        found_keywords = []
        
        for keyword in self.REQUIRED_KEYWORDS:
            if keyword.lower() in text_lower:
                found_keywords.append(keyword)
        
        passed = len(found_keywords) >= self.min_keywords_required
        
        logger.info(f"Keyword precheck: {len(found_keywords)}/{len(self.REQUIRED_KEYWORDS)} keywords found")
        
        return {
            'passed': passed,
            'found_keywords': found_keywords,
            'total_found': len(found_keywords)
        }
    
    def _classify_document(self, text: str) -> Dict[str, Any]:
        """
        Stage 2: LLM-based document classification
        Uses LLM to classify document type
        """
        try:
            # Import LLM client from your existing setup
            from src.llm_groq import groq_client
            
            prompt = self.CLASSIFICATION_PROMPT.format(text=text)
            
            # Get LLM classification using your existing Groq client
            completion = groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",  # Use supported model
                messages=[{"role": "user", "content": prompt}],
                max_tokens=10,
                temperature=0.1
            )
            
            classification = completion.choices[0].message.content
            if classification:
                classification = classification.strip()
            else:
                classification = "Others"
            
            # Map response to enum
            category_mapping = {
                "Medical Policy": DocumentCategory.MEDICAL_POLICY,
                "Health Record": DocumentCategory.HEALTH_RECORD,
                "Travel Ticket": DocumentCategory.TRAVEL_TICKET,
                "Invoice": DocumentCategory.INVOICE,
                "Others": DocumentCategory.OTHERS
            }
            
            category = category_mapping.get(classification, DocumentCategory.OTHERS)
            
            logger.info(f"LLM classification result: {classification} -> {category.value}")
            
            return {
                'category': category,
                'raw_response': classification
            }
            
        except Exception as e:
            logger.warning(f"LLM classification failed, defaulting to OTHERS: {e}")
            # Fallback: use keyword-based classification
            return self._fallback_classification(text)
    
    def _fallback_classification(self, text: str) -> Dict[str, Any]:
        """
        Fallback classification when LLM is unavailable
        Uses keyword patterns to classify documents
        """
        text_lower = text.lower()
        
        # Define classification patterns
        classification_patterns = {
            DocumentCategory.MEDICAL_POLICY: [
                'insurance policy', 'policy number', 'sum insured', 'premium',
                'cashless', 'co-payment', 'deductible', 'policy holder'
            ],
            DocumentCategory.HEALTH_RECORD: [
                'patient', 'diagnosis', 'prescription', 'medical history',
                'doctor', 'hospital admission', 'lab report'
            ],
            DocumentCategory.TRAVEL_TICKET: [
                'flight', 'train', 'bus ticket', 'departure', 'arrival',
                'passenger', 'seat number', 'boarding pass'
            ],
            DocumentCategory.INVOICE: [
                'invoice', 'bill', 'receipt', 'amount due', 'payment',
                'invoice number', 'tax', 'total amount'
            ]
        }
        
        # Count matches for each category
        scores = {}
        for category, keywords in classification_patterns.items():
            score = sum(1 for keyword in keywords if keyword in text_lower)
            scores[category] = score
        
        # Determine best match
        if scores[DocumentCategory.MEDICAL_POLICY] >= 3:
            category = DocumentCategory.MEDICAL_POLICY
        elif max(scores.values()) > 0:
            # Find category with highest score
            best_category = DocumentCategory.OTHERS
            best_score = 0
            for cat, score in scores.items():
                if score > best_score:
                    best_score = score
                    best_category = cat
            category = best_category
        else:
            category = DocumentCategory.OTHERS
            
        logger.info(f"Fallback classification result: {category.value} (scores: {scores})")
        
        return {
            'category': category,
            'raw_response': f"Fallback classification: {category.value}"
        }
    
    def _extract_fields(self, text: str) -> Dict[str, Any]:
        """
        Stage 3: Extract mandatory fields using regex patterns
        """
        extracted_fields = {}
        missing_fields = []
        
        for field_name, patterns in self.MANDATORY_FIELDS.items():
            found = False
            
            for pattern in patterns:
                matches = re.findall(pattern, text, re.IGNORECASE)
                if matches:
                    # Take the first match and clean it up
                    value = matches[0].strip()
                    if value:
                        extracted_fields[field_name] = value
                        found = True
                        break
            
            if not found:
                missing_fields.append(field_name.replace('_', ' ').title())
        
        logger.info(f"Field extraction: {len(extracted_fields)}/{len(self.MANDATORY_FIELDS)} fields found")
        
        return {
            'extracted_fields': extracted_fields,
            'missing_fields': missing_fields
        }
    
    def _calculate_confidence(self, extracted_fields: Dict[str, str], found_keywords: List[str]) -> Dict[str, float]:
        """
        Stage 4: Calculate confidence score based on extracted data
        """
        # Field completeness score (60% weight)
        field_score = (len(extracted_fields) / len(self.MANDATORY_FIELDS)) * 60.0
        
        # Keyword presence score (40% weight)
        keyword_score = min(len(found_keywords) / len(self.REQUIRED_KEYWORDS), 1.0) * 40.0
        
        total_score = field_score + keyword_score
        
        logger.info(f"Confidence calculation: {field_score:.1f}% (fields) + {keyword_score:.1f}% (keywords) = {total_score:.1f}%")
        
        return {
            'score': total_score,
            'field_score': field_score,
            'keyword_score': keyword_score
        }
    
    def _create_error_report(
        self, 
        result: ValidationResult,
        category: DocumentCategory,
        found_keywords: List[str],
        extracted_fields: Dict[str, str],
        error_message: str,
        user_message: str,
        suggestions: List[str]
    ) -> ValidationReport:
        """
        Helper method to create standardized error reports
        """
        return ValidationReport(
            is_valid=False,
            result=result,
            category=category,
            confidence_score=0.0,
            found_keywords=found_keywords,
            extracted_fields=extracted_fields,
            missing_fields=[],
            error_message=error_message,
            user_friendly_message=user_message,
            suggestions=suggestions
        )

# Convenience function for easy integration
def validate_medical_policy(text: str, filename: str = "") -> ValidationReport:
    """
    Convenience function to validate a medical insurance policy document
    
    Args:
        text: Extracted PDF text
        filename: Original filename
        
    Returns:
        ValidationReport with validation results
    """
    validator = MedicalPolicyValidator()
    return validator.validate_document(text, filename)

# Example usage and testing
if __name__ == "__main__":
    # Test with sample documents
    
    # Sample 1: Valid medical policy text
    valid_policy = """
    STAR HEALTH INSURANCE COMPANY LIMITED
    Policy Number: SH/12345/2024
    Policy Holder: John Doe
    Sum Insured: ₹5,00,000
    Annual Premium: ₹12,500
    Policy Valid from: 01/04/2024 to 31/03/2025
    Coverage: Cashless treatment at network hospitals
    """
    
    # Sample 2: Invalid document (invoice)
    invalid_invoice = """
    MEDICAL BILLS INVOICE
    Bill No: MB-789
    Patient: Jane Smith
    Doctor Consultation: ₹500
    Medicines: ₹1,200
    Total Amount: ₹1,700
    """
    
    print("Testing Medical Policy Validator...")
    print("=" * 50)
    
    # Test valid policy
    result1 = validate_medical_policy(valid_policy, "policy.pdf")
    print(f"Valid Policy Test:")
    print(f"  Is Valid: {result1.is_valid}")
    print(f"  Confidence: {result1.confidence_score:.1f}%")
    print(f"  Message: {result1.user_friendly_message}")
    print()
    
    # Test invalid document
    result2 = validate_medical_policy(invalid_invoice, "invoice.pdf")
    print(f"Invalid Invoice Test:")
    print(f"  Is Valid: {result2.is_valid}")
    print(f"  Category: {result2.category.value}")
    print(f"  Message: {result2.user_friendly_message}")
    print(f"  Suggestions: {result2.suggestions}")
