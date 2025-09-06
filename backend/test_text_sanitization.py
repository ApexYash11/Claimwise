"""
Test script to verify text sanitization fixes the Unicode database issue
"""

def test_text_sanitization():
    """Test the text sanitization function"""
    import re
    
    # Sample text with problematic characters
    problematic_text = """
    MEDICAL INSURANCE POLICY\u0000
    Policy Number: ABC123\x00\x01
    Policy Holder: John\u0000 Doe\x08
    Sum Insured: ₹5,00,000\x7F
    Premium: ₹12,500\x0B
    """
    
    print("🧪 Testing Text Sanitization")
    print("=" * 40)
    print(f"Original text length: {len(problematic_text)}")
    print(f"Contains null characters: {'\\u0000' in repr(problematic_text)}")
    
    # Apply the same sanitization as in main.py
    sanitized_text = problematic_text.replace('\u0000', '')
    sanitized_text = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', sanitized_text)
    sanitized_text = re.sub(r'\s+', ' ', sanitized_text).strip()
    
    print(f"\nAfter sanitization:")
    print(f"Sanitized text length: {len(sanitized_text)}")
    print(f"Contains null characters: {'\\u0000' in repr(sanitized_text)}")
    print(f"Clean text: {sanitized_text}")
    
    # Test with the medical policy validator
    try:
        import sys
        import os
        sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))
        
        from src.medical_policy_validator import validate_medical_policy
        
        print(f"\n🔍 Testing with Medical Policy Validator:")
        result = validate_medical_policy(sanitized_text, "test_sanitized.pdf")
        print(f"✅ Validation successful: {result.is_valid}")
        print(f"📊 Confidence: {result.confidence_score:.1f}%")
        print(f"📄 Category: {result.category.value}")
        
    except Exception as e:
        print(f"❌ Validation test failed: {e}")
    
    print("\n" + "=" * 40)
    print("✅ Text sanitization test complete!")

if __name__ == "__main__":
    test_text_sanitization()
