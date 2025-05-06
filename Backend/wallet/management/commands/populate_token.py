# management/commands/populate_tokens.py
from django.core.management.base import BaseCommand
from models import Token

class Command(BaseCommand):
    help = 'Populates initial token data'

    def handle(self, *args, **options):
        tokens = [
            {
                'symbol': 'USDT',
                'name': 'Tether USD',
                'contract_address': '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06',
                'decimals': 6,
                'network': 'sepolia'
            },
            {
                'symbol': 'USDC',
                'name': 'USD Coin',
                'contract_address': '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
                'decimals': 6,
                'network': 'sepolia'
            }
        ]
        
        for token_data in tokens:
            Token.objects.get_or_create(
                symbol=token_data['symbol'],
                network=token_data['network'],
                defaults=token_data
            )
        
        self.stdout.write(self.style.SUCCESS('Successfully populated tokens'))