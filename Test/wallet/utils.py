from web3 import Web3
import logging
from decimal import Decimal

logger = logging.getLogger(__name__)

class BlockchainConnection:
    def __init__(self, chain_name):
        self.chain_name = chain_name
        self.config = self._get_chain_config()
        self.w3 = self._connect()
        
    def _get_chain_config(self):
        from django.conf import settings
        try:
            return settings.CHAIN_CONFIGS[self.chain_name]
        except KeyError:
            raise ValueError(f"Unsupported chain: {self.chain_name}")
    
    def _connect(self):
        w3 = Web3(Web3.HTTPProvider(
            self.config['rpc_url'],
            request_kwargs={'timeout': 10}
        ))
        if not w3.is_connected():
            raise ConnectionError(f"Failed to connect to {self.chain_name} RPC")
        return w3
    
    def get_native_balance(self, address):
        balance = self.w3.eth.get_balance(address)
        return str(Decimal(self.w3.from_wei(balance, 'ether')))
    
    def get_token_balance(self, token_symbol, address):
        if token_symbol not in self.config['tokens']:
            raise ValueError(f"Unsupported token for {self.chain_name}")
            
        contract = self.w3.eth.contract(
            address=self.config['tokens'][token_symbol],
            abi=self._get_erc20_abi()
        )
        
        try:
            decimals = contract.functions.decimals().call()
            balance = contract.functions.balanceOf(address).call()
            return str(Decimal(balance) / Decimal(10 ** decimals))
        except Exception as e:
            logger.error(f"Error getting {token_symbol} balance: {str(e)}")
            return "0"
    
    def _get_erc20_abi(self):
        return [
            {
                "constant": True,
                "inputs": [{"name": "_owner", "type": "address"}],
                "name": "balanceOf",
                "outputs": [{"name": "balance", "type": "uint256"}],
                "type": "function"
            },
            {
                "constant": True,
                "inputs": [],
                "name": "decimals",
                "outputs": [{"name": "", "type": "uint8"}],
                "type": "function"
            }
        ]