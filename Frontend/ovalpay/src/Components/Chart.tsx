// src/Components/Chart.tsx
import React from 'react';

interface MarketData {
  current_price: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  total_volume: number;
  sparkline: number[];
}

interface ChartProps {
  data: MarketData;
}

export const Chart: React.FC<ChartProps> = ({ data }) => {
  return (
    <div className="bg-gray-800 rounded-xl p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold">Price Performance</h2>
        <div className="flex space-x-2">
          <button className="text-green-400 bg-green-400 bg-opacity-10 px-3 py-1 rounded-full text-sm">1D</button>
          <button className="text-gray-400 px-3 py-1 rounded-full text-sm">1W</button>
          <button className="text-gray-400 px-3 py-1 rounded-full text-sm">1M</button>
          <button className="text-gray-400 px-3 py-1 rounded-full text-sm">1Y</button>
        </div>
      </div>
      
      {/* Chart implementation */}
      <div className="h-48 w-full relative mb-2">
        <svg width="100%" height="100%" viewBox="0 0 300 100" preserveAspectRatio="none">
          <polyline
            fill="none"
            stroke="#4ade80"
            strokeWidth="2"
            points={data.sparkline
              .map((price, i) => {
                const x = (i / (data.sparkline.length - 1)) * 300;
                const y = 100 - ((price - Math.min(...data.sparkline)) / 
                  (Math.max(...data.sparkline) - Math.min(...data.sparkline))) * 100;
                return `${x},${y}`;
              })
              .join(' ')}
          />
        </svg>
      </div>
      
      <div className="flex justify-center w-full">
        <div className="grid grid-cols-3 gap-x-80">
          <div>
            <p className="text-gray-400 text-xs">Current Price</p>
            <p className="font-semibold">${data.current_price.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">24h Change</p>
            <p className={`font-semibold ${
              data.price_change_percentage_24h >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {data.price_change_percentage_24h.toFixed(2)}%
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">24h Volume</p>
            <p className="font-semibold">${(data.total_volume / 1000000).toFixed(1)}M</p>
          </div>
      </div>
      </div>
    </div>
  );
};