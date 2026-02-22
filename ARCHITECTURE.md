# Trade Sentry — Architecture

This document describes the system architecture, data flow, and main components of Trade Sentry.

---

## Table of Contents

- [High-Level Overview](#high-level-overview)
- [Component Diagram](#component-diagram)
- [Backend Components](#backend-components)
- [Data Flow](#data-flow)
- [API Contract](#api-contract)
- [Frontend Architecture](#frontend-architecture)
- [ML Pipeline](#ml-pipeline)
- [Deployment Considerations](#deployment-considerations)

---

## High-Level Overview

Trade Sentry is a **three-tier** application:

1. **Frontend** — React SPA (Vite) for search, dashboard, charts, live price, and chatbot.
2. **Backend** — FastAPI server that orchestrates market data, ML models, and LLM calls.
3. **External / Optional** — Yahoo Finance (data), Groq (LLM), and optionally a separate ML service (e.g. Lambda) for trend/sentiment.

The backend is the **orchestrator**: it pulls data and calls internal services (market data, AI engine, news agent, LLM engine, question agent) to produce the analysis and chat responses.

---

## Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React + Vite)                         │
│  Navbar │ SearchBar │ StockChart │ Dashboard (pivots, trend, sentiment)  │
│  Live Price (WebSocket) │ Chatbot UI                                       │
└─────────────────────────────────────┬───────────────────────────────────┘
                                      │ HTTP / WebSocket
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         BACKEND (FastAPI)                                 │
│  main.py — Routes: /api/analyze/{ticker}, /api/chat, /ws/price/{ticker}  │
└───┬─────────────┬─────────────┬─────────────┬─────────────┬─────────────┘
    │             │             │             │             │
    ▼             ▼             ▼             ▼             ▼
┌─────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌──────────────┐
│market   │ │ai_engine  │ │news_agent │ │llm_engine │ │question_agent│
│Data     │ │(LSTM)     │ │(FinBERT) │ │(Groq)    │ │(Groq chat)   │
│yfinance │ │TensorFlow │ │Transformers│ │Verdict   │ │Q&A           │
└─────────┘ └───────────┘ └───────────┘ └───────────┘ └──────────────┘
    │             │             │             │             │
    ▼             ▼             ▼             ▼             ▼
┌─────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌──────────────┐
│Yahoo    │ │app/models/│ │yf.news +  │ │Groq API   │ │Groq API      │
│Finance  │ │lstm.h5    │ │FinBERT    │ │           │ │              │
│         │ │scaler.gz  │ │           │ │           │ │              │
└─────────┘ └───────────┘ └───────────┘ └───────────┘ └──────────────┘
```

---

## Backend Components

### 1. `main.py` (FastAPI application)

- **Role:** Entry point, CORS, route definitions, WebSocket handler.
- **Endpoints:**
  - `GET /` — Health check.
  - `GET /api/analyze/{ticker}` — Full analysis pipeline (lazy imports of services).
  - `POST /api/chat` — Chatbot; body: `ticker`, `question`, `context_data`.
  - `WS /ws/price/{ticker}` — Live price stream (polling yfinance every 2s, sending JSON).

### 2. `services/marketData.py`

- **Role:** Market data and technical structure.
- **Functions:**
  - `validate_indian_ticker(ticker)` — Normalizes NSE/BSE (e.g. adds `.NS`).
  - `get_stock_data(ticker, period, interval)` — OHLCV DataFrame via yfinance.
  - `get_pivot_points(ticker)` — Pivot point, support/resistance, current price.
  - `get_full_chart_data(ticker)` — Multi-timeframe series (1D, 5D, 1M, 1Y) for charts.
- **Data source:** Yahoo Finance (yfinance).

### 3. `services/ai_engine.py`

- **Role:** Short-term trend prediction.
- **Model:** LSTM (TensorFlow/Keras), loaded from `app/models/lstm_model.h5`.
- **Input:** Last ~60–100 closing prices.
- **Processing:** MinMax scaling (using `app/models/scaler.gz`), optional RSI-like features, LSTM inference.
- **Output:** `{ "signal": "BULLISH"|"BEARISH"|"NEUTRAL", "confidence": float }`.

### 4. `services/news_agent.py`

- **Role:** News sentiment for the ticker.
- **Model:** FinBERT (`ProsusAI/finbert`) via Hugging Face Transformers.
- **Input:** Headlines from `yf.Ticker(ticker).news` (top N).
- **Output:** Aggregate sentiment label (e.g. Positive / Negative / Neutral or a short summary string).

### 5. `services/llm_engine.py`

- **Role:** Final trading verdict from all signals.
- **LLM:** Groq (e.g. `openai/gpt-oss-20b`) via LangChain.
- **Input:** Ticker, current price, pivot data, trend signal, sentiment.
- **Output:** Structured verdict (e.g. STRONG BUY | BUY | WAIT/HOLD | SELL | STRONG SELL) and short explanation.

### 6. `services/question_agent.py`

- **Role:** Context-aware Q&A chatbot.
- **LLM:** Same Groq client.
- **Input:** Ticker, user question, and `context_data` (current analysis: price, pivots, trend, sentiment).
- **Output:** Natural-language answer grounded in the provided context.

---

## Data Flow

### Full analysis (`GET /api/analyze/{ticker}`)

1. **Pivot & structure** — `marketData.get_pivot_points(ticker)`; on failure return error.
2. **Historical series** — `marketData.get_stock_data(ticker, "1y")` and/or `get_full_chart_data(ticker)` for last 100 closes.
3. **Trend** — `ai_engine.predict_trend(closes)` → `{ signal, confidence }`.
4. **Sentiment** — `news_agent.get_news_sentiment(symbol)`.
5. **Verdict** — `llm_engine.get_ai_verdict(ticker, price, pivots, trend, sentiment)`.
6. **Response** — JSON: `symbol`, `price`, `trend_signal`, `sentiment_signal`, `support_resistance`, `ai_analysis`, `chart_data`.

### Chat (`POST /api/chat`)

1. Body: `ticker`, `question`, `context_data` (same structure as analysis response).
2. `question_agent.get_chat_response(ticker, question, context_data)`.
3. Response: `{ "answer": "..." }`.

### Live price (`WS /ws/price/{ticker}`)

1. Client connects to `/ws/price/{ticker}`.
2. Server loop: `get_pivot_points(ticker)` → send `{ price, symbol }` → sleep 2s.
3. Continues until disconnect or error.

---

## API Contract

### `GET /api/analyze/{ticker}`

**Response (success):**

```json
{
  "symbol": "RELIANCE.NS",
  "price": 2450.50,
  "trend_signal": { "signal": "BULLISH", "confidence": 72.5 },
  "sentiment_signal": "Positive",
  "support_resistance": {
    "pivot_point": 2440,
    "resistance": { "target_1": 2480, "target_2": 2520 },
    "support": { "stop_1": 2400, "stop_2": 2360 }
  },
  "ai_analysis": { "verdict": "BUY", "explanation": "..." },
  "chart_data": { "1D": [...], "5D": [...], "1M": [...], "1Y": [...] }
}
```

**Response (error):** `{ "error": "Invalid Ticker or Data Unavailable" }`

### `POST /api/chat`

**Request:**

```json
{
  "ticker": "RELIANCE.NS",
  "question": "What is my stop loss?",
  "context_data": { /* full analysis object */ }
}
```

**Response:** `{ "answer": "Based on current analysis, your stop loss is at 2400." }`

### WebSocket `/ws/price/{ticker}`

**Messages (server → client):** `{ "price": 2450.50, "symbol": "RELIANCE.NS" }`

---

## Frontend Architecture

- **App.jsx** — State: `data` (analysis), `loading`, `chatHistory`, `livePrice`. Handles search → `analyzeStock()`, WebSocket subscription for `data.symbol`, and chat submit → `askChatbot()`.
- **api.js** — `analyzeStock(ticker)`, `askChatbot(ticker, question, contextData)`; base URL configurable (e.g. `VITE_API_URL`).
- **Components** — Navbar, SearchBar (ticker input), StockChart (multi-timeframe from `chart_data`). Dashboard sections show pivots, trend, sentiment, AI verdict, and chat UI.

---

## ML Pipeline

- **Training:** Use `Backend/app/services/train_model.ipynb` (or equivalent) to produce `lstm_model.h5` and `scaler.gz` from historical OHLCV (e.g. closes + optional features like returns/RSI).
- **Inference:** `ai_engine.py` loads model and scaler at startup; `predict_trend(historical_prices)` expects a list of floats (length ≥ lookback, e.g. 60).
- **Optional ml-service:** `ml-service/app.py` is a standalone entry (e.g. for AWS Lambda) that can run `predict_trend` and a sentiment step on `closes` / `headlines`; the main backend does not depend on it.

---

## Deployment Considerations

- **Backend:** Run with `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Ensure `GROQ_API_KEY` and model paths (`app/models/`) are available. First request loads LSTM and FinBERT (cold start).
- **Frontend:** Set `VITE_API_URL` to the backend URL and run `npm run build`; serve `dist/` via any static host (e.g. Vercel, Netlify, nginx).
- **CORS:** Backend allows all origins (`allow_origins=["*"]`); tighten for production.
- **WebSocket:** Live price URL must match backend (e.g. `wss://api.example.com/ws/price/...` in production).

---

## Summary

| Concern           | Implementation |
|------------------|----------------|
| Market data      | yfinance, pivot math in `marketData.py` |
| Trend            | LSTM in `ai_engine.py`, models in `app/models/` |
| Sentiment        | FinBERT in `news_agent.py` |
| Verdict & Chat   | Groq via LangChain in `llm_engine.py`, `question_agent.py` |
| API              | FastAPI REST + WebSocket in `main.py` |
| UI               | React + Vite, Tailwind, charts, WebSocket client |

For license and contribution details, see [README.md](README.md) and [LICENSE](LICENSE).
