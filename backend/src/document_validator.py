"""
Document Validation Layer for ClaimWise
Validates uploaded documents before analysis to ensure they are insurance policies.
"""

import re
import logging
from typing import Dict, List, Tuple, Optional, Any
from enum import Enum
from dataclasses import dataclass

logger = logging.getLogger(__name__)

class DocumentType(Enum):
    """Classification of document types"""
    INSURANCE_POLICY = "insurance_policy"
    MEDICAL_RECORD = "medical_record"
    PRESENTATION = "presentation"
    CONTRACT = "contract"
    FINANCIAL_DOCUMENT = "financial_document"
    OTHER = "other"
    INSUFFICIENT_CONTENT = "insufficient_content"

class ValidationResult(Enum):
    """Document validation results"""
    VALID_POLICY = "valid_policy"
    INVALID_NOT_POLICY = "invalid_not_policy"
    INVALID_INSUFFICIENT_CONTENT = "invalid_insufficient_content"
    INVALID_MISSING_FIELDS = "invalid_missing_fields"
    VALID_WITH_WARNINGS = "valid_with_warnings"

@dataclass
class DocumentValidationReport:
    """Comprehensive validation report"""
    is_valid: bool
    result: ValidationResult
    document_type: DocumentType
    confidence_score: float  # 0.0 to 1.0
    found_fields: Dict[str, str]
    missing_required_fields: List[str]
    warnings: List[str]
    details: Dict[str, Any]

