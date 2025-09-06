"""
Test script to identify which field is causing the Unicode database error
"""

def test_database_fields():
    """Test each field that goes into the database to find the problematic one"""
    
    # Sample data that would go into the database
    test_data = {
        "user_id": "test-user-123",
        "policy_name": "Test Policy Name",
        "policy_number": "POL/2024/123", 
        "extracted_text": "This is clean test text without any problematic characters",
        "uploaded_file_url": "https://example.com/file.pdf",
        "validation_score": 85.5,
        "document_category": "Medical Policy"
    }
    
    print("🧪 Testing Database Fields for Unicode Issues")
    print("=" * 50)
    
    # Test each field individually
    for field_name, field_value in test_data.items():
        print(f"\nTesting field: {field_name}")
        print(f"Value: {repr(field_value)}")
        print(f"Type: {type(field_value)}")
        
        if isinstance(field_value, str):
            # Check for problematic characters
            has_null = '\x00' in field_value or '\u0000' in field_value
            print(f"Contains null chars: {has_null}")
            
            # Check character codes
            problematic_chars = []
            for i, char in enumerate(field_value):
                code = ord(char)
                if code == 0 or code < 32 and code not in [9, 10, 13]:
                    problematic_chars.append(f"pos {i}: {repr(char)} (U+{code:04X})")
            
            if problematic_chars:
                print(f"❌ Problematic chars: {problematic_chars}")
            else:
                print("✅ No problematic characters")
        else:
            print("✅ Non-string field")
    
    print(f"\n" + "=" * 50)
    
    # Test with potentially problematic data
    print("\n🔍 Testing with Potentially Problematic Data")
    print("=" * 50)
    
    problematic_data = {
        "user_id": "test-user\x00-with-null",  # null in user_id
        "policy_name": "Policy\u0000Name",     # null in policy name
        "policy_number": "POL\x00/2024",       # null in policy number
        "extracted_text": "Text with\x00null chars\u0000embedded",  # nulls in text
        "uploaded_file_url": None,             # None value
        "validation_score": 85.5,
        "document_category": "Medical\x00Policy"  # null in category
    }
    
    for field_name, field_value in problematic_data.items():
        print(f"\nField: {field_name}")
        print(f"Value: {repr(field_value)}")
        
        if isinstance(field_value, str):
            has_null = '\x00' in field_value or '\u0000' in field_value
            if has_null:
                print("❌ CONTAINS NULL CHARACTERS!")
                # Show how to clean it
                clean_value = field_value.replace('\x00', '').replace('\u0000', '')
                print(f"Cleaned: {repr(clean_value)}")
            else:
                print("✅ Clean")
        elif field_value is None:
            print("⚠️  None value (might cause issues)")
        else:
            print("✅ Non-string field")
    
    print(f"\n" + "=" * 50)
    print("💡 Recommendation: All string fields should be sanitized before database insert")

if __name__ == "__main__":
    test_database_fields()
