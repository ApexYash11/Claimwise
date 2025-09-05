"""
Enhanced embedding system for ClaimWise backend.
Provides efficient text embedding with caching, batching, and multiple provider support.
"""
import logging
import hashlib
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
from src.caching import get_embedding_cache, cached
from src.exceptions import ExternalAPIError, ProcessingError, handle_exceptions

logger = logging.getLogger(__name__)

class EmbeddingProvider:
    """Base class for embedding providers"""
    
    def __init__(self, name: str):
        self.name = name
    
    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for a list of texts"""
        raise NotImplementedError
    
    def get_embedding_dimension(self) -> int:
        """Get the dimension of embeddings produced by this provider"""
        raise NotImplementedError

class OpenAIEmbeddingProvider(EmbeddingProvider):
    """OpenAI embedding provider"""
    
    def __init__(self, api_key: str, model: str = "text-embedding-ada-002"):
        super().__init__("openai")
        self.api_key = api_key
        self.model = model
        self.dimension = 1536  # ada-002 dimension
    
    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings using OpenAI API"""
        try:
            import openai
            client = openai.OpenAI(api_key=self.api_key)
            
            # OpenAI allows up to 2048 texts per request
            batch_size = min(2048, len(texts))
            embeddings = []
            
            for i in range(0, len(texts), batch_size):
                batch = texts[i:i + batch_size]
                
                response = client.embeddings.create(
                    input=batch,
                    model=self.model
                )
                
                batch_embeddings = [item.embedding for item in response.data]
                embeddings.extend(batch_embeddings)
            
            return embeddings
            
        except Exception as e:
            raise ExternalAPIError(
                message=f"OpenAI embedding failed: {str(e)}",
                service="openai_embeddings",
                original_exception=e
            )
    
    def get_embedding_dimension(self) -> int:
        return self.dimension

class SentenceTransformerProvider(EmbeddingProvider):
    """Local sentence transformer embedding provider"""
    
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        super().__init__("sentence_transformer")
        self.model_name = model_name
        self._model = None
        self.dimension = 384  # Default for all-MiniLM-L6-v2
    
    def _load_model(self):
        """Lazy load the sentence transformer model"""
        if self._model is None:
            try:
                from sentence_transformers import SentenceTransformer
                self._model = SentenceTransformer(self.model_name)
                logger.info(f"Loaded sentence transformer model: {self.model_name}")
            except ImportError as e:
                raise ProcessingError(
                    message="sentence-transformers library not installed",
                    operation="load_embedding_model",
                    original_exception=e,
                    recovery_suggestions=[
                        "Install sentence-transformers: pip install sentence-transformers"
                    ]
                )
            except Exception as e:
                raise ProcessingError(
                    message=f"Failed to load sentence transformer model: {str(e)}",
                    operation="load_embedding_model",
                    original_exception=e
                )
    
    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings using sentence transformers"""
        self._load_model()
        
        if self._model is None:
            raise ProcessingError(
                message="Sentence transformer model failed to load",
                operation="generate_embeddings"
            )
        
        try:
            embeddings = self._model.encode(texts, convert_to_tensor=False)
            return embeddings.tolist()
        except Exception as e:
            raise ProcessingError(
                message=f"Sentence transformer embedding failed: {str(e)}",
                operation="generate_embeddings",
                original_exception=e
            )
    
    def get_embedding_dimension(self) -> int:
        return self.dimension

class HuggingFaceEmbeddingProvider(EmbeddingProvider):
    """Hugging Face embedding provider"""
    
    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        super().__init__("huggingface")
        self.model_name = model_name
        self._tokenizer = None
        self._model = None
        self.dimension = 384
    
    def _load_model(self):
        """Lazy load the Hugging Face model"""
        if self._model is None:
            try:
                from transformers import AutoTokenizer, AutoModel
                self._tokenizer = AutoTokenizer.from_pretrained(self.model_name)
                self._model = AutoModel.from_pretrained(self.model_name)
                logger.info(f"Loaded Hugging Face model: {self.model_name}")
            except ImportError:
                raise ProcessingError(
                    message="transformers library not installed",
                    operation="load_embedding_model",
                    recovery_suggestions=[
                        "Install transformers: pip install transformers torch"
                    ]
                )
    
    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings using Hugging Face transformers"""
        self._load_model()
        
        if self._tokenizer is None or self._model is None:
            raise ProcessingError(
                message="Hugging Face model or tokenizer failed to load",
                operation="generate_embeddings"
            )
        
        try:
            import torch
            
            # Tokenize and encode
            encoded_input = self._tokenizer(
                texts, 
                padding=True, 
                truncation=True, 
                return_tensors='pt'
            )
            
            with torch.no_grad():
                model_output = self._model(**encoded_input)
                # Use mean pooling
                embeddings = model_output.last_hidden_state.mean(dim=1)
            
            return embeddings.tolist()
            
        except Exception as e:
            raise ProcessingError(
                message=f"Hugging Face embedding failed: {str(e)}",
                operation="generate_embeddings",
                original_exception=e
            )
    
    def get_embedding_dimension(self) -> int:
        return self.dimension

