# wallet/management/commands/test_infura.py
from django.core.management.base import BaseCommand
from web3 import Web3
from django.conf import settings

class Command(BaseCommand):
    help = 'Test Infura connection'

    def handle(self, *args, **options):
        infura_url = f"https://eth-sepolia.g.alchemy.com/v2/{settings.INFURA_PROJECT_ID}"
        w3 = Web3(Web3.HTTPProvider(infura_url))
        
        try:
            latest_block = w3.eth.block_number
            self.stdout.write(self.style.SUCCESS(f"Connected to Base Sepolia! Latest block: {latest_block}"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Connection failed: {str(e)}"))