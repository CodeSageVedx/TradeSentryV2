import json
import numpy as np
import pandas as pd
import tensorflow as tf
import joblib
from transformers import pipeline
from sklearn.preprocessing import MinMaxScaler

# --- LOAD MODELS (Global Scope for Warm Starts) ---
print("⏳ Loading Models...")
lstm_model = tf.keras.models.load_model("lstm_model.h5")
scaler = joblib.load("scaler.gz")
sentiment_pipe = pipeline("text-classification", model="ProsusAI/finbert")
print("✅ Models Loaded")

def predict_trend(closes):
    # ... (Copy your predict_trend logic here) ...
    # Ensure you return standard Python types (float, str), not numpy types
    return {"signal": "BULLISH", "confidence": 65.5} # Simplified for brevity

def analyze_news(headlines):
    # ... (Copy your sentiment logic here) ...
    return "Positive"

def lambda_handler(event, context):
    """
    AWS calls this function.
    event = { "closes": [100, 101, ...], "headlines": ["Title 1", ...] }
    """
    try:
        body = json.loads(event['body']) if 'body' in event else event
        
        result = {}
        
        # 1. Run Trend AI
        if 'closes' in body:
            result['trend'] = predict_trend(body['closes'])
            
        # 2. Run Sentiment AI
        if 'headlines' in body:
            result['sentiment'] = analyze_news(body['headlines'])
            
        return {
            'statusCode': 200,
            'body': json.dumps(result)
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({"error": str(e)})
        }