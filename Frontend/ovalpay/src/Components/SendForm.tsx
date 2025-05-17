import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Token {
  symbol: string;
  balance: string;
  contractAddress: string;
}

interface SendFormProps {
  tokens: Token[];
  onClose?: () => void;
}

export const SendForm: React.FC<SendFormProps> = ({ tokens, onClose }) => {
  const [formData, setFormData] = useState({
    amount: '',
    address: '',
    token: tokens.length > 0 ? tokens[0].symbol : 'ETH'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [walletData, setWalletData] = useState<any>(null);

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    try {
      const { data } = await axios.get(
        'http://127.0.0.1:8000/api/wallet/dashboard',
        {
          headers: {
            'Authorization': `Token ${localStorage.getItem('token')}`
          }
        }
      );
      setWalletData(data);
      console.log("Fetched wallet data:", data);
    } catch (error) {
      console.error('Failed to fetch wallet data', error);
    }
  };


  useEffect(() => {
    console.log("Tokens prop received:", tokens);
  }, [tokens]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const apiSendData = {
        amount: formData.amount,
        address: formData.address,
        token: formData.token.toLowerCase()
      };
      
      console.log("Sending transaction:", apiSendData);
      
      await axios.post(
        'http://127.0.0.1:8000/api/wallet/send/',
        apiSendData,
        {
          headers: {
            'Authorization': `Token ${localStorage.getItem('token')}`
          }
        }
      );
      
      alert('Transaction submitted successfully!');
      
      fetchWalletData();
      
      setFormData({
        amount: '',
        address: '',
        token: tokens.length > 0 ? tokens[0].symbol : 'ETH'
      });
      
     
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Failed to send transaction:', error);
      alert('Failed to send transaction. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentBalances = () => {
    if (!walletData) return tokens;
    
    return [
      { 
        symbol: 'ETH', 
        balance: walletData.balances?.eth || '0', 
        contractAddress: '0x0000000000000000000000000000000000000000'
      },
      { 
        symbol: 'USDC', 
        balance: walletData.balances?.usdc || '0', 
        contractAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
      },
      { 
        symbol: 'USDT', 
        balance: walletData.balances?.usdt || '0', 
        contractAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7'
      }
    ];
  };

  const tokensWithBalances = getCurrentBalances();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Send Crypto</h2>
          {onClose && (
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              ✕
            </button>
          )}
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1">Token</label>
            <select
              value={formData.token}
              onChange={(e) => setFormData({...formData, token: e.target.value})}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
            >
              {tokensWithBalances.map(token => (
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
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
              placeholder="0x..."
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-400 text-sm mb-1">Amount</label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({...formData, amount: e.target.value})}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
              placeholder="0.0"
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
            } text-white`}
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
};

