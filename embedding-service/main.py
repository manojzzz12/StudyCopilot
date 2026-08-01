from fastapi import FastAPI
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer

app = FastAPI()

print("Loading embedding model...")

model = SentenceTransformer("all-MiniLM-L6-v2")

print("Model loaded successfully!")

class EmbeddingRequest(BaseModel):
    text: str

@app.get("/")
def home():
    return {
        "message": "StudyCopilot Embedding Service Running"
    }

@app.post("/embed")
def embed(request: EmbeddingRequest):

    embedding = model.encode(request.text)

    return {
        "dimensions": len(embedding),
        "embedding": embedding.tolist()
    }