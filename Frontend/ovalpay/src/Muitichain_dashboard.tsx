import { useState, useEffect } from "react";
import axios from 'axios';
import Web3 from 'web3';
import { CHAIN_CONFIGS } from './types';

interface Coin {
  name: string;
  symbol: string;
  balance: string;
  contract?: string;
}

interface Transaction {
  tx_hash: string;
  amount: string;
  to_address: string;
  status: string;
  time: string;
  token_symbol: string;
  chain: string;
}

interface WalletData {
  address: string;
  balances: {
    native: string;
    tokens: {
      [key: string]: string;
    };
  };
  transactions: Transaction[];
  currentChain: string;
}

function CryptoDashboard() {
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [sendData, setSendData] = useState({
    amount: '',
    address: '',
    token: 'native'
  });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'send' | 'transactions'>('dashboard');
  const [loading, setLoading] = useState(false);
  const [selectedChain, setSelectedChain] = useState('ethereum');
  const [error, setError] = useState('');

  const web3 = new Web3();

  const CHAINS = [
    { id: 'ethereum', name: 'Ethereum' },
    { id: 'base', name: 'Base' },
    { id: 'polygon', name: 'Polygon' }
  ];

  const fetchWalletData = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get<WalletData>(
        `http://127.0.0.1:8000/api/wallet/dashboard?chain=${selectedChain}`,
        { headers: { 'Authorization': `Token ${localStorage.getItem('token')}` } }
      );

      setWalletData(data);
      setError('');
    } catch (err) {
      setError('Failed to fetch wallet data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
    const interval = setInterval(fetchWalletData, 30000);
    return () => clearInterval(interval);
  }, [selectedChain]);

  const handleSend = async () => {
    if (!sendData.amount || !sendData.address) {
      setError('Please fill all fields');
      return;
    }

    if (!web3.utils.isAddress(sendData.address)) {
      setError('Invalid recipient address');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(
        'http://127.0.0.1:8000/api/wallet/send/',
        {
          ...sendData,
          chain: selectedChain
        },
        { headers: { 'Authorization': `Token ${localStorage.getItem('token')}` } }
      );

      alert(`Transaction submitted! TX Hash: ${response.data.tx_hash}`);
      setSendData({ amount: '', address: '', token: 'native' });
      fetchWalletData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send transaction');
    } finally {
      setLoading(false);
    }
  };

  const formatBalance = (balance: string) => {
    return parseFloat(balance).toFixed(4);
  };

  const getCoins = () => {
    if (!walletData) return [];
    
    const nativeCoin = {
      name: selectedChain === 'ethereum' ? 'Ethereum' : 
           selectedChain === 'polygon' ? 'Polygon' : 'Base',
      symbol: selectedChain === 'ethereum' ? 'ETH' : 
             selectedChain === 'polygon' ? 'MATIC' : 'ETH',
      balance: walletData.balances.native
    };

    const tokenCoins = Object.entries(walletData.balances.tokens).map(([symbol, balance]) => ({
      name: symbol === 'usdc' ? 'USD Coin' : 
           symbol === 'usdt' ? 'Tether' : symbol.toUpperCase(),
      symbol: symbol.toUpperCase(),
      balance: balance.toString(),
      contract: CHAIN_CONFIGS[selectedChain].tokens[symbol]
    }));

    return [nativeCoin, ...tokenCoins];
  };

  if (loading && !walletData) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div>Loading wallet data...</div>
      </div>
    );
  }

  if (!walletData) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div>{error || 'No wallet data available'}</div>
      </div>
    );
  }

  const coins = getCoins();

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Crypto Wallet</h1>
          <div className="flex items-center space-x-2">
            <span>Chain:</span>
            <select 
              value={selectedChain}
              onChange={(e) => setSelectedChain(e.target.value)}
              className="bg-gray-800 text-white px-3 py-1 rounded"
            >
              {CHAINS.map(chain => (
                <option key={chain.id} value={chain.id}>{chain.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Wallet Address */}
        <div className="bg-gray-800 p-4 rounded-lg mb-6">
          <div className="text-sm text-gray-400 mb-1">Wallet Address</div>
          <div className="font-mono break-all">{walletData.address}</div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700 mb-6">
          <button
            className={`px-4 py-2 ${activeTab === 'dashboard' ? 'border-b-2 border-blue-500' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={`px-4 py-2 ${activeTab === 'send' ? 'border-b-2 border-blue-500' : ''}`}
            onClick={() => setActiveTab('send')}
          >
            Send
          </button>
          <button
            className={`px-4 py-2 ${activeTab === 'transactions' ? 'border-b-2 border-blue-500' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            Transactions
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'dashboard' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Native Balance Card */}
              <div className="bg-gray-800 p-6 rounded-lg">
                <h2 className="text-xl font-semibold mb-4">Native Balance</h2>
                <div className="text-3xl font-bold">
                  {formatBalance(walletData.balances.native)} {coins[0]?.symbol}
                </div>
              </div>

              {/* Tokens Card */}
              <div className="bg-gray-800 p-6 rounded-lg">
                <h2 className="text-xl font-semibold mb-4">Tokens</h2>
                <div className="space-y-3">
                  {coins.slice(1).map((coin) => (
                    <div key={coin.symbol} className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{coin.name}</div>
                        <div className="text-sm text-gray-400">{coin.symbol}</div>
                      </div>
                      <div className="text-lg">{formatBalance(coin.balance)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  className="bg-blue-600 hover:bg-blue-700 py-3 px-4 rounded-lg"
                  onClick={() => setActiveTab('send')}
                >
                  Send
                </button>
                <button className="bg-gray-700 hover:bg-gray-600 py-3 px-4 rounded-lg">
                  Receive
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'send' && (
          <div className="bg-gray-800 p-6 rounded-lg max-w-md mx-auto">
            <h2 className="text-xl font-semibold mb-6">Send Crypto</h2>
            
            {error && <div className="text-red-500 mb-4">{error}</div>}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Token</label>
                <select
                  value={sendData.token}
                  onChange={(e) => setSendData({...sendData, token: e.target.value})}
                  className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2"
                >
                  {coins.map(coin => (
                    <option key={coin.symbol} value={coin.symbol === coins[0]?.symbol ? 'native' : coin.symbol.toLowerCase()}>
                      {coin.name} ({coin.symbol})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Amount</label>
                <input
                  type="number"
                  value={sendData.amount}
                  onChange={(e) => setSendData({...sendData, amount: e.target.value})}
                  className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Recipient Address</label>
                <input
                  type="text"
                  value={sendData.address}
                  onChange={(e) => setSendData({...sendData, address: e.target.value})}
                  className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2"
                  placeholder="0x..."
                />
              </div>

              <button
                onClick={handleSend}
                disabled={loading}
                className={`w-full py-3 rounded-md font-medium ${loading ? 'bg-gray-600' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {loading ? 'Sending...' : 'Send Transaction'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-6">Recent Transactions</h2>
            
            {walletData.transactions.length === 0 ? (
              <div className="text-center py-8 text-gray-400">No transactions yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left border-b border-gray-700">
                      <th className="pb-2">Token</th>
                      <th className="pb-2">Amount</th>
                      <th className="pb-2">To</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2">Time</th>
                      <th className="pb-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {walletData.transactions.map((tx) => (
                      <tr key={tx.tx_hash} className="border-b border-gray-700">
                        <td className="py-3">{tx.token_symbol}</td>
                        <td className="py-3">{tx.amount}</td>
                        <td className="py-3 font-mono text-sm">
                          {tx.to_address.substring(0, 6)}...{tx.to_address.substring(tx.to_address.length - 4)}
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            tx.status === 'COMPLETED' ? 'bg-green-900 text-green-300' :
                            tx.status === 'PENDING' ? 'bg-yellow-900 text-yellow-300' :
                            'bg-red-900 text-red-300'
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="py-3 text-sm text-gray-400">
                          {new Date(tx.time).toLocaleString()}
                        </td>
                        <td className="py-3">
                          <a 
                            href={`${CHAIN_CONFIGS[selectedChain].explorer}/tx/${tx.tx_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline text-sm"
                          >
                            View
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default CryptoDashboard;