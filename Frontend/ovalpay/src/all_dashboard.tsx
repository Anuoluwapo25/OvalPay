import { useState, useEffect } from "react";
import axios from 'axios';

type ChainConfig = {
  id: number;
  name: string;
  rpc_url: string;
  explorer: string;
  native_currency: string;
  tokens: Record<string, string>;
};

type WalletData = {
  address: string;
  balances: {
    native: string;
    tokens: Record<string, string>;
  };
  transactions: Array<{
    tx_hash: string;
    amount: string;
    to_address: string;
    status: string;
    time: string;
    token_symbol: string;
    chain: string;
  }>;
  currentChain: string;
};

type SendData = {
  amount: string;
  address: string;
  token: string;
  chain: string;
};

const CHAINS: Record<string, ChainConfig> = {
  ethereum: {
    id: 11155111,
    name: 'Ethereum Sepolia',
    rpc_url: 'https://sepolia.g.alchemy.com/KmZaTQIZZnXt1MFSeK0QvQ0DxmG6i53n',
    explorer: 'https://sepolia.etherscan.io',
    native_currency: 'ETH',
    tokens: {
      usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
      usdt: '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06'
    }
  },
  base: {
    id: 84531,
    name: 'Base Sepolia',
    rpc_url: 'https://base-sepolia.g.alchemy.com/KmZaTQIZZnXt1MFSeK0QvQ0DxmG6i53n',
    explorer: 'https://sepolia.basescan.org',
    native_currency: 'ETH',
    tokens: {
      usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      usdt: '' 
    }
  },
  polygon: {
    id: 80002,
    name: 'Polygon Amoy',
    rpc_url: 'https://polygon-amoy.g.alchemy.com/v2/KmZaTQIZZnXt1MFSeK0QvQ0DxmG6i53n',
    explorer: 'https://amoy.polygonscan.com',
    native_currency: 'MATIC',
    tokens: {
      usdc: '0x2aC8262537Cb7e9e80F5f4aC3ee3aD6C5b810C15',
      usdt: '0x4A0D1092E9df255cf95D72834Ea9255132782318'
    }
  },
};

