import { useState, useEffect } from "react";
import axios from 'axios';

function WalletDashboard() {
  const [walletData, setWalletData] = useState<{
    address: string;
    balances: {
      eth: string;
      usdc: string;
      usdt: string;
    };
    transactions: any[];
  } | null>(null);
  const [sendData, setSendData] = useState({
    amount: '',
    address: '',
    token: 'eth' // Default to ETH
  });
  const [loading, setLoading] = useState(false);

  const formatBalance = (balance: string, decimals: number = 5) => {
    const num = parseFloat(balance);
    return num.toFixed(decimals);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      fetchWalletData();
    }, 30000); 

    return () => clearInterval(interval);
  }, []);

  const fetchWalletData = async () => {
    try {
      const { data } = await axios.get(
        'http://127.0.0.1:8000/api/wallet/dashboard',
        { headers: { 'Authorization': `Token ${localStorage.getItem('token')}` } }
      );
      setWalletData(data);
    } catch (error) {
      console.error('Failed to fetch wallet data');
    }
  };

  const handleSend = async () => {
    setLoading(true);
    try {
      await axios.post(
        'http://127.0.0.1:8000/api/wallet/send/',
        sendData,
        { headers: { 'Authorization': `Token ${localStorage.getItem('token')}` } }
      );
      alert('Transaction submitted!');
      fetchWalletData(); 
      setSendData({ amount: '', address: '', token: sendData.token });
    } catch (error) {
      alert('Failed to send transaction');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, []);

  if (!walletData) return <div>Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-2xl text-green-400 font-bold mb-4">Wallet Overview</h2>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded">
            <p className="text-gray-500">Address</p>
            <p className="font-mono break-all">{walletData.address}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded">
            <p className="text-gray-500">ETH Balance</p>
            <p className="text-xl font-bold">{formatBalance(walletData.balances.eth)}ETH</p>
          </div>
          <div className="bg-gray-50 p-4 rounded">
            <p className="text-gray-500">USDC Balance</p>
            <p className="text-xl font-bold">{walletData.balances.usdc} USDC</p>
          </div>
          <div className="bg-gray-50 p-4 rounded">
            <p className="text-gray-500">USDT Balance</p>
            <p className="text-xl font-bold">{walletData.balances.usdt} USDT</p>
          </div>
        </div>

        <h3 className="text-xl font-semibold mb-3">Send Crypto</h3>
        <div className="space-y-3">
          <select
            className="w-full p-2 border rounded"
            value={sendData.token}
            onChange={(e) => setSendData({...sendData, token: e.target.value})}
          >
            <option value="eth">ETH</option>
            <option value="usdc">USDC</option>
            <option value="usdt">USDT</option>
          </select>
          <input
            type="text"
            placeholder="Recipient Address"
            className="w-full p-2 border rounded"
            value={sendData.address}
            onChange={(e) => setSendData({...sendData, address: e.target.value})}
          />
          <input
            type="number"
            placeholder="Amount"
            className="w-full p-2 border rounded"
            value={sendData.amount}
            onChange={(e) => setSendData({...sendData, amount: e.target.value})}
          />
          <button
            onClick={handleSend}
            disabled={loading}
            className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 disabled:bg-blue-300"
          >
            {loading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Recent Transactions</h2>
        {walletData.transactions.length === 0 ? (
          <p>No transactions yet</p>
        ) : (
          <div className="space-y-3">
            {walletData.transactions.slice(0, 5).map((tx) => (
              <div key={tx.tx_hash} className="border-b pb-3">
                <p>To: {tx.to_address}</p>
                <p>Amount: {formatBalance(tx.amount)} {tx.token_symbol}</p>
                <p>Status: <span className={`font-semibold ${
                  tx.status === 'COMPLETED' ? 'text-green-500' : 
                  tx.status === 'FAILED' ? 'text-red-500' : 'text-yellow-500'
                }`}>{tx.status}</span></p>
                <p className="text-sm text-gray-500">{new Date(tx.time).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default WalletDashboard;