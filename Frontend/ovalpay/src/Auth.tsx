import { useState } from 'react';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import app from './firebase'; 

function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password2: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const auth = getAuth(app);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (formData.password !== formData.password2) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      
      const firebaseUser = userCredential.user;
      const idToken = await userCredential.user.getIdToken();


      await axios.post('http://127.0.0.1:8000/api/register/', {
        idToken,
        username: formData.username,
        email: formData.email,
        emailVerified: firebaseUser.emailVerified,
      });

      navigate('/login');
    } catch (err) {
      setIsLoading(false);
      if (err instanceof Error) {
        if (err.message.includes('email-already-in-use')) {
          setError('Email is already in use');
        } else if (err.message.includes('weak-password')) {
          setError('Password should be at least 6 characters');
        } else if (err.message.includes('invalid-email')) {
          setError('Invalid email address');
        } else {
          setError('Registration failed: ' + err.message);
        }
      } else if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Backend registration failed');
      } else {
        setError('An unexpected error occurred');
      }
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6 text-center">Register</h2>
      {error && <div className="mb-4 p-2 text-red-500 bg-red-50 rounded">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2" htmlFor="username">
            Username
          </label>
          <input
            id="username"
            type="text"
            name="username"
            className="w-full p-2 border rounded"
            value={formData.username}
            onChange={handleChange}
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            name="email"
            className="w-full p-2 border rounded"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            name="password"
            className="w-full p-2 border rounded"
            value={formData.password}
            onChange={handleChange}
            required
            minLength={6}
          />
        </div>
        <div className="mb-6">
          <label className="block text-gray-700 mb-2" htmlFor="password2">
            Confirm Password
          </label>
          <input
            id="password2"
            type="password"
            name="password2"
            className="w-full p-2 border rounded"
            value={formData.password2}
            onChange={handleChange}
            required
          />
        </div>
        <button
          type="submit"
          className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600 disabled:bg-green-300"
          disabled={isLoading}
        >
          {isLoading ? 'Registering...' : 'Register'}
        </button>
        <div className="mt-4 text-center">
          <p>Already have an account? <a href="/login" className="text-blue-500 hover:underline">Login</a></p>
        </div>
      </form>
    </div>
  );
}

export default Register;