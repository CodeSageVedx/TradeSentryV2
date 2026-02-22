import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import SearchBar from './components/Searchbar';
import StockChart from './components/StockChart';
import { analyzeStock, askChatbot } from './api';
import { ArrowUpCircle, ArrowDownCircle, MessageSquare, Activity, Target, ShieldAlert, Clock } from 'lucide-react';

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [livePrice, setLivePrice] = useState(null);
  
  const handleSearch = async (ticker) => {
    setLoading(true);
    setData(null);
    setChatHistory([]);
    setLivePrice(null);
    
    const result = await analyzeStock(ticker);
    
    if (result && !result.error) {
      setData(result);
      setLivePrice(result.price);
    } else {
      alert("Stock not found or API error!");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!data?.symbol) return;

    const ws = new WebSocket(`ws://127.0.0.1:8000/ws/price/${data.symbol}`);
    
    ws.onopen = () => {
        console.log("✅ Connected to Live Price Feed");
    };

    ws.onmessage = (event) => {
      try {
          const message = JSON.parse(event.data);
          if (message.price) {
            setLivePrice(message.price);
          }
      } catch (e) {
          console.error("WebSocket Parse Error:", e);
      }
    };

    ws.onerror = (error) => {
        console.error("WebSocket Error:", error);
    };

    return () => ws.close();
  }, [data?.symbol]);

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !data) return;

    const userMsg = { role: 'user', content: chatInput };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);

    const answer = await askChatbot(data.symbol, chatInput, data);
    
    setChatHistory(prev => [...prev, { role: 'assistant', content: answer }]);
    setChatLoading(false);
  };

  return (
    <div className="min-h-screen text-white font-sans pb-10 selection:bg-sentry-accent selection:text-sentry-dark relative z-0">
      <Navbar />
      
      <div className="container mx-auto px-4 md:px-6 max-w-7xl relative z-10">
        <div className="py-12">
          <SearchBar onSearch={handleSearch} />
        </div>

        {loading && (
          <div className="text-center py-20 relative z-10">
            <div className="relative inline-block">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-sentry-accent/30 border-t-sentry-accent mx-auto"></div>
              <div className="absolute inset-0 animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-sentry-accent/50 mx-auto blur-sm"></div>
            </div>
            <p className="mt-6 text-gray-300 text-lg animate-pulse font-medium">Analyzing Market Structure...</p>
          </div>
        )}

        {data && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 relative z-10">
            
            {/* --- LEFT COLUMN (8/12) --- */}
            <div className="lg:col-span-8 flex flex-col gap-12">
              
              {/* Header Card */}
              <section className="space-y-4">
                <p className="text-xs uppercase tracking-[0.4em] text-gray-500">Instrument</p>
                <div className="glass-strong bg-white/5 p-10 rounded-3xl border border-white/25 shadow-[0_20px_55px_rgba(0,0,0,0.7)] flex flex-col md:flex-row md:items-center md:justify-between gap-8 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-transparent to-black/50 pointer-events-none z-0"></div>
                  <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-sentry-accent/25 via-purple-500/15 to-green-500/15 rounded-full blur-3xl -mr-40 -mt-40 group-hover:scale-110 transition-all duration-700 pointer-events-none z-0 opacity-70 mix-blend-screen"></div>
                  <div className="relative z-20 flex-1">
                    <h1 className="text-6xl font-bold tracking-tight mb-3 text-white drop-shadow-[0_10px_35px_rgba(0,0,0,0.8)]">{data.symbol}</h1>
                    <div className={`text-7xl font-mono mt-3 font-bold ${livePrice > data.price ? 'text-sentry-green text-glow-green' : livePrice < data.price ? 'text-sentry-red text-glow-red' : 'text-white text-glow-white'}`}>
                      ₹{livePrice || data.price}
                    </div>
                    <p className="text-sm text-gray-400 mt-3">Realtime micro-feed | NSE source</p>
                  </div>

                  <div className={`px-10 py-8 rounded-3xl border-2 flex flex-col items-center min-w-[220px] relative z-20 backdrop-blur-xl transition-all duration-300 ${
                    data.trend_signal.signal === 'BULLISH' 
                      ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/10 border-green-400/50 text-sentry-green glow-green shadow-[0_0_30px_rgba(34,197,94,0.3)]' 
                      : 'bg-gradient-to-br from-red-500/20 to-rose-500/10 border-red-400/50 text-sentry-red glow-red shadow-[0_0_30px_rgba(239,68,68,0.3)]'
                  }`}>
                    {data.trend_signal.signal === 'BULLISH' ? <ArrowUpCircle size={42} className="drop-shadow-[0_0_15px_rgba(34,197,94,0.8)]" /> : <ArrowDownCircle size={42} className="drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]" />}
                    <span className="font-bold text-3xl mt-4">{data.trend_signal.signal}</span>
                    <span className="text-sm opacity-90 mt-2 font-semibold">{data.trend_signal.confidence}% Confidence</span>
                  </div>
                </div>
              </section>

              {/* CHART SECTION */}
              {data.chart_data && (
                <section className="space-y-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.4em] text-gray-500">Stock Chart</p>
                      <p className="text-sm text-gray-400">Intraday & positional perspective</p>
                    </div>
                    <div className="text-sm text-gray-200 flex items-center gap-2 font-semibold">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.9)]"></span>
                      Live feed active @ ₹{livePrice || data.price}
                    </div>
                  </div>
                  <StockChart symbol={data.symbol} data={data.chart_data} livePrice={livePrice} />
                </section>
              )}

              {/* AI Verdict */}
              <section className="space-y-5">
                <p className="text-xs uppercase tracking-[0.4em] text-gray-500">AI Analyst Verdict</p>
                <div className="glass-strong p-8 rounded-3xl border border-white/15 shadow-[0_12px_45px_rgba(0,0,0,0.6)] relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-sentry-accent/20 to-purple-500/15 rounded-full blur-3xl -mr-20 -mt-20 group-hover:scale-110 transition-all duration-500 pointer-events-none z-0 opacity-70"></div>
                  <div className="relative z-20">
                    <h3 className="text-2xl font-semibold mb-4 text-white flex items-center gap-3">
                      <Activity className="h-6 w-6 text-sentry-accent" /> Smart Thesis
                    </h3>
                    <p className="leading-relaxed text-gray-200 text-base">
                      {data.ai_analysis}
                    </p>
                  </div>
                </div>
              </section>

              {/* Resistance Section */}
              <section className="space-y-5">
                <p className="text-xs uppercase tracking-[0.4em] text-gray-500">Resistance</p>
                <div className="glass-strong p-8 rounded-3xl border-2 border-green-500/30 shadow-[0_12px_45px_rgba(34,197,94,0.25)] relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-0"></div>
                  <div className="relative z-20 flex items-center justify-between gap-5">
                    <div className="p-4 bg-gradient-to-br from-green-500/30 to-emerald-500/15 rounded-2xl text-sentry-green border-2 border-green-400/40 shadow-[0_0_25px_rgba(34,197,94,0.35)]">
                      <Target size={30} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 uppercase font-bold tracking-[0.3em]">Target</p>
                      <p className="text-4xl font-mono font-bold text-sentry-green text-glow-green mt-2">₹{data.support_resistance.resistance.target_1}</p>
                      <p className="text-xs text-gray-500 mt-1">Primary resistance / profit booking zone</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Stop Loss Section */}
              <section className="space-y-5">
                <p className="text-xs uppercase tracking-[0.4em] text-gray-500">Stop Loss</p>
                <div className="glass-strong p-8 rounded-3xl border-2 border-red-500/30 shadow-[0_12px_45px_rgba(239,68,68,0.25)] relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-rose-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-0"></div>
                  <div className="relative z-20 flex items-center justify-between gap-5">
                    <div className="p-4 bg-gradient-to-br from-red-500/30 to-rose-500/15 rounded-2xl text-sentry-red border-2 border-red-400/40 shadow-[0_0_25px_rgba(239,68,68,0.35)]">
                      <ShieldAlert size={30} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 uppercase font-bold tracking-[0.3em]">Stop Loss</p>
                      <p className="text-4xl font-mono font-bold text-sentry-red text-glow-red mt-2">₹{data.support_resistance.support.stop_1}</p>
                      <p className="text-xs text-gray-500 mt-1">Critical downside guardrail</p>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* --- RIGHT COLUMN (4/12) --- */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              <section className="space-y-4 sticky top-6">
                <p className="text-xs uppercase tracking-[0.4em] text-gray-500">Chatbot</p>
                <div className="glass-strong rounded-3xl border-2 border-white/20 flex flex-col h-[650px] shadow-[0_12px_45px_rgba(0,0,0,0.65)] relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-sentry-accent/15 to-purple-500/10 rounded-full blur-3xl -mr-20 -mt-20 z-0"></div>
                  <div className="p-6 border-b-2 border-white/20 font-bold flex items-center gap-3 relative z-20 bg-gradient-to-r from-sentry-accent/15 via-purple-500/10 to-transparent">
                    <MessageSquare className="h-6 w-6 text-sentry-accent text-glow-cyan" />
                    <span className="text-glow-white text-lg">Ask TradeSentry</span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-5 relative z-20">
                    {chatHistory.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-5">
                        <div className="relative">
                          <MessageSquare size={56} className="opacity-20" />
                          <div className="absolute inset-0 blur-lg opacity-15">
                            <MessageSquare size={56} className="text-sentry-accent" />
                          </div>
                        </div>
                        <p className="text-base text-center max-w-[220px] text-gray-500 font-medium">
                          "Why is the target 155?"<br/>
                          "Is the news negative?"
                        </p>
                      </div>
                    )}
                    {chatHistory.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl p-5 text-base backdrop-blur-xl border-2 transition-all duration-300 ${
                          msg.role === 'user' 
                            ? 'bg-gradient-to-br from-sentry-accent/90 to-blue-500/80 text-sentry-dark rounded-tr-none border-sentry-accent/40 shadow-[0_4px_25px_rgba(56,189,248,0.4)]' 
                            : 'bg-white/15 text-gray-200 rounded-tl-none border-white/20 shadow-[0_4px_25px_rgba(0,0,0,0.3)]'
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="flex justify-start">
                        <div className="bg-white/15 backdrop-blur-xl rounded-2xl rounded-tl-none p-5 text-sm flex items-center gap-3 border-2 border-white/20">
                          <span className="w-3 h-3 bg-sentry-accent rounded-full animate-bounce shadow-[0_0_10px_rgba(56,189,248,0.8)]"></span>
                          <span className="w-3 h-3 bg-sentry-accent rounded-full animate-bounce delay-75 shadow-[0_0_10px_rgba(56,189,248,0.8)]"></span>
                          <span className="w-3 h-3 bg-sentry-accent rounded-full animate-bounce delay-150 shadow-[0_0_10px_rgba(56,189,248,0.8)]"></span>
                        </div>
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleChatSubmit} className="p-6 border-t-2 border-white/20 bg-gradient-to-t from-black/30 to-transparent rounded-b-3xl relative z-20">
                    <div className="flex gap-4">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Ask about this stock..."
                        className="flex-1 glass text-white px-5 py-4 rounded-xl border-2 border-white/20 focus:border-sentry-accent/60 focus:ring-2 focus:ring-sentry-accent/40 focus:outline-none text-base transition-all placeholder:text-gray-500"
                      />
                      <button 
                        type="submit"
                        disabled={chatLoading || !chatInput.trim()}
                        className="bg-gradient-to-r from-sentry-accent to-blue-500 text-sentry-dark px-8 py-4 rounded-xl font-bold text-base hover:from-sky-400 hover:to-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 glow-cyan shadow-[0_0_25px_rgba(56,189,248,0.5)]"
                      >
                        Send
                      </button>
                    </div>
                  </form>
                </div>
              </section>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

export default App;