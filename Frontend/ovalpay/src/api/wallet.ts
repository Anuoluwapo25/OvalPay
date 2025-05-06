// src/api/wallet.ts
import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

export interface Transaction {
  tx_hash: string;
  to_address: string;
  amount: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  time: string;
}

export interface WalletData {
  address: string;
  balance: string;
  transactions: Transaction[];
}

export const fetchWalletData = async (token: string): Promise<WalletData> => {
  const response = await axios.get(`${API_BASE_URL}/wallet/dashboard`, {
    headers: { 'Authorization': `Token ${token}` }
  });
  return response.data;
};

export const sendTransaction = async (
  token: string,
  data: { amount: string; address: string }
): Promise<{ success: boolean; transaction?: Transaction }> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/wallet/send/`, data, {
      headers: { 'Authorization': `Token ${token}` }
    });
    return { success: true, transaction: response.data };
  } catch (error) {
    console.error('Transaction failed:', error);
    return { success: false };
  }
};