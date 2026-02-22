import os
from dotenv import load_dotenv
from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq

# 1. Load Environment Variables
load_dotenv()

if not os.getenv("GROQ_API_KEY"):
    print("⚠️ WARNING: GROQ_API_KEY not found in environment.")

# 2. Setup GROQ based LLM (ChatGpt)
llm = ChatGroq(
    model="openai/gpt-oss-20b", 
    temperature=0.2,
    max_tokens=500
)

def get_ai_verdict(ticker, price_data, pivot_data, trend_signal, sentiment_signal):
    """
    Synthesizes Technicals + AI Trend + News Sentiment into a final trading decision.
    """
    
    system_prompt = """
    You are 'TradeSentry', a Senior Quantitative Risk Manager at a top hedge fund.
    Your goal is to synthesize conflicting data into a clear Buy/Sell/Hold decision.
    
    RULES:
    1. Be conservative. If Trend is UP but Price < Pivot, recommend 'WAIT'.
    2. If Trend is DOWN and Price < Pivot, recommend 'SELL'.
    3. Use the provided Stop Loss levels in your advice.
    4. Output format: A concise decision and a 2-sentence explanation.
    """
    
    user_prompt = f"""
    Analyze {ticker}. Here is the real-time data:
    
    [1. MARKET STRUCTURE (Math)]
    - Current Price: {price_data}
    - Pivot Point (Center): {pivot_data.get('pivot_point')}
    - Resistance (Target): {pivot_data.get('resistance', {}).get('target_1')}
    - Support (Stop Loss): {pivot_data.get('support', {}).get('stop_1')}
    
    [2. PREDICTIVE MODELS (AI)]
    - LSTM Trend Model: {trend_signal.get('signal')} (Confidence: {trend_signal.get('confidence')}%)
    - News Sentiment: {sentiment_signal}
    
    TASK:
    Based on this, provide:
    1. Verdict: (STRONG BUY | BUY | WAIT/HOLD | SELL | STRONG SELL)
    2. Reasoning: Why? (Reference the Pivot levels and Model confidence).
    """
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("user", user_prompt)
    ])
    
    chain = prompt | llm
    
    try:
        response = chain.invoke({})
        return response.content
    except Exception as e:
        return f"AI Error: {str(e)}"

def get_chat_response(ticker, query, context_data):
    """
    Handles follow-up questions (The Chatbot).
    """

    stock_context = f"""
    STOCK: {ticker}
    LIVE MARKET DATA:
    - Current Price: {context_data.get('price')}
    - AI Trend Prediction: {context_data.get('trend_signal', {}).get('signal')} 
    - Trend Confidence: {context_data.get('trend_signal', {}).get('confidence')}%
    - Key Pivot Point: {context_data.get('support_resistance', {}).get('pivot_point')}
    - Resistance (Target): {context_data.get('support_resistance', {}).get('resistance', {}).get('target_1')}
    - Support (Stop Loss): {context_data.get('support_resistance', {}).get('support', {}).get('stop_1')}
    - News Sentiment: {context_data.get('sentiment_signal')}
    """

    system_prompt = f"""You are a helpful financial assistant for the TradeSentry platform.
    Use the following real-time data to answer the user's question about {ticker}.
    
    CONTEXT DATA:
    {stock_context}
    
    RULES:
    1. Only answer based on the data provided above.
    2. Keep answers short, factual, and professional.
    3. If the user asks for advice, refer them to the specific Support/Resistance levels.
    """
    
    chain = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("user", "{input}")
    ])
    
    try:
        return chain.invoke({"input": query}).content
    except Exception:
        return "I am unable to process that question right now."

# --- SIMPLIFIED INTEGRATION TEST ---
if __name__ == "__main__":
    print("🤖 Running Direct Test...")
    import numpy as np
    import pandas as pd
    import yfinance as yf
    import tensorflow as tf
    import joblib
    from sklearn.preprocessing import MinMaxScaler

    try:
        model = tf.keras.models.load_model("app/models/lstm_model.h5")
        print("Model Loaded Directly")
    except:
        print("Could not load model.")
        exit()

    # 2. Fetch Data
    ticker = "TATASTEEL.NS"
    print(f"Fetching data for {ticker}...")
    df = yf.download(ticker, period="1y", progress=False)
    
    # 3. Process Data (Same logic as before, just inline)
    df['Return'] = df['Close'].pct_change()
    
    # Simple RSI calc
    delta = df['Close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / loss
    df['RSI'] = 100 - (100 / (1 + rs))
    
    df.dropna(inplace=True)
    
    # Prepare inputs
    data = df[['Return', 'RSI']].tail(60).values
    scaler = MinMaxScaler(feature_range=(-1, 1))
    scaled_data = scaler.fit_transform(data)
    X_input = np.array([scaled_data])
    
    # 4. Predict
    prediction = model.predict(X_input, verbose=0)
    prob = float(prediction[0][0])
    
    trend = {
        "signal": "BULLISH" if prob > 0.5 else "BEARISH",
        "confidence": round(prob * 100, 2) if prob > 0.5 else round((1-prob)*100, 2)
    }
    
    # 5. Fake Pivots for the test (we just want to test the LLM)
    current_price = float(df['Close'].iloc[-1])
    pivots = {
        "pivot_point": round(current_price * 1.01, 2),
        "resistance": {"target_1": round(current_price * 1.02, 2)},
        "support": {"stop_1": round(current_price * 0.98, 2)}
    }
    
    # 6. Run LLM
    print("Asking AI Analyst...")
    verdict = get_ai_verdict(ticker, current_price, pivots, trend, "Neutral")
    
    print("\n" + "="*40)
    print(verdict)
    print("="*40)