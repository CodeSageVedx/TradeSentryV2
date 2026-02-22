import yfinance as yf
import pandas as pd
import numpy as np

def validate_indian_ticker(ticker):
    """Ensures the ticker ends with .NS or .BO"""
    ticker = ticker.upper().strip().replace(" ", "")
    if not ticker.endswith(".NS") and not ticker.endswith(".BO"):
        ticker = f"{ticker}.NS"
    return ticker

def get_stock_data(ticker, period="2y", interval="1d"):
    ticker = validate_indian_ticker(ticker)
    
    try:
        df = yf.download(ticker, period=period, interval=interval, progress=False, multi_level_index=False)
        
        if df.empty:
            return None

        required_cols = ['Open', 'High', 'Low', 'Close', 'Volume']
        
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)
            
        # Filter valid columns only
        available_cols = [col for col in required_cols if col in df.columns]
        return df[available_cols]

    except Exception as e:
        print(f"Data Fetch Error: {e}")
        return None

def get_full_chart_data(ticker):

    ticker = validate_indian_ticker(ticker)
    
    datasets = {}
    
    # 1. Intraday (Today)
    df_1d = get_stock_data(ticker, period="1d", interval="1m")
    if df_1d is not None:
        last_active_date = df_1d.index[-1].date()
        daily_mask = df_1d.index.date == last_active_date
        df_1d_clean = df_1d[daily_mask]
        datasets['1D'] = df_1d_clean.reset_index().apply(lambda x: {
            "time": x.iloc[0].isoformat(), 
            "open": x['Open'], "high": x['High'], "low": x['Low'], "close": x['Close']
        }, axis=1).tolist()
        
    # 2. Weekly (5 Days)
    df_5d = get_stock_data(ticker, period="5d", interval="5m")
    if df_5d is not None:
        datasets['5D'] = df_5d.reset_index().apply(lambda x: {
            "time": x.iloc[0].isoformat(), 
            "open": x['Open'], "high": x['High'], "low": x['Low'], "close": x['Close']
        }, axis=1).tolist()

    # 3. Monthly (1 Month)
    df_1m = get_stock_data(ticker, period="1mo", interval="60m")
    if df_1m is not None:
        datasets['1M'] = df_1m.reset_index().apply(lambda x: {
            "time": x.iloc[0].isoformat(), 
            "open": x['Open'], "high": x['High'], "low": x['Low'], "close": x['Close']
        }, axis=1).tolist()

    # 4. Yearly (Daily Candles)
    df_1y = get_stock_data(ticker, period="1y", interval="1d")
    if df_1y is not None:
        datasets['1Y'] = df_1y.reset_index().apply(lambda x: {
            "time": x.iloc[0].isoformat(), 
            "open": x['Open'], "high": x['High'], "low": x['Low'], "close": x['Close']
        }, axis=1).tolist()
        
    return datasets

def get_pivot_points(ticker):
    ticker = validate_indian_ticker(ticker)
    
    # Fetch 10 days to be safe
    df = get_stock_data(ticker, period="10d")
    
    if df is None or len(df) < 2:
        return None

    try:
        # 1. Get Today's Live Price (Last row)
        today_candle = df.iloc[-1]
        today_close = float(today_candle['Close'])

        # 2. Get Yesterday's Completed Candle for Pivot Math (2nd to last row)
        last_candle = df.iloc[-2]
        
        high = float(last_candle['High'])
        low = float(last_candle['Low'])
        close = float(last_candle['Close'])
        
        # 3. Pivot Formulas
        pivot = (high + low + close) / 3
        r1 = (2 * pivot) - low
        r2 = pivot + (high - low)
        s1 = (2 * pivot) - high
        s2 = pivot - (high - low)
        
        return {
            "symbol": ticker,
            "current_price": round(today_close, 2),
            "pivot_point": round(pivot, 2),
            "resistance": {
                "target_1": round(r1, 2),
                "target_2": round(r2, 2)
            },
            "support": {
                "stop_1": round(s1, 2),
                "stop_2": round(s2, 2)
            }
        }
    except Exception as e:
        print(f"Calculation Error: {e}")
        return None

if __name__ == "__main__":
    print(get_pivot_points("RELIANCE"))