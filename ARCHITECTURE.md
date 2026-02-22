# Trade Sentry — Architecture

This document describes the system architecture, data flow, and main components of Trade Sentry.

---

## Table of Contents

* High-Level Overview
* System Architecture Diagram
* Backend Internal Components
* Data Flow
* API Contract
* Frontend Architecture
* ML Pipeline
* Deployment Considerations
* Summary

---

# High-Level Overview

Trade Sentry is a **three-tier application**:

1. **Frontend** — React SPA (Vite)
2. **Backend** — FastAPI server (orchestrator)
3. **External Services** — Yahoo Finance, Groq API, optional ML service

The backend acts as the central orchestrator.

---

# System Architecture Diagram

```mermaid
flowchart LR

    subgraph FRONTEND
        A1[Navbar]
        A2[SearchBar]
        A3[StockChart]
        A4[Dashboard]
        A5[Live Price WebSocket Client]
        A6[Chatbot UI]
    end

    subgraph BACKEND
        B1[main.py API and WebSocket]
        B2[marketData Service]
        B3[ai_engine LSTM]
        B4[news_agent FinBERT]
        B5[llm_engine Verdict]
        B6[question_agent Chat]
    end

    subgraph EXTERNAL
        C1[Yahoo Finance]
        C2[Groq API]
        C3[Optional ML Service]
    end

    FRONTEND -->|HTTP| B1
    FRONTEND -->|WebSocket| B1

    B1 --> B2
    B1 --> B3
    B1 --> B4
    B1 --> B5
    B1 --> B6

    B2 --> C1
    B4 --> C1
    B5 --> C2
    B6 --> C2
    B3 --> C3
```

---

# Backend Processing Flow

```mermaid
sequenceDiagram
    participant F as Frontend
    participant M as main.py
    participant MD as marketData
    participant AI as ai_engine
    participant NA as news_agent
    participant LLM as llm_engine

    F->>M: GET /api/analyze/{ticker}
    M->>MD: get_pivot_points
    M->>MD: get_stock_data
    M->>AI: predict_trend
    M->>NA: get_news_sentiment
    M->>LLM: get_ai_verdict
    LLM-->>M: verdict
    M-->>F: Full Analysis JSON
```

---

# Chat Flow

```mermaid
sequenceDiagram
    participant F as Frontend
    participant M as main.py
    participant QA as question_agent
    participant G as Groq API

    F->>M: POST /api/chat
    M->>QA: get_chat_response
    QA->>G: LLM request
    G-->>QA: answer
    QA-->>M: formatted answer
    M-->>F: JSON response
```

---

# Backend Components

## main.py

Role:

* Entry point
* CORS
* Routes
* WebSocket handler

Endpoints:

* GET /
* GET /api/analyze/{ticker}
* POST /api/chat
* WS /ws/price/{ticker}

---

## marketData Service

Functions:

* validate_indian_ticker
* get_stock_data
* get_pivot_points
* get_full_chart_data

Source:

* Yahoo Finance via yfinance

---

## ai_engine

Model:

* LSTM (TensorFlow / Keras)

Files:

* app/models/lstm_model.h5
* app/models/scaler.gz

Input:

* Last 60 to 100 closes

Output:

```json
{
  "signal": "BULLISH",
  "confidence": 72.5
}
```

---

## news_agent

Model:

* FinBERT (ProsusAI/finbert)

Input:

* Top headlines from yfinance

Output:

* Aggregate sentiment label

---

## llm_engine

LLM:

* Groq (openai/gpt-oss-20b via LangChain)

Input:

* Ticker
* Price
* Pivots
* Trend
* Sentiment

Output:

```json
{
  "verdict": "BUY",
  "explanation": "Short explanation"
}
```

---

## question_agent

Context-aware chatbot using Groq.

Input:

* Ticker
* Question
* context_data (full analysis response)

Output:

```json
{
  "answer": "Natural language response grounded in context"
}
```

---

# API Contract

## GET /api/analyze/{ticker}

Success:

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
  "chart_data": {
    "1D": [],
    "5D": [],
    "1M": [],
    "1Y": []
  }
}
```

Error:

```json
{
  "error": "Invalid Ticker or Data Unavailable"
}
```

---

## POST /api/chat

Request:

```json
{
  "ticker": "RELIANCE.NS",
  "question": "What is my stop loss?",
  "context_data": {}
}
```

Response:

```json
{
  "answer": "Based on current analysis, your stop loss is at 2400."
}
```

---

# Live Price WebSocket

Endpoint:

```
/ws/price/{ticker}
```

Server message:

```json
{
  "price": 2450.50,
  "symbol": "RELIANCE.NS"
}
```

Updates every 2 seconds until disconnect.

---

# ML Pipeline

Training notebook:

```
Backend/app/services/train_model.ipynb
```

Outputs:

* lstm_model.h5
* scaler.gz

Inference:

* Loaded at startup
* predict_trend expects >= 60 data points

Optional:

* ml-service/app.py for Lambda deployment

---

# Deployment

Backend:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Frontend:

```bash
npm run build
```

Environment:

```
VITE_API_URL=https://api.yourdomain.com
GROQ_API_KEY=your_key
```

CORS:

```
allow_origins=["*"]
```

Restrict in production.

WebSocket production example:

```
wss://api.example.com/ws/price/RELIANCE.NS
```

---

# Summary

| Concern     | Implementation      |
| ----------- | ------------------- |
| Market data | yfinance            |
| Trend       | LSTM in ai_engine   |
| Sentiment   | FinBERT             |
| Verdict     | Groq LLM            |
| API         | FastAPI + WebSocket |
| UI          | React + Vite        |

---