class DocumentValidator:
    """Main document validation engine"""
    
    # Insurance policy keywords with weights
    POLICY_KEYWORDS = {
        # High confidence indicators
        'high': [
            'insurance policy', 'policy number', 'policyholder', 'insured person',
            'premium amount', 'coverage amount', 'deductible', 'policy period',
            'effective date', 'expiration date', 'renewal date', 'coverage details',
            'policy terms', 'insurance company', 'insurer', 'underwriter',
            'claim process', 'benefits summary', 'exclusions', 'conditions'
        ],
        # Medium confidence indicators  
        'medium': [
            'premium', 'coverage', 'benefit', 'claim', 'liability', 'accident',
            'medical expenses', 'property damage', 'comprehensive', 'collision',
            'life insurance', 'health insurance', 'auto insurance', 'home insurance',
            'disability', 'beneficiary', 'co-payment', 'out-of-pocket'
        ],
        # Low confidence indicators
        'low': [
            'insurance', 'policy', 'covered', 'protection', 'risk', 'terms',
            'conditions', 'agreement', 'contract', 'annual', 'monthly'
        ]
    }
    
    # Non-policy indicators (negative keywords)
    NON_POLICY_KEYWORDS = {
        'presentation': [
            'slide', 'presentation', 'agenda', 'overview', 'introduction',
            'powerpoint', 'ppt', 'keynote', 'slides', 'deck', 'slideshow'
        ],
        'medical': [
            'patient', 'diagnosis', 'treatment', 'medication', 'doctor',
            'hospital', 'medical record', 'prescription', 'symptoms',
            'lab results', 'test results', 'radiology', 'pathology'
        ],
        'financial': [
            'balance sheet', 'income statement', 'cash flow', 'revenue',
            'expenses', 'profit', 'loss', 'accounting', 'financial report',
            'bank statement', 'transaction', 'deposit', 'withdrawal'
        ],
        'contract': [
            'agreement', 'contract', 'terms of service', 'license agreement',
            'employment contract', 'lease agreement', 'purchase agreement'
        ],
        'academic': [
            'time table', 'timetable', 'schedule', 'semester', 'course',
            'subject', 'exam', 'assignment', 'grade', 'student', 'professor',
            'university', 'college', 'curriculum', 'syllabus', 'lecture', 'dse'
        ],
        'resume': [
            'resume', 'curriculum vitae', 'cv', 'work experience', 'education',
            'skills', 'qualifications', 'employment history', 'references'
        ]
    }
    
    # Required fields for a valid insurance policy
    REQUIRED_FIELDS = [
        'policy_number',
        'provider_name', 
        'policy_type',
        'effective_date'
    ]
    
    # Optional but important fields
    IMPORTANT_FIELDS = [
        'premium_amount',
        'coverage_amount', 
        'expiration_date',
        'policyholder_name',
        'deductible'
    ]
    
    def __init__(self):
        self.min_content_length = 100  # Minimum characters for analysis
        self.confidence_threshold = 0.6  # RAISED: Much stricter threshold for policy classification
        
    def validate_document(self, text: str, filename: str = "") -> DocumentValidationReport:
        """
        Main validation method - validates if document is an insurance policy
        
        Args:
            text: Extracted document text
            filename: Original filename for additional context
            
        Returns:
            DocumentValidationReport with validation results
        """
        logger.info(f"Validating document: {filename[:50]}...")
        
        # Check content length
        if len(text.strip()) < self.min_content_length:
            return DocumentValidationReport(
                is_valid=False,
                result=ValidationResult.INVALID_INSUFFICIENT_CONTENT,
                document_type=DocumentType.INSUFFICIENT_CONTENT,
                confidence_score=0.0,
                found_fields={},
                missing_required_fields=self.REQUIRED_FIELDS,
                warnings=["Document contains insufficient text for analysis"],
                details={"text_length": len(text)}
            )
        
        # Step 1: Document Classification
        doc_type, confidence = self._classify_document(text, filename)
        
        # Step 2: Extract fields
        found_fields = self._extract_policy_fields(text)
        
        # Step 3: Schema validation
        missing_fields = self._validate_required_fields(found_fields)
        
        # Step 4: Generate validation result
        return self._generate_validation_report(
            doc_type, confidence, found_fields, missing_fields, text, filename
        )
    
    def _classify_document(self, text: str, filename: str) -> Tuple[DocumentType, float]:
        """Classify document type using keyword analysis"""
        text_lower = text.lower()
        filename_lower = filename.lower()
        
        # Calculate policy confidence score
        policy_score = 0.0
        total_words = len(text_lower.split())
        
        # High-weight keywords
        for keyword in self.POLICY_KEYWORDS['high']:
            count = text_lower.count(keyword.lower())
            if count > 0:
                policy_score += count * 3.0
                
        # Medium-weight keywords  
        for keyword in self.POLICY_KEYWORDS['medium']:
            count = text_lower.count(keyword.lower())
            if count > 0:
                policy_score += count * 2.0
                
        # Low-weight keywords
        for keyword in self.POLICY_KEYWORDS['low']:
            count = text_lower.count(keyword.lower())
            if count > 0:
                policy_score += count * 1.0
        
        # Normalize by document length
        if total_words > 0:
            policy_score = policy_score / total_words * 100
        
        # Check for negative indicators - MUCH STRONGER PENALTIES
        negative_score = 0.0
        detected_categories = []
        
        for category, keywords in self.NON_POLICY_KEYWORDS.items():
            category_hits = 0
            for keyword in keywords:
                text_count = text_lower.count(keyword.lower())
                filename_count = filename_lower.count(keyword.lower())
                total_count = text_count + filename_count
                if total_count > 0:
                    category_hits += total_count
                    # MUCH STRONGER penalty - each hit heavily penalizes
                    negative_score += total_count * 10.0  # Increased from 2.0 to 10.0
            
            if category_hits > 0:
                detected_categories.append(category)
                # Extra penalty for being in a non-policy category
                negative_score += 20.0
        
        # If ANY negative keywords detected, heavily penalize
        if negative_score > 0:
            negative_score += 30.0  # Base penalty for any non-policy content
        
        # Adjust policy score based on negative indicators
        adjusted_score = max(0.0, policy_score - negative_score)
        confidence = min(1.0, adjusted_score / 10.0)  # Normalize to 0-1
        
        # IMPROVED classification logic - more aggressive detection
        if len(detected_categories) > 0:
            # Force classification based on detected negative categories
            if 'academic' in detected_categories:
                doc_type = DocumentType.OTHER
                confidence = 0.0  # Force rejection
            elif 'resume' in detected_categories:
                doc_type = DocumentType.OTHER  
                confidence = 0.0  # Force rejection
            elif 'presentation' in detected_categories:
                doc_type = DocumentType.PRESENTATION
                confidence = 0.0  # Force rejection
            elif 'medical' in detected_categories:
                doc_type = DocumentType.MEDICAL_RECORD
                confidence = 0.0  # Force rejection
            elif 'financial' in detected_categories:
                doc_type = DocumentType.FINANCIAL_DOCUMENT
                confidence = 0.0  # Force rejection
            elif 'contract' in detected_categories:
                doc_type = DocumentType.CONTRACT
                confidence = 0.0  # Force rejection
            else:
                doc_type = DocumentType.OTHER
                confidence = 0.0  # Force rejection
        elif confidence >= self.confidence_threshold:
            doc_type = DocumentType.INSURANCE_POLICY
        else:
            doc_type = DocumentType.OTHER
            
        logger.info(f"Document classified as {doc_type.value} with confidence {confidence:.2f}")
        return doc_type, confidence
    
    def _extract_policy_fields(self, text: str) -> Dict[str, str]:
        """Extract key policy fields using regex patterns"""
        found_fields = {}
        
        # Policy number patterns
        policy_patterns = [
            r'policy\s+(?:number|no\.?|#)?\s*:?\s*([A-Z0-9\-]{6,20})',
            r'policy\s*([A-Z0-9\-]{8,15})',
            r'(?:policy|pol)\s*#?\s*([A-Z0-9\-]{6,20})'
        ]
        
        for pattern in policy_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                found_fields['policy_number'] = match.group(1).strip()
                break
        
        # Provider/Company name patterns
        provider_patterns = [
            r'insurance\s+company\s*:?\s*([A-Za-z\s&.]+?)(?:\n|$)',
            r'insurer\s*:?\s*([A-Za-z\s&.]+?)(?:\n|$)',
            r'underwritten\s+by\s*:?\s*([A-Za-z\s&.]+?)(?:\n|$)',
            r'provider\s*:?\s*([A-Za-z\s&.]+?)(?:\n|$)'
        ]
        
        for pattern in provider_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                provider = match.group(1).strip()
                if len(provider) > 2 and len(provider) < 100:
                    found_fields['provider_name'] = provider
                break
        
        # Premium amount patterns
        premium_patterns = [
            r'(?:annual\s+)?premium\s*:?\s*\$?([0-9,]+\.?\d*)',
            r'premium\s+amount\s*:?\s*\$?([0-9,]+\.?\d*)',
            r'monthly\s+payment\s*:?\s*\$?([0-9,]+\.?\d*)'
        ]
        
        for pattern in premium_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                found_fields['premium_amount'] = match.group(1).strip()
                break
        
        # Date patterns (effective, expiration)
        date_patterns = [
            r'effective\s+date\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
            r'policy\s+period\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
            r'expir(?:es|ation)\s+(?:date\s*)?:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})'
        ]
        
        for pattern in date_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                if 'effective' in pattern:
                    found_fields['effective_date'] = match.group(1).strip()
                else:
                    found_fields['expiration_date'] = match.group(1).strip()
        
        # Policy type detection
        policy_types = [
            'auto', 'automobile', 'car', 'vehicle',
            'home', 'homeowner', 'property',
            'life', 'term life', 'whole life',
            'health', 'medical', 'health insurance',
            'disability', 'income protection'
        ]
        
        text_lower = text.lower()
        for policy_type in policy_types:
            if policy_type in text_lower:
                found_fields['policy_type'] = policy_type.title()
                break
        
        logger.info(f"Extracted {len(found_fields)} policy fields")
        return found_fields
    
    def _validate_required_fields(self, found_fields: Dict[str, str]) -> List[str]:
        """Check which required fields are missing"""
        missing_fields = []
        for field in self.REQUIRED_FIELDS:
            if field not in found_fields or not found_fields[field].strip():
                missing_fields.append(field)
        return missing_fields
    
    def _generate_validation_report(
        self, 
        doc_type: DocumentType, 
        confidence: float,
        found_fields: Dict[str, str], 
        missing_fields: List[str],
        text: str,
        filename: str
    ) -> DocumentValidationReport:
        """Generate final validation report"""
        
        warnings = []
        
        # Determine validation result
        if doc_type != DocumentType.INSURANCE_POLICY:
            result = ValidationResult.INVALID_NOT_POLICY
            is_valid = False
        elif len(missing_fields) >= 3:  # Too many missing fields
            result = ValidationResult.INVALID_MISSING_FIELDS
            is_valid = False
        elif len(missing_fields) > 0:
            result = ValidationResult.VALID_WITH_WARNINGS
            is_valid = True
            warnings.append(f"Missing some policy information: {', '.join(missing_fields)}")
        else:
            result = ValidationResult.VALID_POLICY
            is_valid = True
        
        # Additional warnings
        if confidence < 0.5:
            warnings.append("Document confidence is low - please verify this is an insurance policy")
        
        if len(found_fields) < 2:
            warnings.append("Very few policy details could be extracted from this document")
            
        return DocumentValidationReport(
            is_valid=is_valid,
            result=result,
            document_type=doc_type,
            confidence_score=confidence,
            found_fields=found_fields,
            missing_required_fields=missing_fields,
            warnings=warnings,
            details={
                "text_length": len(text),
                "filename": filename,
                "extracted_fields_count": len(found_fields)
            }
        )

# Global validator instance
document_validator = DocumentValidator()

def validate_insurance_document(text: str, filename: str = "") -> DocumentValidationReport:
    """
    Convenience function to validate a document
    
    Args:
        text: Extracted document text
        filename: Original filename
        
    Returns:
        DocumentValidationReport
    """
    return document_validator.validate_document(text, filename)
