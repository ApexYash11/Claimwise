"""
Content filtering utilities for optimizing embedding quality and reducing API costs.
"""
import re
from typing import List


def filter_boilerplate_content(text: str) -> str:
    """
    Remove common boilerplate content from insurance policy text before embedding.
    
    Args:
        text: Raw text content
        
    Returns:
        Filtered text with boilerplate removed
    """
    if not text:
        return text
    
    # Common patterns to remove
    patterns_to_remove = [
        # Page numbers
        r'\n\s*Page\s+\d+\s+of\s+\d+\s*\n',
        r'\n\s*\d+\s*\n',
        
        # Headers and footers with company names
        r'\n\s*(?:Policy\s+Document|Insurance\s+Policy|Terms\s+and\s+Conditions)\s*\n',
        r'\n\s*©.*(?:Insurance|Company|Ltd|Inc).*\n',
        
        # Legal disclaimers (common phrases)
        r'This\s+document\s+is\s+confidential.*?(?:\.|$)',
        r'Please\s+read\s+this\s+policy\s+carefully.*?(?:\.|$)',
        r'This\s+policy\s+is\s+issued\s+subject\s+to.*?(?:\.|$)',
        
        # Repetitive regulatory text
        r'IRDAI.*?Registration.*?(?:\.|$)',
        r'Insurance\s+is\s+subject\s+to.*?(?:\.|$)',
        
        # Multiple spaces/newlines
        r'\s{3,}',
        r'\n{3,}',
    ]
    
    filtered_text = text
    for pattern in patterns_to_remove:
        filtered_text = re.sub(pattern, ' ', filtered_text, flags=re.IGNORECASE | re.MULTILINE)
    
    # Clean up extra whitespace
    filtered_text = re.sub(r'\s+', ' ', filtered_text)
    filtered_text = filtered_text.strip()
    
    return filtered_text


def deduplicate_chunks(chunks: List[str], similarity_threshold: float = 0.95) -> List[str]:
    """
    Remove duplicate or highly similar chunks to reduce embedding costs.
    
    Args:
        chunks: List of text chunks
        similarity_threshold: Similarity threshold for deduplication (0.0-1.0)
        
    Returns:
        List of deduplicated chunks
    """
    if not chunks:
        return chunks
    
    unique_chunks = []
    seen_hashes = set()
    
    for chunk in chunks:
        # Simple hash-based deduplication for exact matches
        chunk_hash = hash(chunk.strip().lower())
        
        if chunk_hash not in seen_hashes:
            # For exact matches, use hash
            seen_hashes.add(chunk_hash)
            unique_chunks.append(chunk)
        else:
            # Skip duplicate
            continue
    
    # TODO: Implement semantic similarity deduplication using embedding similarity
    # This would require computing embeddings, which defeats the purpose for cost optimization
    # Consider implementing this with cheaper local embeddings (sentence-transformers) 
    
    return unique_chunks


def get_content_fingerprint(text: str) -> str:
    """
    Generate a content fingerprint for caching embeddings.
    
    Args:
        text: Text content
        
    Returns:
        Content fingerprint (hash string)
    """
    import hashlib
    
    # Normalize text for consistent hashing
    normalized = re.sub(r'\s+', ' ', text.strip().lower())
    return hashlib.sha256(normalized.encode()).hexdigest()


def should_embed_chunk(chunk: str, min_length: int = 50, max_length: int = 8000) -> bool:
    """
    Determine if a chunk is worth embedding based on content quality.
    
    Args:
        chunk: Text chunk to evaluate
        min_length: Minimum chunk length to be worth embedding
        max_length: Maximum chunk length (for API limits)
        
    Returns:
        True if chunk should be embedded
    """
    if not chunk or len(chunk.strip()) < min_length:
        return False
    
    if len(chunk) > max_length:
        return False
    
    # Skip chunks that are mostly numbers/symbols
    alphanumeric_ratio = sum(c.isalnum() or c.isspace() for c in chunk) / len(chunk)
    if alphanumeric_ratio < 0.7:
        return False
    
    # Skip repetitive content
    words = chunk.lower().split()
    if len(set(words)) < len(words) * 0.3:  # Less than 30% unique words
        return False
    
    return True
