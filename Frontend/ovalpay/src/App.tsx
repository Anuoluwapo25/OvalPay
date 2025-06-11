import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './Login';
import CreateWallet from './createWallet';
import WalletDashboard from './Dashboard';
import Register from './Register';
import OldDash from './OldDashboard';
import All from './all_dashboard';
import Firebase from './Auth';
import LoginAuth from './Login_auth';
import Paystack from './paystack';
import Multi from './Muitichain_dashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/create-wallet" element={<CreateWallet />} />
        <Route path="/dashboard" element={<WalletDashboard />} />
        <Route path="/old_dashboard" element={<OldDash />} />
        <Route path="/muilti_dashboard" element={<Multi />} />
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Register />} /> 
        <Route path="/all_wallet" element={<All />} />
        <Route path="/auth" element={<Firebase />} />
        <Route path="/login_auth" element={<LoginAuth />} />
        <Route path="/payment" element={<Paystack />} />
      </Routes>
    </Router>
  );
}

export default App;