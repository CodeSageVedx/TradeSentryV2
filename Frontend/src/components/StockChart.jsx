import React, { useState, useEffect } from 'react';
import ReactApexChart from 'react-apexcharts';

const StockChart = ({ symbol, data, livePrice }) => {
  const [timeframe, setTimeframe] = useState('1D');
  const [chartSeries, setChartSeries] = useState([]);

  // 1. Helper: Format Date to Indian Time (IST)
  const formatIST = (isoString, options) => {
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return "";
      
      return new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        ...options
      }).format(date);
    } catch (e) {
      return "";
    }
  };

  // 2. Initialize & Sort Chart Data
  useEffect(() => {
    if (data && data[timeframe] && data[timeframe].length > 0) {
      // A. SORT DATA (Critical Fix for "Messy Lines")
      const sortedData = [...data[timeframe]].sort((a, b) => 
        new Date(a.time).getTime() - new Date(b.time).getTime()
      );

      const formattedData = sortedData.map(item => {
        let xLabel = "";
        
        // 1D View: Show Time (09:15)
        if (timeframe === '1D') {
          xLabel = formatIST(item.time, { 
            hour: '2-digit', minute: '2-digit', hour12: false 
          });
        } 
        // 5D View: Show Date + Time (24 Nov 09:15)
        else if (timeframe === '5D') {
          xLabel = formatIST(item.time, { 
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false 
          });
        }
        else {
          xLabel = formatIST(item.time, { 
            day: 'numeric', month: 'short', year: '2-digit' 
          });
        }

        return {
          x: xLabel, 
          y: [
            parseFloat(item.open).toFixed(2), 
            parseFloat(item.high).toFixed(2), 
            parseFloat(item.low).toFixed(2), 
            parseFloat(item.close).toFixed(2)
          ]
        };
      });

      setChartSeries([{ data: formattedData }]);
    }
  }, [data, timeframe]);

  // 3. Live Update Logic
  useEffect(() => {
    if (livePrice && chartSeries.length > 0 && timeframe === '1D') {
      setChartSeries(prevSeries => {
        const currentData = prevSeries[0].data;
        if (currentData.length === 0) return prevSeries;

        const lastCandle = currentData[currentData.length - 1];
        const newClose = parseFloat(livePrice);
        const newHigh = Math.max(parseFloat(lastCandle.y[1]), newClose);
        const newLow = Math.min(parseFloat(lastCandle.y[2]), newClose);

        const updatedLastCandle = {
          x: lastCandle.x,
          y: [lastCandle.y[0], newHigh, newLow, newClose]
        };
        
        return [{ data: [...currentData.slice(0, -1), updatedLastCandle] }];
      });
    }
  }, [livePrice]);

  const options = {
    chart: {
      type: 'candlestick',
      height: 400,
      toolbar: { show: false },
      background: 'transparent',
      animations: { enabled: false }
    },
    title: {
      text: `${symbol} - ${timeframe} View (IST)`,
      align: 'left',
      style: { color: '#94a3b8', fontSize: '14px' }
    },
    xaxis: {
      type: 'category',
      tickAmount: 12,    // Automatically show ~6 labels (e.g., 9:15, 10:15, 11:15...)
      labels: { 
        style: { colors: '#64748b', fontSize: '11px' },
        rotate: -45,
        trim: true
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false }
    },
    yaxis: {
      tooltip: { enabled: true },
      labels: { 
        style: { colors: '#64748b' },
        formatter: (value) => `₹${value.toFixed(0)}`
      }
    },
    grid: {
      borderColor: '#334155',
      strokeDashArray: 4
    },
    theme: {
      mode: 'dark'
    },
    plotOptions: {
      candlestick: {
        colors: {
          upward: '#22C55E',
          downward: '#EF4444'
        },
        wick: { useFillColor: true }
      }
    }
  };

  return (
    <div className="glass-strong p-8 rounded-3xl border-2 border-white/20 shadow-[0_8px_32px_0_rgba(56,189,248,0.15)] h-[500px] relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-sentry-accent/15 via-purple-500/10 to-green-500/10 rounded-full blur-3xl -mr-32 -mt-32 group-hover:scale-110 transition-all duration-700 z-0"></div>
      <div className="flex justify-end gap-3 mb-6 relative z-20">
        {['1D', '5D', '1Y'].map((tf) => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={`px-6 py-3 text-sm font-bold rounded-xl transition-all duration-300 border-2 backdrop-blur-xl ${
              timeframe === tf 
                ? 'bg-gradient-to-r from-sentry-accent to-blue-500 text-sentry-dark border-sentry-accent/60 glow-cyan shadow-[0_0_20px_rgba(56,189,248,0.5)]' 
                : 'glass text-gray-400 hover:text-white border-white/20 hover:border-white/30 hover:bg-white/5'
            }`}
          >
            {tf}
          </button>
        ))}
      </div>

      {chartSeries.length > 0 ? (
        <div className="relative z-20">
          <ReactApexChart 
            options={options} 
            series={chartSeries} 
            type="candlestick" 
            height={400} 
          />
        </div>
      ) : (
        <div className="h-[400px] flex items-center justify-center text-gray-400 relative z-20">
          <div className="text-center">
            <p className="text-sm font-medium">No data available for {timeframe}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockChart;