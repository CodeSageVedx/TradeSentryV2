import numpy as np
import tensorflow as tf
import joblib
import pandas as pd
import os
from sklearn.preprocessing import MinMaxScaler


MODEL_PATH = "app/models/lstm_model.h5" 

SCALER_PATH = "app/models/scaler.gz"
LOOKBACK = 60

lstm_model = None

def load_ai_models():
    """
    Loads the trained LSTM model from the disk when the server starts.
    """
    global lstm_model
    try:
        if os.path.exists(MODEL_PATH):
            lstm_model = tf.keras.models.load_model(MODEL_PATH)
            print(f"LSTM Model loaded from {MODEL_PATH}")
        else:
            print(f"Model file not found at {MODEL_PATH}. Please run train_model.py first.")
    except Exception as e:
        print(f"Error loading LSTM model: {e}")

# Load models at startup
load_ai_models()

def calculate_rsi(series, period=14):
    """
    Calculates the Relative Strength Index (RSI) to match training data features.
    """
    delta = series.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    
    rs = gain / loss
    return 100 - (100 / (1 + rs))

def predict_trend(historical_prices):
    """
    Takes raw closing prices, processes them (Returns + RSI), and returns AI prediction.
    
    Args:
        historical_prices (list): List of float prices (needs ~75+ points for RSI calc)
        
    Returns:
        dict: {'signal': 'BULLISH'/'BEARISH', 'confidence': float}
    """
    if lstm_model is None:
        return {"signal": "NEUTRAL", "confidence": 0}

    try:
        # 1. Convert List to DataFrame
        df = pd.DataFrame(historical_prices, columns=['Close'])
        
        # 2. Feature Engineering - Returns & RSI
        df['Return'] = df['Close'].pct_change()
        df['RSI'] = calculate_rsi(df['Close'])
        
        df.dropna(inplace=True)
        
        # Validation
        if len(df) < LOOKBACK:
            return {"signal": "INSUFFICIENT_DATA", "confidence": 0}
            
        # 3. Prepare Input Data
        last_60_days = df.tail(LOOKBACK)
        data = last_60_days[['Return', 'RSI']].values
        
        scaler = MinMaxScaler(feature_range=(-1, 1))
        scaled_data = scaler.fit_transform(data)
        X_input = np.array([scaled_data])
        
        # 5. Predict
        prediction = lstm_model.predict(X_input, verbose=0)
        probability = float(prediction[0][0])
        
        if probability > 0.5:
            return {
                "signal": "BULLISH", 
                "confidence": round(probability * 100, 2)
            }
        else:
            return {
                "signal": "BEARISH", 
                "confidence": round((1 - probability) * 100, 2)
            }
            
    except Exception as e:
        print(f"Prediction Logic Error: {e}")
        return {"signal": "ERROR", "confidence": 0}

#Test block
if __name__ == "__main__":
    print("Running test...")
    fake_prices = [100 + i + (i*0.1) for i in range(100)] 
    print(predict_trend(fake_prices))