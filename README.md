# CleanIQ 🚀
**A Unified Multi-Modal Data Cleaning Framework Using Large Language Models for Tabular and Image Data with Automated Quality Scoring**

CleanIQ is a B.Tech final-year research project featuring a novel composite Data Quality Score (DQS) system and LLM-in-the-loop validation using Groq's high-speed inference.

## Features ✨
- **Multi-Modal Support**: Cleans both CSV/Excel tables and ZIP files of images.
- **LLM-in-the-Loop**: "Chat with Data" feature powered by `llama3-8b-8192` via Groq.
- **Novel DQS Metric**: Unified scoring system tracking improvements in Data Quality.
- **PDF Report Generation**: Automated one-click PDF exports of the final cleaned profile and summary.

## Tech Stack 🛠️
- **Frontend**: React + Vite + TailwindCSS + Recharts
- **Backend**: FastAPI + Pandas + OpenCV + imagehash
- **Database**: SQLite (via SQLAlchemy)
- **AI Model**: Groq API (Llama 3 8B)

## Getting Started ⚙️

### Prerequisites
1. **Python 3.9+**
2. **Node.js 18+**
3. **Groq API Key**: Go to [console.groq.com](https://console.groq.com), sign up for free, and generate a new API key. Our solution entirely runs on the generous free tier.

### 1. Set up Backend (FastAPI)
```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
```

**Environment Variables**: Create a `.env` file inside the `backend/` folder:
```
GROQ_API_KEY="gsk_your_key_here"
```

**Run Server**:
```bash
uvicorn main:app --reload --port 8000
```
(Server will be running at `http://localhost:8000`)

### 2. Set up Frontend (React + Vite)
Open a new terminal window:
```bash
cd frontend
npm install
```

**Environment Variables**: Create a `.env` file inside the `frontend/` folder:
```
VITE_API_URL="http://localhost:8000"
```

**Run UI**:
```bash
npm run dev
```

## Demo Datasets 📊
To validate the system, test with these datasets (as highlighted in our paper):
- **Tabular**: Titanic Dataset, Adult Income
- **Image**: CIFAR-10 noise subsets, CelebA subset