class EmbeddingManager:
    """Manages multiple embedding providers and caching"""
    
    def __init__(self):
        self.providers: Dict[str, EmbeddingProvider] = {}
        self.default_provider: Optional[str] = None
        self.cache = get_embedding_cache()
        
        # Initialize default providers
        self._initialize_providers()
    
    def _initialize_providers(self):
        """Initialize available embedding providers"""
        import os
        
        # Try to initialize OpenAI provider
        openai_key = os.getenv("OPENAI_API_KEY")
        if openai_key:
            try:
                self.providers["openai"] = OpenAIEmbeddingProvider(openai_key)
                self.default_provider = "openai"
                logger.info("Initialized OpenAI embedding provider")
            except Exception as e:
                logger.warning(f"Failed to initialize OpenAI provider: {e}")
        
        # Try to initialize Sentence Transformer provider
        try:
            self.providers["sentence_transformer"] = SentenceTransformerProvider()
            if self.default_provider is None:
                self.default_provider = "sentence_transformer"
            logger.info("Initialized Sentence Transformer provider")
        except Exception as e:
            logger.warning(f"Failed to initialize Sentence Transformer provider: {e}")
        
        # Try to initialize Hugging Face provider
        try:
            self.providers["huggingface"] = HuggingFaceEmbeddingProvider()
            if self.default_provider is None:
                self.default_provider = "huggingface"
            logger.info("Initialized Hugging Face provider")
        except Exception as e:
            logger.warning(f"Failed to initialize Hugging Face provider: {e}")
        
        if not self.providers:
            logger.error("No embedding providers available!")
    
    def add_provider(self, name: str, provider: EmbeddingProvider):
        """Add a custom embedding provider"""
        self.providers[name] = provider
        if self.default_provider is None:
            self.default_provider = name
        logger.info(f"Added custom embedding provider: {name}")
    
    def _generate_cache_key(self, texts: List[str], provider_name: str) -> str:
        """Generate a cache key for the given texts and provider"""
        # Create a hash of the texts and provider
        text_content = "|".join(texts)
        content_hash = hashlib.sha256(
            f"{provider_name}:{text_content}".encode()
        ).hexdigest()[:16]
        return f"embed:{provider_name}:{content_hash}"
    
    @handle_exceptions(logger)
    async def embed_texts(
        self, 
        texts: List[str], 
        provider: Optional[str] = None,
        use_cache: bool = True
    ) -> List[List[float]]:
        """Generate embeddings for a list of texts"""
        
        if not texts:
            return []
        
        # Use default provider if none specified
        provider_name = provider or self.default_provider
        if not provider_name or provider_name not in self.providers:
            available = list(self.providers.keys())
            raise ProcessingError(
                message=f"Embedding provider '{provider_name}' not available",
                operation="embed_texts",
                details={"available_providers": available},
                recovery_suggestions=[
                    f"Use one of the available providers: {', '.join(available)}",
                    "Check your API keys and dependencies"
                ]
            )
        
        # Check cache first
        cache_key = self._generate_cache_key(texts, provider_name)
        if use_cache:
            cached_result = self.cache.get(cache_key)
            if cached_result is not None:
                logger.debug(f"Cache hit for embedding batch of {len(texts)} texts")
                return cached_result
        
        # Generate embeddings
        provider_instance = self.providers[provider_name]
        
        try:
            embeddings = await provider_instance.embed_texts(texts)
            
            # Validate results
            if len(embeddings) != len(texts):
                raise ProcessingError(
                    message="Embedding count mismatch",
                    operation="embed_texts",
                    details={
                        "input_count": len(texts),
                        "output_count": len(embeddings)
                    }
                )
            
            # Cache the results
            if use_cache:
                self.cache.set(cache_key, embeddings, ttl=7200)  # Cache for 2 hours
            
            logger.debug(f"Generated {len(embeddings)} embeddings using {provider_name}")
            return embeddings
            
        except Exception as e:
            if isinstance(e, (ExternalAPIError, ProcessingError)):
                raise
            else:
                raise ProcessingError(
                    message=f"Embedding generation failed with {provider_name}",
                    operation="embed_texts",
                    original_exception=e
                )
    
    async def embed_single_text(
        self, 
        text: str, 
        provider: Optional[str] = None,
        use_cache: bool = True
    ) -> List[float]:
        """Generate embedding for a single text"""
        embeddings = await self.embed_texts([text], provider, use_cache)
        return embeddings[0] if embeddings else []
    
    def get_embedding_dimension(self, provider: Optional[str] = None) -> int:
        """Get the embedding dimension for the specified provider"""
        provider_name = provider or self.default_provider
        if provider_name and provider_name in self.providers:
            return self.providers[provider_name].get_embedding_dimension()
        return 384  # Default dimension
    
    def get_available_providers(self) -> List[str]:
        """Get list of available embedding providers"""
        return list(self.providers.keys())
    
    def calculate_similarity(
        self, 
        embedding1: List[float], 
        embedding2: List[float]
    ) -> float:
        """Calculate cosine similarity between two embeddings"""
        try:
            # Convert to numpy arrays
            vec1 = np.array(embedding1)
            vec2 = np.array(embedding2)
            
            # Calculate cosine similarity
            dot_product = np.dot(vec1, vec2)
            norm1 = np.linalg.norm(vec1)
            norm2 = np.linalg.norm(vec2)
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
            
            return dot_product / (norm1 * norm2)
            
        except Exception as e:
            logger.error(f"Error calculating similarity: {e}")
            return 0.0
    
    def find_most_similar(
        self, 
        query_embedding: List[float], 
        candidate_embeddings: List[List[float]],
        top_k: int = 5
    ) -> List[Tuple[int, float]]:
        """Find the most similar embeddings to the query"""
        try:
            similarities = []
            
            for i, candidate in enumerate(candidate_embeddings):
                similarity = self.calculate_similarity(query_embedding, candidate)
                similarities.append((i, similarity))
            
            # Sort by similarity (descending)
            similarities.sort(key=lambda x: x[1], reverse=True)
            
            return similarities[:top_k]
            
        except Exception as e:
            logger.error(f"Error finding similar embeddings: {e}")
            return []

