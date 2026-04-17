"""
Email Paraphrasing Tool - Backend
Uses pre-trained T5 paraphrase model from HuggingFace (no API keys needed)
Model: humarin/chatgpt_paraphraser_on_T5_base
  - Fine-tuned T5-base for paraphrasing
  - ~900 MB, cached locally after first download
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Literal
import torch
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import os
import logging

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Model Setup ───────────────────────────────────────────────────────────────
MODEL_NAME = "humarin/chatgpt_paraphraser_on_T5_base"
tokenizer = None
model     = None
device    = "cuda" if torch.cuda.is_available() else "cpu"


def load_model():
    global tokenizer, model
    logger.info(f"Loading model '{MODEL_NAME}' on device='{device}'...")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    model     = AutoModelForSeq2SeqLM.from_pretrained(MODEL_NAME).to(device)
    model.eval()
    logger.info("✅ Model loaded and ready!")


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_model()
    yield
    # cleanup (optional)


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="Email Paraphrasing Tool", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)




# ── Style Prompts ─────────────────────────────────────────────────────────────
# T5 paraphrase models respond well to task-prefix instructions
STYLE_PROMPTS = {
    "professional": "paraphrase professionally: ",
    "concise":      "paraphrase concisely: ",
    "friendly":     "paraphrase in a friendly tone: ",
    "formal":       "paraphrase formally: ",
}


# ── Schemas ───────────────────────────────────────────────────────────────────
class ParaphraseRequest(BaseModel):
    text: str
    style: Literal["professional", "concise", "friendly", "formal"] = "professional"
    num_variants: int = 3


class ParaphraseResponse(BaseModel):
    original: str
    style: str
    variants: list[str]
    best: str


# ── Inference Helper ──────────────────────────────────────────────────────────
def run_paraphrase(text: str, style: str, num_variants: int) -> list[str]:
    """Run T5 beam search to generate paraphrase candidates."""
    prompt = STYLE_PROMPTS.get(style, "") + text

    encoding = tokenizer(
        prompt,
        return_tensors="pt",
        padding="longest",
        max_length=256,
        truncation=True,
    ).to(device)

    with torch.no_grad():
        outputs = model.generate(
            **encoding,
            max_new_tokens=256,
            num_beams=max(num_variants + 2, 5),
            num_return_sequences=num_variants,
            no_repeat_ngram_size=2,
            repetition_penalty=1.5,
            length_penalty=0.8,
            early_stopping=True,
        )

    results = [tokenizer.decode(o, skip_special_tokens=True) for o in outputs]

    # Remove any echoed prefix
    prefix = STYLE_PROMPTS.get(style, "")
    cleaned = [r[len(prefix):].strip() if r.startswith(prefix) else r.strip() for r in results]
    return cleaned


# ── Endpoint: paraphrase ──────────────────────────────────────────────────────
@app.post("/paraphrase", response_model=ParaphraseResponse)
async def paraphrase(req: ParaphraseRequest):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
    if len(req.text) > 2000:
        raise HTTPException(status_code=400, detail="Text too long (max 2000 chars).")
    if not 1 <= req.num_variants <= 5:
        raise HTTPException(status_code=400, detail="num_variants must be 1–5.")

    variants = run_paraphrase(req.text, req.style, req.num_variants)

    return ParaphraseResponse(
        original=req.text,
        style=req.style,
        variants=variants,
        best=variants[0],
    )


# ── Endpoint: health ──────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model": MODEL_NAME,
        "device": device,
        "model_loaded": model is not None,
    }


# ── Serve Frontend (same origin) ───────────────────────────────────────────────
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend")
if os.path.isdir(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

    @app.get("/")
    async def serve_frontend():
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))
