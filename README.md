# Trade Sentry

**AI-powered stock analysis and trading assistant** — Technical indicators, LSTM trend prediction, FinBERT news sentiment, and an LLM-powered verdict with live price streaming and a context-aware chatbot.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Requirements](#requirements)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Overview](#api-overview)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Trade Sentry combines **market data**, **technical analysis**, **ML-based trend prediction**, and **news sentiment** into a single dashboard. It supports Indian markets (NSE/BSE) via Yahoo Finance and delivers a clear **Buy / Sell / Hold** verdict powered by an LLM (Groq), with real-time price updates over WebSockets and a Q&A chatbot.

---

## Features

- **Stock analysis dashboard** — Single-ticker deep dive with pivot points, support/resistance, and multi-timeframe chart data (1D, 5D, 1M, 1Y).
- **LSTM trend prediction** — Trained model for short-term trend signal (BULLISH / BEARISH / NEUTRAL) with confidence score.
- **FinBERT news sentiment** — Sentiment over latest news headlines for the symbol.
- **LLM verdict** — Groq-powered synthesis of technicals, trend, and sentiment into a concise trading decision and explanation.
- **Live price stream** — WebSocket feed for real-time price updates (polling-based).
- **Context-aware chatbot** — Ask follow-up questions using the current analysis context.
- **Indian market support** — NSE (`.NS`) and BSE (`.BO`) tickers with automatic suffix handling.

---

## Tech Stack

| Layer        | Technology |
|-------------|------------|
| **Backend** | FastAPI, Python 3.10+ |
| **Data**    | yfinance, pandas, numpy |
| **ML**      | TensorFlow (LSTM), Transformers (FinBERT), scikit-learn |
| **LLM**     | LangChain, LangChain-Groq |
| **Frontend**| React 19, Vite 7, Tailwind CSS 4, ApexCharts / Recharts, Framer Motion, Lucide React |
| **API**     | REST + WebSocket |

---

## Requirements

### System

- **Python** 3.10 or 3.11 (recommended for TensorFlow 2.15 compatibility)
- **Node.js** 18+ and npm (or pnpm/yarn)
- **RAM** 4GB+ (8GB+ recommended when loading LSTM + FinBERT)
- **Disk** ~2GB for dependencies and ML models

### Backend (Python)

- See [Backend/requirements.txt](Backend/requirements.txt). Key dependencies:
  - `fastapi`, `uvicorn` — API server
  - `yfinance`, `pandas`, `numpy` — market data
  - `tensorflow`, `scikit-learn` — LSTM trend model
  - `transformers` — FinBERT sentiment
  - `langchain`, `langchain-groq` — LLM verdict and chatbot
  - `python-dotenv`, `requests`, `websockets`

### Frontend (Node)

- See [Frontend/package.json](Frontend/package.json). Key dependencies:
  - React 19, Vite 7, Tailwind CSS 4
  - axios, react-apexcharts, recharts, framer-motion, lucide-react

### Optional: ML Service (Lambda-style)

- The `ml-service/` folder contains a serverless-style entry (e.g. for AWS Lambda) using TensorFlow, Transformers, and joblib. Not required for the main Backend + Frontend flow.

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/Trade_Sentry.git
cd Trade_Sentry
```

### 2. Backend setup

```bash
cd Backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

**ML models (required for full analysis):**

- Place the trained LSTM model at `Backend/app/models/lstm_model.h5`
- Place the scaler at `Backend/app/models/scaler.gz`
- Train them using `Backend/app/services/train_model.ipynb` (or your training script), or use pre-built artifacts if provided.

### 3. Frontend setup

```bash
cd Frontend
npm install
```

### 4. Environment variables

Create `Backend/.env` (see [Configuration](#configuration)) with at least:

```env
GROQ_API_KEY=your_groq_api_key_here
```

---

## Configuration

### Backend environment (`Backend/.env`)

| Variable     | Required | Description |
|-------------|----------|-------------|
| `GROQ_API_KEY` | Yes  | API key for [Groq](https://console.groq.com/) — used for LLM verdict and chatbot. |

Optional:

- `PORT` — Server port (default: `8000` when running via `python -m app.main`, or `10000` in `main.py` for Render).

### Frontend

- API base URL is set in `Frontend/src/api.js` (default: `http://127.0.0.1:8000`). For production, use an environment variable (e.g. `VITE_API_URL`) and build with the correct backend URL.

---

## Running the Application

### Start the backend

From the project root:

```bash
cd Backend
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Or from inside `Backend`:

```bash
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Start the frontend

In another terminal:

```bash
cd Frontend
npm run dev
```

Open the URL shown (e.g. `http://localhost:5173`), enter a ticker (e.g. `RELIANCE`, `TCS.NS`), and run an analysis.

---

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | `/` | Health check — returns system status. |
| GET    | `/api/analyze/{ticker}` | Full analysis: pivots, trend, sentiment, LLM verdict, chart data. |
| POST   | `/api/chat` | Chatbot — body: `{ ticker, question, context_data }`. |
| WS     | `/ws/price/{ticker}` | Live price stream (JSON: `price`, `symbol`). |

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed data flow and component descriptions.

---

## Project Structure

```
Trade_Sentry/
├── Backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app, routes, WebSocket
│   │   ├── models/           # LSTM model + scaler (gitignored)
│   │   └── services/
│   │       ├── marketData.py # Pivot points, chart data, yfinance
│   │       ├── ai_engine.py  # LSTM trend prediction
│   │       ├── news_agent.py # FinBERT sentiment
│   │       ├── llm_engine.py # Groq verdict
│   │       └── question_agent.py # Chatbot
│   └── requirements.txt
├── Frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js
│   │   └── components/       # Navbar, SearchBar, StockChart, etc.
│   ├── package.json
│   └── vite.config.js
├── ml-service/               # Optional Lambda-style ML endpoint
│   └── app.py
├── ARCHITECTURE.md
├── LICENSE
├── README.md
└── .gitignore
```

---

## Contributing

Contributions are welcome. Please open an issue or submit a pull request. By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---

## License

This project is licensed under the **MIT License**. See [LICENSE](LICENSE) for the full text.
