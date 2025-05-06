import React, { useState } from 'react';

interface BalanceCardProps {
  address: string;
  balance: string;
  onSend: () => void;
  onReceive: () => void;
  onSwap: () => void;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({ 
  address, 
  balance, 
  onSend, 
  onReceive, 
  onSwap 
}) => {
  const [showFullAddress, setShowFullAddress] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(address);
    alert('Address copied to clipboard!');
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <div 
          className="text-gray-400 text-sm cursor-pointer hover:text-white flex items-center"
          onClick={() => setShowFullAddress(!showFullAddress)}
        >
          {showFullAddress ? address : `${address.substring(0, 6)}...${address.substring(address.length - 4)}`}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              copyToClipboard();
            }}
            className="ml-2 text-gray-500 hover:text-white"
          >
            ⎘
          </button>
        </div>
        <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </div>
      <div className="mb-4">
        <p className="text-gray-400 text-sm">Balance</p>
        <p className="text-3xl font-bold text-white">{balance} ETH</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <button 
          onClick={onSend}
          className="bg-gray-700 hover:bg-gray-600 p-3 rounded-lg flex flex-col items-center"
        >
          <svg className="h-6 w-6 text-green-400 mb-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
          <span className="text-xs">Send</span>
        </button>
        <button 
          onClick={onReceive}
          className="bg-gray-700 hover:bg-gray-600 p-3 rounded-lg flex flex-col items-center"
        >
          <svg className="h-6 w-6 text-green-400 mb-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <span className="text-xs">Receive</span>
        </button>
        <button 
          onClick={onSwap}
          className="bg-gray-700 hover:bg-gray-600 p-3 rounded-lg flex flex-col items-center"
        >
          <svg className="h-6 w-6 text-green-400 mb-1" viewBox="0 0 20 20" fill="currentColor">
            <path d="M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L13.586 5H8zM12 15a1 1 0 100-2H6.414l1.293-1.293a1 1 0 10-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L6.414 15H12z" />
          </svg>
          <span className="text-xs">Swap</span>
        </button>
      </div>
    </div>
  );
};