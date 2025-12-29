from src.rag import chunk_texts


def test_chunk_texts_basic():
    text = "one two three four five six seven eight nine ten"
    chunks = chunk_texts([text], chunk_size=4, overlap=1)
    assert chunks == [
        "one two three four",
        "four five six seven",
        "seven eight nine ten",
    ]
