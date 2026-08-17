from fastapi import FastAPI
from pydantic import BaseModel
from fastembed import TextEmbedding

app = FastAPI(title="StudyCopilot Embedding API")

print("Loading FastEmbed model...")
model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
print("Model loaded successfully!")

class TextRequest(BaseModel):
    text: str

@app.get("/")
def root():
    return {"message": "StudyCopilot Embedding API is running."}

@app.post("/embed")
def embed(request: TextRequest):
    embedding = list(model.embed([request.text]))[0].tolist()
    return {"embedding": embedding}