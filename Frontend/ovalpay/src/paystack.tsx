import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface PaymentData {
  amount: number;
  bookId: number;
  reference: string;
  authorization_url: string;
}

interface VerificationResponse {
  status: number;
  message: string;
  data: {
    status: 'success' | 'failed' | 'abandoned';
    reference: string;
    amount: number;
  };
}

const Payment: React.FC = () => {
  const [amount, setAmount] = useState<number>(5000);
  const [bookId, setBookId] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [paymentStatus, setPaymentStatus] = useState<string>('');
  const [reference, setReference] = useState<string>('');

  // Check for payment verification on component mount (for callback)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentRef = urlParams.get('reference') || reference;
    
    if (paymentRef) {
      verifyPayment(paymentRef);
    }
  }, []);

  const initiatePayment = async (): Promise<PaymentData | null> => {
    try {
      const response = await axios.post<{ data: PaymentData }>(
        'http://localhost:8000/api/payments/initiate/',
        { amount, bookId },
        { headers: { Authorization: `JWT eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzQ3OTMwMjE5LCJpYXQiOjE3NDc5Mjk5MTksImp0aSI6IjY0NTFmNDFlZTE4ODQ4MWFiMzM3ZmRiZTdhOTdjZThmIiwidXNlcl9pZCI6MTJ9.URaXLSmwnbkoOKcGnaWu9TFgojnpKoW3PCSBN0nxyPU` } }
      );
      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        alert(`Error: ${error.response?.data?.message || error.message}`);
      }
      return null;
    }
  };

  const verifyPayment = async (ref: string): Promise<void> => {
    setLoading(true);
    try {
      const response = await axios.get<VerificationResponse>(
        `http://localhost:8000/api/payments/verify/${ref}/`
      );
      
      setPaymentStatus(response.data.message);
      if (response.data.data.status === 'success') {
        // Payment succeeded - update UI
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        alert(`Verification failed: ${error.response?.data?.message || error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    
    const paymentData = await initiatePayment();
    if (paymentData) {
      setReference(paymentData.reference);
      // Redirect to Paystack
      window.location.href = paymentData.authorization_url;
    } else {
      setLoading(false);
    }
  };

  return (
    <div className="payment-container">
      <h2>Paystack Integration</h2>
      {paymentStatus ? (
        <div className={`status ${paymentStatus.includes('success') ? 'success' : 'error'}`}>
          {paymentStatus}
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Amount (₦):</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              min="100"
              required
            />
          </div>
          <div className="form-group">
            <label>Book ID:</label>
            <input
              type="number"
              value={bookId}
              onChange={(e) => setBookId(Number(e.target.value))}
              required
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Processing...' : 'Pay Now'}
          </button>
        </form>
      )}
    </div>
  );
};

export default Payment;