# Global embedding manager instance
embedding_manager = EmbeddingManager()

# Convenience functions
async def embed_texts(
    texts: List[str], 
    provider: Optional[str] = None,
    use_cache: bool = True
) -> List[List[float]]:
    """Generate embeddings for a list of texts"""
    return await embedding_manager.embed_texts(texts, provider, use_cache)

async def embed_text(
    text: str, 
    provider: Optional[str] = None,
    use_cache: bool = True
) -> List[float]:
    """Generate embedding for a single text"""
    return await embedding_manager.embed_single_text(text, provider, use_cache)

def calculate_similarity(embedding1: List[float], embedding2: List[float]) -> float:
    """Calculate cosine similarity between two embeddings"""
    return embedding_manager.calculate_similarity(embedding1, embedding2)

# Cached wrapper functions
@cached("embeddings", ttl=7200)
def embed_texts_with_cache(texts: List[str], provider: Optional[str] = None) -> List[List[float]]:
    """Cached version of embed_texts for synchronous use"""
    import asyncio
    
    try:
        loop = asyncio.get_event_loop()
        return loop.run_until_complete(embed_texts(texts, provider, use_cache=True))
    except RuntimeError:
        # No running loop, create new one
        return asyncio.run(embed_texts(texts, provider, use_cache=True))

@cached("embeddings", ttl=7200)
def embed_text_with_cache(text: str, provider: Optional[str] = None) -> List[float]:
    """Cached version of embed_text for synchronous use"""
    import asyncio
    
    try:
        loop = asyncio.get_event_loop()
        return loop.run_until_complete(embed_text(text, provider, use_cache=True))
    except RuntimeError:
        # No running loop, create new one
        return asyncio.run(embed_text(text, provider, use_cache=True))