import axios from 'axios';

export interface PriceData {
  current_price: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  total_volume: number;
}

export const fetchETHPriceData = async (): Promise<PriceData> => {
  const response = await axios.get(
    'https://api.coingecko.com/api/v3/coins/ethereum?localization=false&tickers=false&market_data=true'
  );
  return {
    current_price: response.data.market_data.current_price.usd,
    price_change_24h: response.data.market_data.price_change_24h,
    price_change_percentage_24h: response.data.market_data.price_change_percentage_24h,
    total_volume: response.data.market_data.total_volume.usd
  };
};