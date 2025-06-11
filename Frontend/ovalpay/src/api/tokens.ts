// import axios from 'axios';

// const API_BASE = 'http://127.0.0.1:8000/api';

// export interface TokenBalance {
//   symbol: string;
//   balance: string;
//   contractAddress: string;
// }

// export const fetchTokenBalances = async (token: string): Promise<TokenBalance[]> => {
//   const { data } = await axios.get(`${API_BASE}/wallet/tokens`, {
//     headers: { Authorization: `Token ${token}` }
//   });
//   return data;
// };

// export const swapTokens = async (
//   token: string,
//   swapData: { fromToken: string; toToken: string; amount: string }
// ): Promise<{ transaction: Transaction }> => {
//   const { data } = await axios.post(`${API_BASE}/swap/`, swapData, {
//     headers: { Authorization: `Token ${token}` }
//   });
//   return data;
// };

// export const getExchangeRate = async (from: string, to: string): Promise<number> => {
//   const { data } = await axios.get(`${API_BASE}/swap/rate?from=${from}&to=${to}`);
//   return data.rate;
// };