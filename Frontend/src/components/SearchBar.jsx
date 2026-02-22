import React, { useState } from 'react';
import { Search } from 'lucide-react';

const SearchBar = ({ onSearch }) => {
  const [ticker, setTicker] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (ticker.trim()) {
      onSearch(ticker.toUpperCase());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto my-10 relative z-20">
      <div className="flex flex-col gap-3 text-left">
        <span className="text-[11px] uppercase tracking-[0.55em] text-gray-400">Lookup</span>
        <div className="relative group">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-sentry-accent via-purple-500 to-sky-500 blur-[30px] opacity-60 group-hover:opacity-90 transition-opacity duration-300"></div>
          <div className="relative rounded-3xl border border-white/15 bg-gradient-to-r from-[#050c1c]/90 via-[#081024]/90 to-[#050c1c]/90 backdrop-blur-2xl shadow-[0_25px_55px_rgba(0,0,0,0.8)] flex items-center gap-4 px-5 py-5">
            <div className="flex items-center flex-1 relative">
              <Search className="absolute left-5 text-gray-400 h-5 w-5 group-focus-within:text-sentry-accent transition-colors z-10" />
              <input
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                placeholder="Enter Indian Stock Ticker (e.g. TATASTEEL, RELIANCE, INFY)..."
                className="w-full bg-gradient-to-r from-white/5 to-white/0 text-white pl-14 pr-4 py-4 rounded-2xl border border-white/10 focus:border-sentry-accent/70 focus:ring-2 focus:ring-sentry-accent/30 focus:outline-none placeholder:text-gray-500 text-lg transition-all"
              />
            </div>
            <button 
              type="submit"
              className="bg-gradient-to-r from-sentry-accent via-sky-400 to-blue-500 text-sentry-dark px-8 py-4 rounded-2xl font-bold hover:scale-[1.03] transition-all duration-300 shadow-[0_15px_35px_rgba(56,189,248,0.4)] text-lg"
            >
              Analyze
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};

export default SearchBar;