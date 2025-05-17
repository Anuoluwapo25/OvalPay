import { useState, useEffect } from 'react';
import { fetchWalletData, sendTransaction } from './api/wallet';
import { fetchMarketData }  from './api/market';
import { BalanceCard } from './Components/BalanceCard';
import { Chart }  from './Components/Chart';
import { SendForm } from './Components/SendForm';
import { ReceiveModal } from './Components/RecieveModal';
import { SwapForm } from './Components/SwapForm';
import  TransactionsList from './Components/TransactionsList';
import Navigation  from './Components/Navigation';

interface WalletData {
  address: string;
  balance: string;
  transactions: Transaction[];
}

interface Transaction {
  tx_hash: string;
  to_address: string;
  amount: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  time: string;
}

export const WalletDashboard = () => {
  const [wallet, setWallet] = useState<WalletData>({
    address: '',
    balance: '0',
    transactions: []
  });
  const [marketData, setMarketData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [loading, setLoading] = useState({
    wallet: true,
    market: true,
    send: false
  });

  const [tokens, setTokens] = useState([
  { symbol: 'ETH', balance: wallet.balance, contractAddress: '' },
  { symbol: 'USDT', balance: '0', contractAddress: '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06' },
  { symbol: 'USDC', balance: '0', contractAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' }
]);

  const token = localStorage.getItem('token');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [walletData, marketData] = await Promise.all([
          fetchWalletData(token!),
          fetchMarketData()
        ]);
        
        setWallet(walletData);
        setMarketData(marketData);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading({ wallet: false, market: false, send: false });
      }
    };

    loadData();
  }, [token]);

  const handleSend = async (sendData: { amount: string; address: string }) => {
    setLoading({ ...loading, send: true });
    try {
      await sendTransaction(token!, sendData);
      const updatedWallet = await fetchWalletData(token!);
      setWallet(updatedWallet);
      setActiveModal(null);
    } catch (error) {
      console.error('Send failed:', error);
    } finally {
      setLoading({ ...loading, send: false });
    }
  };

  const formatBalance = (balance: string) => {
    return parseFloat(balance).toFixed(4).replace(/\.?0+$/, '');
  };

  return (
    <div className="bg-gray-900 min-h-screen text-gray-100">
      {/* Header */}
      <div className="bg-black p-4 border-b border-gray-800">
        <div className="flex justify-between items-center max-w-6xl mx-auto">
          <h1 className="font-bold text-2xl text-green-400">Ppay</h1>
          <div className="flex space-x-2">
            <button className="bg-gray-800 p-2 rounded-full">
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-4 pb-20">
        <BalanceCard
          address={wallet.address}
          balance={formatBalance(wallet.balance)}
          onSend={() => setActiveModal('send')}
          onReceive={() => setActiveModal('receive')}
          onSwap={() => setActiveModal('swap')}
        />

        {marketData && <Chart data={marketData} />}

        {activeModal === 'send' && (
          <SendForm
            tokens={tokens}
            onClose={() => setActiveModal(null)}
            
          />
        )}

        {activeModal === 'receive' && (
          <ReceiveModal
            address={wallet.address}
            onClose={() => setActiveModal(null)}
          />
        )}

        {activeModal === 'swap' && (
          <SwapForm
            onClose={() => setActiveModal(null)}
            balance={wallet.balance}
          />
        )}

        <TransactionsList transactions={wallet.transactions} />
      </div>

      <Navigation activeTab={activeTab} onChangeTab={setActiveTab} />
    </div>
  );
};

export default WalletDashboard;