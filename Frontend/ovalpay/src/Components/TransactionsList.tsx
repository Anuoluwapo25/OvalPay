import React from 'react';

interface Transaction {
  tx_hash: string;
  to_address: string;
  amount: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  time: string;
}

interface TransactionsListProps {
  transactions: Transaction[];
}
interface TransactionsListProps {
    transactions: Transaction[];
  }

  const formatBalance = (amount: string) => {
    return parseFloat(amount).toFixed(8).replace(/\.?0+$/, '');
  };

const TransactionsList: React.FC<TransactionsListProps> = ({ transactions }) => {
  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <h2 className="text-xl font-bold mb-4">Recent Transactions</h2>
      {transactions.length === 0 ? (
        <p className="text-gray-400">No transactions yet</p>
      ) : (
        <div className="space-y-4">
          {transactions.map((tx) => (
            <div key={tx.tx_hash} className="border-b border-gray-700 pb-4">
              <div className="flex justify-between">
                <div>
                  <div className="flex items-center">
                    <div className="bg-gray-700 p-2 rounded-full mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium">Sent</p>
                      <p className="text-gray-400 text-sm truncate max-w-xs">
                        To: {tx.to_address.substring(0, 8)}...{tx.to_address.substring(tx.to_address.length - 6)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatBalance(tx.amount)} ETH</p>
                  <p className={`text-sm ${
                    tx.status === 'COMPLETED' ? 'text-green-400' : 
                    tx.status === 'FAILED' ? 'text-red-400' : 'text-yellow-400'
                  }`}>
                    {tx.status}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TransactionsList;