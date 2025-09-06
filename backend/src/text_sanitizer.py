"""
Advanced Text Sanitization for Database Storage
===============================================

Comprehensive text cleaning to prevent Unicode database errors.
"""

import re
import logging
import unicodedata

logger = logging.getLogger(__name__)

def sanitize_text_for_database(text: str) -> str:
    """
    Comprehensive text sanitization to prevent PostgreSQL Unicode errors.
    
    Args:
        text: Raw text that may contain problematic characters
        
    Returns:
        Clean text safe for database storage
    """
    if not text:
        return ""
    
    try:
        # Step 1: Remove null bytes (the main culprit)
        text = text.replace('\x00', '').replace('\u0000', '')
        
        # Step 2: Remove other problematic control characters
        # Keep: \t (tab), \n (newline), \r (carriage return)
        # Remove: All other control characters
        control_chars = ''.join(chr(i) for i in range(32) if i not in [9, 10, 13])
        control_chars += chr(127)  # DEL character
        
        for char in control_chars:
            text = text.replace(char, '')
        
        # Step 3: Remove zero-width and invisible Unicode characters
        invisible_chars = [
            '\u200b',  # Zero width space
            '\u200c',  # Zero width non-joiner
            '\u200d',  # Zero width joiner
            '\u2060',  # Word joiner
            '\ufeff',  # Byte order mark
            '\u00ad',  # Soft hyphen
        ]
        
        for char in invisible_chars:
            text = text.replace(char, '')
        
        # Step 4: Normalize Unicode to remove problematic encodings
        try:
            text = unicodedata.normalize('NFKC', text)
        except Exception as e:
            logger.warning(f"Unicode normalization failed: {e}")
            # If normalization fails, continue with other cleaning
        
        # Step 5: Remove any remaining characters that could cause issues
        # This regex removes any character that's not printable or is a problematic Unicode category
        text = ''.join(char for char in text if unicodedata.category(char)[0] not in ['C'])
        
        # Step 6: Clean up excessive whitespace
        text = re.sub(r'\s+', ' ', text)  # Multiple spaces to single space
        text = re.sub(r'\n\s*\n', '\n\n', text)  # Multiple newlines to double newline
        text = text.strip()
        
        # Step 7: Validate the result
        if not text or len(text.strip()) < 10:
            raise ValueError("Text became too short after sanitization")
        
        # Step 8: Test for any remaining problematic characters
        try:
            # Try encoding/decoding to catch any remaining issues
            test_encoded = text.encode('utf-8', errors='strict')
            test_decoded = test_encoded.decode('utf-8', errors='strict')
            
            # Ensure no null bytes survived
            if '\x00' in test_decoded or '\u0000' in test_decoded:
                raise ValueError("Null characters still present after sanitization")
                
        except (UnicodeEncodeError, UnicodeDecodeError, ValueError) as e:
            logger.error(f"Text sanitization validation failed: {e}")
            # Last resort: remove all non-ASCII characters except common ones
            text = ''.join(char for char in text if ord(char) < 127 or char in 'äöüÄÖÜßñáéíóúÁÉÍÓÚàèìòùÀÈÌÒÙâêîôûÂÊÎÔÛãõñÃÕÑçÇ₹€£$')
        
        logger.info(f"Text sanitized successfully: {len(text)} characters")
        return text
        
    except Exception as e:
        logger.error(f"Critical error in text sanitization: {e}")
        # Emergency fallback: return ASCII-only text
        fallback_text = ''.join(char for char in text if 32 <= ord(char) <= 126)
        if len(fallback_text) < 10:
            raise ValueError("Document contains insufficient readable text")
        return fallback_text

def debug_text_characters(text: str, max_chars: int = 200) -> str:
    """
    Debug function to identify problematic characters in text.
    
    Args:
        text: Text to analyze
        max_chars: Maximum characters to analyze
        
    Returns:
        Debug report string
    """
    if not text:
        return "Empty text"
    
    sample = text[:max_chars]
    report = []
    
    # Count character categories
    categories = {}
    problematic_chars = []
    
    for i, char in enumerate(sample):
        code = ord(char)
        category = unicodedata.category(char)
        
        categories[category] = categories.get(category, 0) + 1
        
        # Flag problematic characters
        if code == 0 or category.startswith('C'):
            problematic_chars.append(f"Pos {i}: '{repr(char)}' (U+{code:04X}, {category})")
    
    report.append(f"Text length: {len(text)}")
    report.append(f"Sample analyzed: {len(sample)} chars")
    report.append(f"Character categories: {categories}")
    
    if problematic_chars:
        report.append("Problematic characters found:")
        for char_info in problematic_chars[:10]:  # Show first 10
            report.append(f"  {char_info}")
        if len(problematic_chars) > 10:
            report.append(f"  ... and {len(problematic_chars) - 10} more")
    else:
        report.append("No problematic characters detected")
    
    return "\n".join(report)

# Test the sanitization function
if __name__ == "__main__":
    # Test with various problematic texts
    test_cases = [
        "Normal text with no issues",
        "Text with\x00null\u0000characters",
        "Text\x01with\x02control\x03chars\x7f",
        "Text\u200bwith\u200cinvisible\u200dchars",
        "Text with unicode ñáéíóú and currency ₹€£$",
        "\x00\x01\x02Only control chars\x7f\x00"
    ]
    
    print("🧪 Testing Advanced Text Sanitization")
    print("=" * 50)
    
    for i, test_text in enumerate(test_cases, 1):
        print(f"\nTest {i}: {repr(test_text[:30])}...")
        
        try:
            # Show debug info
            debug_info = debug_text_characters(test_text)
            print(f"Debug: {debug_info}")
            
            # Test sanitization
            clean_text = sanitize_text_for_database(test_text)
            print(f"✅ Sanitized: {repr(clean_text[:50])}...")
            print(f"Length: {len(test_text)} → {len(clean_text)}")
            
        except Exception as e:
            print(f"❌ Failed: {e}")
    
    print("\n" + "=" * 50)
    print("🎉 Text sanitization tests complete!")
