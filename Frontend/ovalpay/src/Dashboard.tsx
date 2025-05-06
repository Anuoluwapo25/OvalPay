import { useState, useEffect } from "react";
import axios from 'axios';

function TrypcoDashboard() {
  const [walletData, setWalletData] = useState<{
    address: string;
    balance: string;
    transactions: any[];
    coins: { name: string; balance: string; symbol: string }[];
  } | null>(null);
  
  const [sendData, setSendData] = useState({
    amount: '',
    address: '',
    coinSymbol: 'ETH' 
  });
  
  const [activeTab, setActiveTab] = useState<'main' | 'send' | 'coins'>('main');
  const [loading, setLoading] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState<string | null>(null);

  const coins = [
    { name: "Tether", symbol: "USDT", balance: "100" },
    { name: "BUGO", symbol: "BUGO", balance: "100" },
    { name: "UBOC", symbol: "UBOC", balance: "100" },
    { name: "Ethereum", symbol: "ETH", balance: walletData?.balance || "0" }
  ];

  useEffect(() => {
    const fetchWalletData = async () => {
      try {
        const { data } = await axios.get(
          'http://127.0.0.1:8000/api/wallet/dashboard',
          { headers: { 'Authorization': `Token ${localStorage.getItem('token')}` } }
        );
        setWalletData({
          ...data,
          coins: coins 
        });
      } catch (error) {
        console.error('Failed to fetch wallet data');
      }
    };

    fetchWalletData();
    const interval = setInterval(fetchWalletData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSend = async () => {
    setLoading(true);
    try {
      await axios.post(
        'http://127.0.0.1:8000/api/wallet/send/',
        sendData,
        { headers: { 'Authorization': `Token ${localStorage.getItem('token')}` } }
      );
      alert('Transaction submitted!');
      setSendData({ ...sendData, amount: '', address: '' });
    } catch (error) {
      alert('Failed to send transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleCoinSelect = (symbol: string) => {
    setSelectedCoin(symbol);
    setSendData({ ...sendData, coinSymbol: symbol });
    setActiveTab('send'); 
  };

  if (!walletData) return <div className="p-4 text-center text-gray-300">Loading...</div>;

  return (
    <div className="min-h-screen bg-black flex justify-center items-start p-4">
      <div className="w-full max-w-md bg-gray-900 rounded-lg shadow-xl overflow-hidden border border-gray-800">
        {/* Header */}
        <div className="bg-black p-4 text-white">
          <h1 className="text-xl font-bold">PayNow</h1>
          <p className="text-sm opacity-80">Simplifies cryptocurrency, fast and safe</p>
        </div>

        {/* User Profile */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white">
              PW
            </div>
            <div className="ml-3">
              <p className="font-medium text-white">Pay Now</p>
              <p className="text-xs text-gray-400">Start mode</p>
            </div>
          </div>
        </div>

        {/* Main Wallet */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-400 text-sm">Main wallet ▼</p>
              <p className="text-2xl font-bold text-green-400">${walletData.balance}</p>
            </div>
            <button className="bg-green-500 text-black px-4 py-2 rounded-md text-sm font-medium hover:bg-green-400">
              Start new
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800">
          <button 
            className={`flex-1 py-3 text-center ${activeTab === 'main' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400'}`}
            onClick={() => setActiveTab('main')}
          >
            Main
          </button>
          <button 
            className={`flex-1 py-3 text-center ${activeTab === 'send' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400'}`}
            onClick={() => setActiveTab('send')}
          >
            Send
          </button>
          <button 
            className={`flex-1 py-3 text-center ${activeTab === 'coins' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400'}`}
            onClick={() => setActiveTab('coins')}
          >
            Coins
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {activeTab === 'main' && (
            <div>
              <div className="mb-6">
                <h3 className="font-medium mb-2 text-white">Coins step-by-step</h3>
                <div className="space-y-2">
                  <button className="w-full text-left p-3 bg-gray-800 rounded-md border border-gray-700 text-gray-300 hover:bg-gray-700">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="ml-3">Research</span>
                    </div>
                  </button>
                  <button className="w-full text-left p-3 bg-gray-800 rounded-md border border-gray-700 text-gray-300 hover:bg-gray-700">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                          <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="ml-3">Buy</span>
                    </div>
                  </button>
                  <button className="w-full text-left p-3 bg-gray-800 rounded-md border border-gray-700 text-gray-300 hover:bg-gray-700">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="ml-3">Confirm</span>
                    </div>
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-medium mb-2 text-white">Stable coins</h3>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 bg-gray-800 rounded-md border border-gray-700 text-center">
                    <div className="w-8 h-8 rounded-full bg-blue-500 mx-auto mb-1 flex items-center justify-center">T</div>
                    <p className="text-xs text-gray-300">Tether</p>
                    <p className="text-xs text-gray-400">$100</p>
                  </div>
                  <div className="p-2 bg-gray-800 rounded-md border border-gray-700 text-center">
                    <div className="w-8 h-8 rounded-full bg-yellow-500 mx-auto mb-1 flex items-center justify-center">B</div>
                    <p className="text-xs text-gray-300">BUSD</p>
                    <p className="text-xs text-gray-400">$100</p>
                  </div>
                  <div className="p-2 bg-gray-800 rounded-md border border-gray-700 text-center">
                    <div className="w-8 h-8 rounded-full bg-blue-400 mx-auto mb-1 flex items-center justify-center">U</div>
                    <p className="text-xs text-gray-300">USDC</p>
                    <p className="text-xs text-gray-400">$100</p>
                  </div>
                </div>
              </div>

              <button className="w-full bg-green-500 text-black py-3 rounded-md hover:bg-green-400 font-medium">
                Start now
              </button>
            </div>
          )}

          {activeTab === 'send' && (
            <div>
              <div className="mb-4">
                <label className="block text-gray-300 mb-1">Coin</label>
                <div className="p-3 border rounded-md bg-gray-800 border-gray-700 text-gray-300">
                  {selectedCoin || "Select a coin"}
                </div>
                <p className="text-xs text-gray-500 mt-1">Select coin from Coins tab first</p>
              </div>
              <div className="mb-4">
                <label className="block text-gray-300 mb-1">Amount</label>
                <input
                  type="number"
                  className="w-full p-3 border rounded-md bg-gray-800 border-gray-700 text-gray-300"
                  value={sendData.amount}
                  onChange={(e) => setSendData({...sendData, amount: e.target.value})}
                  placeholder="0.00"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-300 mb-1">Recipient Address</label>
                <input
                  type="text"
                  className="w-full p-3 border rounded-md bg-gray-800 border-gray-700 text-gray-300"
                  value={sendData.address}
                  onChange={(e) => setSendData({...sendData, address: e.target.value})}
                  placeholder="Wallet address"
                />
              </div>
              <button
                onClick={handleSend}
                disabled={loading || !selectedCoin}
                className={`w-full py-3 rounded-md text-black font-medium ${loading || !selectedCoin ? 'bg-gray-600 text-gray-400' : 'bg-green-500 hover:bg-green-400'}`}
              >
                {loading ? 'Sending...' : 'Send'}
              </button>
            </div>
          )}

          {activeTab === 'coins' && (
            <div className="space-y-3">
              {coins.map((coin) => (
                <div 
                  key={coin.symbol} 
                  className={`p-4 border rounded-md cursor-pointer ${selectedCoin === coin.symbol ? 'border-green-500 bg-gray-800' : 'border-gray-700 bg-gray-800'}`}
                  onClick={() => handleCoinSelect(coin.symbol)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium text-white">{coin.name}</h3>
                      <p className="text-sm text-gray-400">{coin.symbol}</p>
                    </div>
                    <span className="font-medium text-green-400">${coin.balance}</span>
                  </div>
                </div>
              ))}
              <button className="w-full text-left p-4 border rounded-md border-gray-700 bg-gray-800 text-gray-400 hover:bg-gray-700">
                View all
              </button>
            </div>
          )}
        </div>

        {/* Bottom Navigation */}
        <div className="flex justify-between p-3 border-t border-gray-800 bg-black">
          <button className="flex flex-col items-center text-green-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs mt-1">Main</span>
          </button>
          <button className="flex flex-col items-center text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs mt-1">Coins</span>
          </button>
          <button className="flex flex-col items-center text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span className="text-xs mt-1">Send</span>
          </button>
          <button className="flex flex-col items-center text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs mt-1">Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default TrypcoDashboard;