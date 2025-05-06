import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './Login';
import CreateWallet from './createWallet';
import WalletDashboard from './Dashboard';
import Register from './Register';
import Wallet from './WalletDashboard'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/create-wallet" element={<CreateWallet />} />
        <Route path="/dashboard" element={<WalletDashboard />} />
        <Route path="/wallet-dashboard" element={<Wallet />} />
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Register />} /> 
      </Routes>
    </Router>
  );
}

export default App;