function WalletDashboard() {
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [sendData, setSendData] = useState<SendData>({
    amount: '',
    address: '',
    token: 'native',
    chain: 'ethereum'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableTokens, setAvailableTokens] = useState<Record<string, string>>({});

  const formatBalance = (balance: string, decimals: number = 5) => {
    const num = parseFloat(balance);
    return isNaN(num) ? '0.00000' : num.toFixed(decimals);
  };

  useEffect(() => {
    updateAvailableTokens(sendData.chain);
    fetchWalletData();
    
    const interval = setInterval(() => {
      fetchWalletData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const updateAvailableTokens = (chainId: string) => {
    const chain = CHAINS[chainId];
    if (!chain) return;

    const tokens: Record<string, string> = { native: chain.native_currency };
    
    Object.entries(chain.tokens).forEach(([symbol, address]) => {
      if (address) { // Only include tokens with valid addresses
        tokens[symbol] = symbol.toUpperCase();
      }
    });
    
    setAvailableTokens(tokens);
  };

  const fetchWalletData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data } = await axios.get<WalletData>(
        'http://127.0.0.1:8000/api/wallet/dashboard',
        { 
          headers: { 
            'Authorization': `Token ${localStorage.getItem('token') || ''}` 
          },
          params: { chain: sendData.chain }
        }
      );
      
      setWalletData(data);
    } catch (err) {
      console.error('Failed to fetch wallet data:', err);
      setError(
        axios.isAxiosError(err) 
          ? err.response?.data?.error || 'Failed to load wallet data'
          : 'An unexpected error occurred'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChainChange = (chainId: string) => {
    setSendData(prev => ({
      ...prev,
      chain: chainId,
      token: 'native'
    }));
    updateAvailableTokens(chainId);
    fetchWalletData();
  };

  const handleSend = async () => {
    if (!sendData.amount || !sendData.address) {
      setError('Please enter amount and recipient address');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      await axios.post(
        'http://127.0.0.1:8000/api/wallet/send/',
        sendData,
        { 
          headers: { 
            'Authorization': `Token ${localStorage.getItem('token') || ''}` 
          } 
        }
      );
      
      alert('Transaction submitted successfully!');
      fetchWalletData();
      setSendData(prev => ({ ...prev, amount: '', address: '' }));
    } catch (err) {
      console.error('Failed to send transaction:', err);
      setError(
        axios.isAxiosError(err) 
          ? err.response?.data?.error || 'Failed to send transaction'
          : 'An unexpected error occurred'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!walletData) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow p-6 text-center">
          {loading ? 'Loading wallet data...' : 'Connecting to wallet...'}
        </div>
      </div>
    );
  }

  const currentChain = CHAINS[sendData.chain];

  return (
    <div className="max-w-4xl mx-auto p-6">
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p>{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-2xl text-green-400 font-bold mb-4">Wallet Overview</h2>
        
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Network</label>
          <select
            className="w-full p-2 border rounded"
            value={sendData.chain}
            onChange={(e) => handleChainChange(e.target.value)}
            disabled={loading}
          >
            {Object.entries(CHAINS).map(([id, chain]) => (
              <option key={id} value={id}>{chain.name}</option>
            ))}
          </select>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded">
            <p className="text-gray-500">Address</p>
            <p className="font-mono break-all text-sm">{walletData.address}</p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded">
            <p className="text-gray-500">{currentChain.native_currency} Balance</p>
            <p className="text-xl font-bold">
              {formatBalance(walletData.balances.native)} {currentChain.native_currency}
            </p>
          </div>
          
          {Object.entries(walletData.balances.tokens).map(([symbol, balance]) => (
            <div key={symbol} className="bg-gray-50 p-4 rounded">
              <p className="text-gray-500">{symbol.toUpperCase()} Balance</p>
              <p className="text-xl font-bold">
                {formatBalance(balance)} {symbol.toUpperCase()}
              </p>
            </div>
          ))}
        </div>

        <h3 className="text-xl font-semibold mb-3">Send Crypto</h3>
        <div className="space-y-3">
          <select
            className="w-full p-2 border rounded"
            value={sendData.token}
            onChange={(e) => setSendData({...sendData, token: e.target.value})}
            disabled={loading}
          >
            {Object.entries(availableTokens).map(([key, symbol]) => (
              <option key={key} value={key}>{symbol}</option>
            ))}
          </select>
          
          <input
            type="text"
            placeholder="Recipient Address"
            className="w-full p-2 border rounded"
            value={sendData.address}
            onChange={(e) => setSendData({...sendData, address: e.target.value})}
            disabled={loading}
          />
          
          <input
            type="number"
            placeholder="Amount"
            className="w-full p-2 border rounded"
            value={sendData.amount}
            onChange={(e) => setSendData({...sendData, amount: e.target.value})}
            disabled={loading}
            min="0"
            step="any"
          />
          
          <button
            onClick={handleSend}
            disabled={loading || !sendData.amount || !sendData.address}
            className={`w-full py-2 px-4 rounded text-white ${
              loading || !sendData.amount || !sendData.address
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {loading ? 'Processing...' : 'Send'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Recent Transactions</h2>
        {walletData.transactions.length === 0 ? (
          <p className="text-gray-500">No transactions yet</p>
        ) : (
          <div className="space-y-3">
            {walletData.transactions.slice(0, 5).map((tx) => (
              <div key={tx.tx_hash} className="border-b pb-3">
                <div className="flex justify-between">
                  <span className="font-medium">To:</span>
                  <span className="font-mono text-sm">{tx.to_address}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Amount:</span>
                  <span>
                    {formatBalance(tx.amount)} {tx.token_symbol}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Network:</span>
                  <span>{tx.chain || sendData.chain}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Status:</span>
                  <span className={`font-semibold ${
                    tx.status === 'COMPLETED' ? 'text-green-500' : 
                    tx.status === 'FAILED' ? 'text-red-500' : 'text-yellow-500'
                  }`}>
                    {tx.status}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Time:</span>
                  <span>{new Date(tx.time).toLocaleString()}</span>
                </div>
                {tx.tx_hash && (
                  <a 
                    href={`${currentChain.explorer}/tx/${tx.tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 text-sm hover:underline block mt-1"
                  >
                    View on explorer
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default WalletDashboard;