import React, { useState, useEffect } from 'react';
import { Wallet, RefreshCw, Copy, ExternalLink, ChevronDown, TrendingUp, Send, AlertCircle } from 'lucide-react';

interface ChainConfig {
  id: number;
  name: string;
  explorer: string;
  nativeCurrency: string;
  icon: string;
  color: string;
  tokens: string[];
}

interface TokenBalances {
  [key: string]: string;
}

interface WalletBalances {
  native: string;
  tokens: TokenBalances;
}

interface Transaction {
  tx_hash: string;
  token_symbol: string;
  to_address: string;
  amount: string;
  status: string;
  timestamp?: string;
}

interface WalletData {
  address: string;
  balances: WalletBalances;
  transactions: Transaction[];
}

interface SendForm {
  amount: string;
  address: string;
  token: string;
}

interface SendCryptoRequest {
  amount: string;
  address: string;
  token: string;
  chain: string;
}

interface SendCryptoResponse {
  tx_hash: string;
  status: string;
  error?: string;
}

type ChainKey = 'ethereum' | 'base' | 'polygon';

const MultiChainWalletDashboard: React.FC = () => {
  const [selectedChain, setSelectedChain] = useState<ChainKey>('ethereum');
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showSendModal, setShowSendModal] = useState<boolean>(false);
  const [sendForm, setSendForm] = useState<SendForm>({
    amount: '',
    address: '',
    token: 'native'
  });
  const [sendLoading, setSendLoading] = useState<boolean>(false);

  const authToken: string = localStorage.getItem('authToken') || '';

  const chainConfigs: Record<ChainKey, ChainConfig> = {
    ethereum: {
      id: 11155111,
      name: 'Ethereum Sepolia',
      explorer: 'https://sepolia.etherscan.io',
      nativeCurrency: 'ETH',
      icon: '⟠',
      color: 'from-blue-400 to-purple-600',
      tokens: ['USDC', 'USDT']
    },
    base: {
      id: 84531,
      name: 'Base Sepolia',
      explorer: 'https://basescan.org',
      nativeCurrency: 'ETH',
      icon: '🔵',
      color: 'from-blue-500 to-indigo-600',
      tokens: ['USDC']
    },
    polygon: {
      id: 80002,
      name: 'Polygon Amoy',
      explorer: 'https://amoy.polygonscan.com',
      nativeCurrency: 'MATIC',
      icon: '🔮',
      color: 'from-purple-500 to-pink-600',
      tokens: ['USDC', 'USDT']
    }
  };

  const fetchWalletData = async (chain: ChainKey): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/wallet/dashboard?chain=${chain}`, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${authToken}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }

      const data: WalletData = await response.json();
      setWalletData(data);
    } catch (error) {
      console.error('Error fetching wallet data:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const sendCrypto = async (): Promise<void> => {
    setSendLoading(true);
    try {
      const requestBody: SendCryptoRequest = {
        amount: sendForm.amount,
        address: sendForm.address,
        token: sendForm.token,
        chain: selectedChain
      };

      const response = await fetch('http://127.0.0.1:8000/api/wallet/send/', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const data: SendCryptoResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Transaction failed');
      }

      alert(`Transaction submitted successfully! TX Hash: ${data.tx_hash}`);
      setShowSendModal(false);
      setSendForm({ amount: '', address: '', token: 'native' });
      fetchWalletData(selectedChain);
      
    } catch (error) {
      console.error('Send error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      alert(`Transaction failed: ${errorMessage}`);
    } finally {
      setSendLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletData(selectedChain);
  }, [selectedChain]);

  const copyToClipboard = (text: string): void => {
    navigator.clipboard.writeText(text);
  };

  const formatAddress = (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatBalance = (balance: string | number): string => {
    return parseFloat(balance.toString()).toFixed(4);
  };

  const calculateTotalValue = (): string => {
    if (!walletData || !walletData.balances) return '0.00';
    
    const ethPrice = 2000;
    const maticPrice = 0.8;
    const usdcPrice = 1;
    const usdtPrice = 1;
    
    const nativePrice = selectedChain === 'polygon' ? maticPrice : ethPrice;
    const nativeValue = parseFloat(walletData.balances.native || '0') * nativePrice;
    
    const tokenValues = Object.entries(walletData.balances.tokens || {}).reduce((sum, [token, balance]) => {
      const price = token === 'usdc' ? usdcPrice : token === 'usdt' ? usdtPrice : 1;
      return sum + (parseFloat(balance) * price);
    }, 0);
    
    return (nativeValue + tokenValues).toFixed(2);
  };

  const handleSendFormChange = (field: keyof SendForm, value: string): void => {
    setSendForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-xl border-b border-gray-700/50">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white">Crypto Wallet</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Send Button */}
              <button
                onClick={() => setShowSendModal(true)}
                disabled={!walletData}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded-xl text-white font-medium transition-colors"
              >
                <Send className="w-4 h-4" />
                <span>Send</span>
              </button>
            
              {/* Chain Selector */}
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center space-x-3 bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl px-4 py-2 text-white hover:bg-gray-700/50 transition-all duration-200"
                >
                  <span className="text-xl">{chainConfigs[selectedChain].icon}</span>
                  <span className="font-medium">{chainConfigs[selectedChain].name}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-gray-800/90 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-2xl z-50">
                    {Object.entries(chainConfigs).map(([key, config]) => (
                      <button
                        key={key}
                        onClick={() => {
                          setSelectedChain(key as ChainKey);
                          setDropdownOpen(false);
                        }}
                        className="w-full flex items-center space-x-3 px-4 py-3 text-left text-white hover:bg-gray-700/50 first:rounded-t-xl last:rounded-b-xl transition-all duration-200"
                      >
                        <span className="text-xl">{config.icon}</span>
                        <div>
                          <div className="font-medium">{config.name}</div>
                          <div className="text-sm text-gray-400">{config.nativeCurrency}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <div className="text-red-400">
              <div className="font-medium">Error loading wallet data</div>
              <div className="text-sm opacity-80">{error}</div>
            </div>
          </div>
        ) : walletData ? (
          <div className="space-y-8">
            {/* Wallet Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Total Portfolio Value */}
              <div className="lg:col-span-2 bg-gradient-to-r from-gray-800/50 to-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-300">Total Portfolio Value</h2>
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <div className="text-3xl font-bold text-white mb-2">${calculateTotalValue()}</div>
                <div className="text-green-500 text-sm">+2.45% (24h)</div>
              </div>

              {/* Wallet Address */}
              <div className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-gray-300 mb-4">Wallet Address</h2>
                <div className="flex items-center space-x-2">
                  <span className="text-white font-mono text-sm">{formatAddress(walletData.address)}</span>
                  <button
                    onClick={() => copyToClipboard(walletData.address)}
                    className="p-1 hover:bg-gray-700/50 rounded transition-colors"
                  >
                    <Copy className="w-4 h-4 text-gray-400" />
                  </button>
                  <a
                    href={`${chainConfigs[selectedChain].explorer}/address/${walletData.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 hover:bg-gray-700/50 rounded transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  </a>
                </div>
              </div>
            </div>

            {/* Balances */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Native Currency */}
              <div className={`bg-gradient-to-r ${chainConfigs[selectedChain].color} p-6 rounded-2xl text-white`}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xl">{chainConfigs[selectedChain].icon}</span>
                  <span className="text-sm opacity-80">{chainConfigs[selectedChain].nativeCurrency}</span>
                </div>
                <div className="text-2xl font-bold mb-1">{formatBalance(walletData.balances.native)}</div>
                <div className="text-sm opacity-80">≈ ${(parseFloat(walletData.balances.native) * 2000).toFixed(2)}</div>
              </div>

              {/* Tokens */}
              {walletData.balances.tokens && Object.entries(walletData.balances.tokens).map(([token, balance]) => (
                <div key={token} className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {token.toUpperCase().charAt(0)}
                    </div>
                    <span className="text-sm text-gray-400">{token.toUpperCase()}</span>
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">{formatBalance(balance)}</div>
                  <div className="text-sm text-gray-400">≈ ${parseFloat(balance).toFixed(2)}</div>
                </div>
              ))}
            </div>

            {/* Recent Transactions */}
            <div className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Recent Transactions</h2>
                <button
                  onClick={() => fetchWalletData(selectedChain)}
                  className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
                >
                  <RefreshCw className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              
              <div className="space-y-4">
                {walletData.transactions && walletData.transactions.length > 0 ? (
                  walletData.transactions.map((tx, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-900/30 rounded-xl border border-gray-700/30">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                          <span className="text-red-400 text-sm">↗</span>
                        </div>
                        <div>
                          <div className="text-white font-medium">Sent {tx.token_symbol}</div>
                          <div className="text-gray-400 text-sm">To {formatAddress(tx.to_address)}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-medium">-{tx.amount}</div>
                        <div className="text-gray-400 text-sm">{tx.status}</div>
                      </div>
                      <a
                        href={`${chainConfigs[selectedChain].explorer}/tx/${tx.tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 hover:bg-gray-700/50 rounded transition-colors ml-2"
                      >
                        <ExternalLink className="w-4 h-4 text-gray-400" />
                      </a>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    No transactions found
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="text-gray-400">
              {authToken ? 'No wallet data available' : 'Please login to view wallet data'}
            </div>
          </div>
        )}

        {/* Send Crypto Modal */}
        {showSendModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Send Crypto</h3>
                <button
                  onClick={() => setShowSendModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {/* Token Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Token</label>
                  <select
                    value={sendForm.token}
                    onChange={(e) => handleSendFormChange('token', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="native">{chainConfigs[selectedChain].nativeCurrency}</option>
                    {chainConfigs[selectedChain].tokens.map(token => (
                      <option key={token} value={token.toLowerCase()}>{token}</option>
                    ))}
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Amount</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={sendForm.amount}
                    onChange={(e) => handleSendFormChange('amount', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                    placeholder="0.0"
                  />
                </div>

                {/* Recipient Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Recipient Address</label>
                  <input
                    type="text"
                    value={sendForm.address}
                    onChange={(e) => handleSendFormChange('address', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                    placeholder="0x..."
                  />
                </div>

                {/* Send Button */}
                <button
                  onClick={sendCrypto}
                  disabled={sendLoading || !sendForm.amount || !sendForm.address}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed py-3 rounded-lg text-white font-medium transition-colors flex items-center justify-center space-x-2"
                >
                  {sendLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send Transaction</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiChainWalletDashboard;