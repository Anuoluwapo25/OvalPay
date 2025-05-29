interface ChainConfig {
  id: number;
  name: string;
  rpc_url: string;
  explorer: string;
  native_currency: string;
  tokens: {
    [key: string]: string;
  };
}

export const CHAIN_CONFIGS: { [key: string]: ChainConfig } = {
  ethereum: {
    id: 11155111,
    name: 'Ethereum Sepolia',
    rpc_url: 'https://sepolia.g.alchemy.com/KmZaTQIZZnXt1MFSeK0QvQ0DxmG6i53n',
    explorer: 'https://sepolia.etherscan.io',
    native_currency: 'ETH',
    tokens: {
      usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
      usdt: '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06'
    }
  },
  base: {
    id: 84531,
    name: 'Base Sepolia',
    rpc_url: 'https://base-sepolia.g.alchemy.com/KmZaTQIZZnXt1MFSeK0QvQ0DxmG6i53n',
    explorer: 'https://basescan.org',
    native_currency: 'ETH',
    tokens: {
      usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      usdt: ''
    }
  },
  polygon: {
    id: 80002,
    name: 'Polygon Amoy',
    rpc_url: 'https://polygon-amoy.g.alchemy.com/v2/KmZaTQIZZnXt1MFSeK0QvQ0DxmG6i53n',
    explorer: 'https://amoy.polygonscan.com',
    native_currency: 'MATIC',
    tokens: {
      usdc: '0x2aC8262537Cb7e9e80F5f4aC3ee3aD6C5b810C15',
      usdt: '0x4A0D1092E9df255cf95D72834Ea9255132782318'
    }
  }
};