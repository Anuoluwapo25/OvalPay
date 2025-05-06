import React, { useState } from 'react';

interface Token {
  symbol: string;
  balance: string;
  contractAddress: string;
}

interface SendFormProps {
  tokens: Token[];
  onSubmit: (data: { amount: string; address: string; token: string }) => Promise<void>;
  onClose: () => void;
  isLoading: boolean;
}

export const SendForm: React.FC<SendFormProps> = ({ tokens, onSubmit, onClose, isLoading }) => {
  const [formData, setFormData] = useState({
    amount: '',
    address: '',
    token: 'ETH' 
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Send Crypto</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1">Token</label>
            <select
              value={formData.token}
              onChange={(e) => setFormData({...formData, token: e.target.value})}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg"
            >
              {tokens.map(token => (
                <option key={token.symbol} value={token.symbol}>
                  {token.symbol} (Balance: {token.balance})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">Recipient Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-400 text-sm mb-1">Amount</label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({...formData, amount: e.target.value})}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg"
              required
              min="0"
              step="0.00000001"
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 rounded-lg font-medium ${
              isLoading ? 'bg-gray-600' : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
};