import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { auth } from './firebase'; 
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Wallet } from 'lucide-react';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleFirebaseLogin = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();
      console.log("Firebase token:", idToken);
      
      
      const response = await axios.post('http://127.0.0.1:8000/api/token-auth/', 
      { idToken },  
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
      
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('walletAddress', response.data.address);
      navigate('/muilti_dashboard');
    } catch (err) {
      setError('Firebase login failed');
      console.error(err);
    }
  };

  const handleRegularLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/token-auth/', {
        username,
        password
      });
      
      localStorage.setItem('token', response.data.token);
      navigate('/muilti_dashboard');
    } catch (err) {
      // If regular login fails, try Firebase
      try {
        await handleFirebaseLogin(username, password);
      } catch (firebaseErr) {
        setError('Invalid credentials. Please try again.');
        console.error('Login error:', err);
      }
    }
  };

  return (
    <div>
      <div className="flex items-center mt-5 ml-3 space-x-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
                    <Wallet className="w-6 h-6 text-white" />
              </div>
                <h1 className="text-2xl font-bold text-black">PayWallet</h1>
        </div>
    <div className="max-w-md mx-auto mt-20 p-6 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
      {error && <div className="mb-4 text-red-500">{error}</div>}
      <form onSubmit={handleRegularLogin}>
        <div className="mb-4">
          <label className="block  text-white mb-2" htmlFor="username">
            Username or Email
          </label>
          <input
            id="username"
            type="text"
            className="w-full bg-white p-2 border rounded"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="mb-6">
          <label className="block text-white mb-2" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="w-full p-2 border rounded"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 rounded hover:bg-green-600"
        >
          Login
        </button>
      </form>
      <div className="mt-4 text-center">
        <p className='text-white'>Don't have an account? <a href="/register" className="text-purple-500 hover:underline">Register</a></p>
      </div>
    </div>
    </div>
  );
}

export default Login;