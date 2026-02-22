import streamlit as st
import requests

# Configure page
st.set_page_config(page_title="TradeSentry Prototype", page_icon="📈")
st.title("📈 TradeSentry - AI Analyst")

# Session State to hold context between refreshes
if 'context_data' not in st.session_state:
    st.session_state.context_data = None
if 'ticker' not in st.session_state:
    st.session_state.ticker = ""
if "messages" not in st.session_state:
    st.session_state.messages = []

# --- SIDEBAR: INPUT ---
with st.sidebar:
    st.header("Stock Selector")
    ticker_input = st.text_input("Enter Ticker (NSE):", value="TATASTEEL")
    
    if st.button("Run Analysis 🚀"):
        st.session_state.ticker = ticker_input
        # Reset chat when changing stock
        st.session_state.messages = []
        st.session_state.context_data = None
        
        with st.spinner(f"Fetching data & running AI models for {ticker_input}..."):
            try:
                # Call your FastAPI Backend
                response = requests.get(f"http://127.0.0.1:8000/api/analyze/{ticker_input}")
                
                if response.status_code == 200:
                    st.session_state.context_data = response.json()
                    st.success("Analysis Ready!")
                else:
                    st.error(f"Error: {response.status_code}")
            except Exception as e:
                st.error(f"Connection failed: {e}. Is FastAPI running?")

# --- MAIN CONTENT ---
if st.session_state.context_data:
    data = st.session_state.context_data
    
    # 1. Dashboard Top Row
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Current Price", f"₹{data['price']}")
    with col2:
        trend = data['trend_signal']['signal']
        conf = data['trend_signal']['confidence']
        color = "green" if trend == "BULLISH" else "red"
        st.markdown(f"**Trend:** :{color}[{trend}]")
        st.caption(f"Confidence: {conf}%")
    with col3:
        st.metric("News Sentiment", data['sentiment_signal'])

    # 2. AI Verdict Box
    st.subheader("🤖 AI Risk Manager Verdict")
    st.info(data['ai_analysis'])
    
    st.divider()
    
    # 3. Chat Interface
    st.subheader(f"💬 Chat with Analyst about {st.session_state.ticker}")
    
    # Display chat history
    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])

    # User Input
    if prompt := st.chat_input("Ask about support levels, risks, or strategy..."):
        # Add user message to chat history
        st.session_state.messages.append({"role": "user", "content": prompt})
        with st.chat_message("user"):
            st.markdown(prompt)

        # Get AI response
        with st.chat_message("assistant"):
            with st.spinner("Thinking..."):
                try:
                    # Prepare payload for /api/chat endpoint
                    payload = {
                        "ticker": st.session_state.ticker,
                        "question": prompt,
                        "context_data": st.session_state.context_data
                    }
                    
                    # Call FastAPI Chat Endpoint
                    res = requests.post("http://127.0.0.1:8000/api/chat", json=payload)
                    
                    if res.status_code == 200:
                        answer = res.json()['answer']
                        st.markdown(answer)
                        st.session_state.messages.append({"role": "assistant", "content": answer})
                    else:
                        st.error("Failed to get response from AI.")
                        
                except Exception as e:
                    st.error(f"Chat Error: {e}")
else:
    st.info("👈 Enter a stock ticker in the sidebar to start.")