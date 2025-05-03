import { useState, useEffect } from "react";
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function CreateWallet() {
  const [address, setAddress] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to login if no token exists
    if (!localStorage.getItem('token')) {
      navigate('/login');
    }
  }, [navigate]);

  const handleCreateWallet = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const { data } = await axios.post(
        'http://127.0.0.1:8000/api/wallet/create/',
        {},
        { headers: { 'Authorization': `Token ${token}` } }
      );
      setAddress(data.address);
    } catch (error) {
      console.error('Error creating wallet:', error);
      alert('Failed to create wallet. Please try again.');
    }
  };

  return (
    <div className="p-6 max-w-sm mt-48 mx-auto">
      <button 
        onClick={handleCreateWallet}
        className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
      >
        Create Custodial Wallet
      </button>
      {address && (
        <div className="mt-4 p-3 bg-gray-100 rounded">
          <p>Your wallet address: <strong>{address}</strong></p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="mt-2 w-full bg-green-500 text-white py-2 rounded hover:bg-green-600"
          >
            Go to Dashboard
          </button>
        </div>
      )}
    </div>
  );
}

export default CreateWallet;