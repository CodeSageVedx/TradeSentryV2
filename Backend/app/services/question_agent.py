import os
from dotenv import load_dotenv
from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq

# 1. Load Environment Variables
load_dotenv()

if not os.getenv("GROQ_API_KEY"):
    print("⚠️ WARNING: GROQ_API_KEY not found in environment.")

# 2. Setup LLM (Llama 3)
try:
    llm = ChatGroq(
        model="openai/gpt-oss-20b", 
        temperature=0.2,
        max_tokens=500
    )
except Exception as e:
    print(f"Error initializing ChatGroq: {e}")
    llm = None

def get_chat_response(ticker, query, context_data):
    """
    Handles follow-up questions (The Chatbot).
    """
    if llm is None:
        return "Error: LLM client not initialized. Check API Key."

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
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("user", "{input}")
    ])
    
    chain = prompt | llm
    
    try:
        response = chain.invoke({"input": query})
        return response.content
    except Exception as e:
        print(f"LLM Invocation Error: {str(e)}")
        return f"Error: {str(e)}"

# --- TEST ---
if __name__ == "__main__":
    fake_context = {
        "price": 155.0,
        "trend_signal": {"signal": "BULLISH", "confidence": 65},
        "support_resistance": {
            "pivot_point": 158.0,
            "resistance": {"target_1": 162},
            "support": {"stop_1": 152}
        },
        "sentiment_signal": "Positive"
    }
    
    print(get_chat_response("TATASTEEL", "I want to know the stock value is falling the model is predicting a rise why?", fake_context))