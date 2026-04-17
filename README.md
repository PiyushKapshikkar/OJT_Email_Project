# MailPolish — AI Email Paraphrasing Tool

> Rephrase emails to sound **Professional**, **Concise**, **Friendly**, or **Formal** — powered by a local pre-trained **PEGASUS** model. No API keys, no internet needed after setup.

![MailPolish Screenshot](./docs/screenshot.png)

---

## ✨ Features

| Feature | Details |
|---|---|
| 🤖 Pre-trained AI | Uses `tuner007/pegasus_paraphrase` from HuggingFace |
| 🔒 100% Local | Model runs on your machine — no data sent externally |
| 🎨 4 Tone Styles | Professional, Concise, Friendly, Formal |
| 📝 Up to 3 Variants | Pick the best rephrased version |
| ⚡ One-click Copy | Copy any variant instantly |
| 📦 No API Key | Zero cost, zero signup |

---

## 🏗️ Project Structure

```
Emailojt/
├── backend/
│   ├── app.py            ← FastAPI server + model inference
│   └── requirements.txt  ← Python dependencies
├── frontend/
│   ├── index.html        ← Main UI page
│   ├── style.css         ← Dark glassmorphism styles
│   └── script.js         ← UI logic + API calls
└── README.md
```

---

## 🚀 Quick Start

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/email-paraphrase-tool.git
cd email-paraphrase-tool
```

### 2. Install Python dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 3. Start the backend
```bash
uvicorn app:app --reload --port 8000
```

> **First run** will download the PEGASUS model (~500 MB) from HuggingFace and cache it locally. This only happens once.

### 4. Open the app
Visit **http://localhost:8000** in your browser.

---

## 🧠 How the AI Works

| Component | Details |
|---|---|
| **Model** | `tuner007/pegasus_paraphrase` — PEGASUS fine-tuned on paraphrase datasets |
| **Framework** | HuggingFace `transformers` |
| **Inference** | Beam search with `num_beams=5`, temperature sampling |
| **Input limit** | 2000 characters (chunked internally for long emails) |
| **Device** | CPU by default; automatically uses GPU (CUDA) if available |

### Style System
Each tone style prepends a natural-language instruction to guide the model:
- **Professional** → `"Rephrase the following email to sound more formal and professional: "`
- **Concise** → `"Rephrase the following email to be shorter and more concise: "`
- **Friendly** → `"Rephrase the following email to sound warm and friendly: "`
- **Formal** → `"Rewrite the following email using formal business language: "`

---

## 🌐 API Endpoints

### `POST /paraphrase`
```json
{
  "text": "Hey just checking in, did you get my email?",
  "style": "professional",
  "num_variants": 3
}
```

**Response:**
```json
{
  "original": "Hey just checking in...",
  "style": "professional",
  "variants": ["I wanted to follow up...", "I am writing to confirm...", "Kindly let me know..."],
  "best": "I wanted to follow up..."
}
```

### `GET /health`
Returns model status and device info.

---

## 📦 Deploy on GitHub

1. Fork or clone this repo
2. Push to your GitHub account:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/email-paraphrase-tool.git
git push -u origin main
```
3. For deployment, you can use **Railway**, **Render**, or **Hugging Face Spaces** (Gradio/FastAPI).

---

## 🛠️ Tech Stack

- **Backend**: Python 3.10+, FastAPI, Uvicorn
- **AI Model**: HuggingFace Transformers (PEGASUS)
- **Frontend**: Vanilla HTML + CSS + JavaScript (no framework)
- **Styling**: Dark glassmorphism, CSS animations

---

## 📋 Requirements

- Python 3.10+
- ~500 MB disk space (model cache)
- 4 GB RAM minimum (8 GB recommended for comfortable use)

---

## 📄 License

MIT License — free to use, modify, and distribute.
