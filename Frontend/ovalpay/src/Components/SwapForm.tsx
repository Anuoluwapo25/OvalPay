import React, { useState } from 'react';

interface SwapFormProps {
  balance: string;
  onClose: () => void;
}

export const SwapForm: React.FC<SwapFormProps> = ({ balance, onClose }) => {
  const [fromToken, setFromToken] = useState('ETH');
  const [toToken, setToToken] = useState('USDT');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSwap = async () => {
    setIsLoading(true);
    try {
      // Implement your actual swap logic here
      // This would connect to your swap API or smart contract
      console.log(`Swapping ${amount} ${fromToken} to ${toToken}`);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      alert(`Successfully swapped ${amount} ${fromToken} to ${toToken}`);
      onClose();
    } catch (error) {
      console.error('Swap failed:', error);
      alert('Swap failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const setMaxAmount = () => {
    setAmount(parseFloat(balance).toFixed(8));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Swap Tokens</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* From Token */}
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <label className="text-gray-400">From</label>
              <span className="text-sm text-gray-400">Balance: {parseFloat(balance).toFixed(8)}</span>
            </div>
            <div className="flex items-center">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                className="bg-transparent text-xl w-full outline-none"
              />
              <div className="flex items-center space-x-2">
                <button 
                  onClick={setMaxAmount}
                  className="text-xs bg-gray-600 hover:bg-gray-500 px-2 py-1 rounded"
                >
                  MAX
                </button>
                <select
                  value={fromToken}
                  onChange={(e) => setFromToken(e.target.value)}
                  className="bg-gray-600 rounded text-sm p-1"
                >
                  <option value="ETH">ETH</option>
                  <option value="USDT">USDT</option>
                  <option value="WBTC">WBTC</option>
                </select>
              </div>
            </div>
          </div>

          {/* Swap Direction Arrow */}
          <div className="flex justify-center">
            <button className="bg-gray-600 p-2 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* To Token */}
          <div className="bg-gray-700 rounded-lg p-4">
            <label className="text-gray-400 block mb-2">To</label>
            <div className="flex items-center">
              <input
                type="text"
                value={`${amount ? (parseFloat(amount) * 0.95).toFixed(6) : '0.0'}`}
                readOnly
                className="bg-transparent text-xl w-full outline-none"
              />
              <select
                value={toToken}
                onChange={(e) => setToToken(e.target.value)}
                className="bg-gray-600 rounded text-sm p-1"
              >
                <option value="USDT">USDT</option>
                <option value="ETH">ETH</option>
                <option value="WBTC">WBTC</option>
              </select>
            </div>
          </div>

          {/* Price Info */}
          <div className="bg-gray-700 rounded-lg p-3 text-center text-sm">
            <p>1 ETH = 1,800 USDT</p>
            <p className="text-gray-400">Slippage tolerance: 0.5%</p>
          </div>

          {/* Action Buttons */}
          <button
            onClick={handleSwap}
            disabled={!amount || isLoading}
            className={`w-full py-3 rounded-lg font-medium ${
              !amount || isLoading 
                ? 'bg-gray-600 text-gray-400' 
                : 'bg-green-500 hover:bg-green-600 text-black'
            }`}
          >
            {isLoading ? 'Processing...' : 'Swap'}
          </button>
        </div>
      </div>
    </div>
  );
};