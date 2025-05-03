# wallet/utils.py
from web3 import Web3
from decimal import Decimal
from django.conf import settings

def get_actual_balance(wallet_address):
    infura_url = f"https://eth-sepolia.g.alchemy.com/v2/{settings.INFURA_PROJECT_ID}"
    w3 = Web3(Web3.HTTPProvider(infura_url))
    
    try:
        balance_wei = w3.eth.get_balance(wallet_address)
        balance_eth = Decimal(balance_wei) / Decimal(10**18)
        return balance_eth
    except Exception as e:
        print(f"Error fetching balance: {str(e)}")
        return None  