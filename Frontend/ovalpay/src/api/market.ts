// src/api/market.ts
import axios from 'axios';

export interface MarketData {
  current_price: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  total_volume: number;
  sparkline: number[];
}

// Named export (not default export)
export const fetchMarketData = async (): Promise<MarketData> => {
  const { data } = await axios.get(
    'https://api.coingecko.com/api/v3/coins/ethereum?localization=false&tickers=false&market_data=true&sparkline=true'
  );
  
  return {
    current_price: data.market_data.current_price.usd,
    price_change_24h: data.market_data.price_change_24h,
    price_change_percentage_24h: data.market_data.price_change_percentage_24h,
    total_volume: data.market_data.total_volume.usd,
    sparkline: data.market_data.sparkline_7d?.price || []
  };
};