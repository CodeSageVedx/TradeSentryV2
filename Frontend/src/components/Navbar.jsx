import React from 'react';
import { LineChart } from 'lucide-react';

const Navbar = () => {
  return (
    <nav className="glass-strong border-b border-white/15 px-6 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between relative z-10 shadow-[0_25px_45px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
      <div className="flex items-center gap-4 relative z-20">
        <div className="relative">
          <LineChart className="text-sentry-accent h-11 w-11 relative z-10 drop-shadow-[0_0_18px_rgba(56,189,248,0.8)]" />
          <div className="absolute inset-0 h-11 w-11 bg-sentry-accent/40 blur-xl rounded-full"></div>
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-xs uppercase tracking-[0.45em] text-gray-400">TRADE SENTRY</span>
          <span className="text-2xl md:text-3xl font-black tracking-wide bg-gradient-to-r from-white via-sentry-accent to-sky-400 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(56,189,248,0.45)]">
            Quantum Market Desk
          </span>
        </div>
      </div>
      <div className="text-xs md:text-sm text-slate-200 font-semibold tracking-[0.4em] uppercase relative z-20">
        AI-Powered Quant Analyst
      </div>
    </nav>
  );
};

export default Navbar;