import React from 'react';

interface NavigationProps {
  activeTab: string;
  onChangeTab: (tab: string) => void;
}

const Navigation: React.FC<NavigationProps> = ({ activeTab, onChangeTab }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 p-3">
      <div className="flex justify-around max-w-6xl mx-auto">
        <button 
          className={`flex flex-col items-center px-4 ${activeTab === 'dashboard' ? 'text-green-400' : 'text-gray-400'}`}
          onClick={() => onChangeTab('dashboard')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-xs mt-1">Home</span>
        </button>
        <button 
          className={`flex flex-col items-center px-4 ${activeTab === 'market' ? 'text-green-400' : 'text-gray-400'}`}
          onClick={() => onChangeTab('market')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
          <span className="text-xs mt-1">Market</span>
        </button>
        <button 
          className={`flex flex-col items-center px-4 ${activeTab === 'trade' ? 'text-green-400' : 'text-gray-400'}`}
          onClick={() => onChangeTab('trade')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <span className="text-xs mt-1">Trade</span>
        </button>
        <button 
          className={`flex flex-col items-center px-4 ${activeTab === 'wallet' ? 'text-green-400' : 'text-gray-400'}`}
          onClick={() => onChangeTab('wallet')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          <span className="text-xs mt-1">Wallet</span>
        </button>
      </div>
    </div>
  );
};

export default Navigation;