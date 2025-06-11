from django.contrib.auth.models import User
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from django.views.decorators.csrf import csrf_exempt
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from .models import Wallet, Transaction
from web3 import Web3
from .models import Wallet
import firebase_admin
from firebase_admin import auth
from rest_framework.exceptions import AuthenticationFailed
from django.utils import timezone
from web3.contract import Contract
from eth_account import Account
from django.conf import settings
from django.core.paginator import Paginator
from rest_framework.decorators import api_view, permission_classes
from django.http import JsonResponse
from .utils import BlockchainConnection
import logging
from .serializers import UserSerializer
from decimal import Decimal
import requests
import json
import hmac
import hashlib
import os
import logging

logger = logging.getLogger(__name__)

from django.contrib.auth import get_user_model
User = get_user_model()

CHAIN_CONFIGS = {
    'ethereum': {
        'id': 11155111,
        'name': 'Ethereum Sepolia',
        'rpc_url': 'https://eth-sepolia.g.alchemy.com/v2/3Pm0lA2JNM7FP5hFa2e86',
        'explorer': 'https://sepolia.etherscan.io',
        'native_currency': 'ETH',
        'tokens': {
            'usdc': '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
            'usdt': '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06'
        }
    },
    'base': {
        'id': 84532,
        'name': 'Base Sepolia',
        'rpc_url': 'https://base-sepolia.g.alchemy.com/v2/3Pm0lA2JNM7FP5hFa2e86',
        'explorer': 'https://basescan.org',
        'native_currency': 'ETH',
        'tokens': {
            'usdc': '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
            'usdt': ''  
        }
    },
    'polygon': {
        'id': 80002,
        'name': 'Polygon Amoy',
        'rpc_url': 'https://polygon-amoy.g.alchemy.com/v2/3Pm0lA2JNM7FP5hFa2e86',
        'explorer': 'https://amoy.polygonscan.com',
        'native_currency': 'MATIC',
        'tokens': {
            'usdc': Web3.to_checksum_address('0x2aC8262537Cb7e9e80F5f4aC3ee3aD6C5b810C15'),
            'usdt': '0x4A0D1092E9df255cf95D72834Ea9255132782318'
        }
    },
 
}


ERC20_ABI = [
    {
        "constant": False,
        "inputs": [
            {"name": "_to", "type": "address"},
            {"name": "_value", "type": "uint256"}
        ],
        "name": "transfer",
        "outputs": [{"name": "", "type": "bool"}],
        "type": "function"
    },
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



class RegisterView(APIView):
    permission_classes = [AllowAny]  
    authentication_classes = []  
    
    def post(self, request):
        id_token = request.data.get('idToken')
        
        if not id_token:
            return Response(
                {'error': 'Firebase ID token is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            decoded_token = auth.verify_id_token(id_token)
            firebase_uid = decoded_token['uid']
            email = decoded_token.get('email')
            
            if not email:
                return Response(
                    {'error': 'Email not found in Firebase token'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            from .models import User
            
            try:
                user = User.objects.get(firebase_uid=firebase_uid)
                logger.info(f"Found existing user with firebase_uid: {firebase_uid}")
            except User.DoesNotExist:
                try:
                    user = User.objects.get(email=email)
                    user.firebase_uid = firebase_uid
                    user.save()
                    logger.info(f"Updated firebase_uid for existing user: {email}")
                except User.DoesNotExist:
                    username = email.split('@')[0]
                    
                    counter = 1
                    original_username = username
                    while User.objects.filter(username=username).exists():
                        username = f"{original_username}{counter}"
                        counter += 1
                    
                    user = User.objects.create(
                        firebase_uid=firebase_uid,  
                        username=username,
                        email=email,
                        first_name=decoded_token.get('name', '').split(' ')[0] if decoded_token.get('name') else '',
                        last_name=' '.join(decoded_token.get('name', '').split(' ')[1:]) if decoded_token.get('name') else ''
                    )
                    logger.info(f"Created new user: {username} with firebase_uid: {firebase_uid}")
            
            wallet_address = self.ensure_wallet_exists(user)
            
            token, _ = Token.objects.get_or_create(user=user)
            
            return Response({
                'token': token.key,
                'address': wallet_address,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'firebase_uid': user.firebase_uid
                }
            }, status=status.HTTP_200_OK)
                     
        except auth.InvalidIdTokenError:
            return Response(
                {'error': 'Invalid Firebase ID token'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        except Exception as e:
            logger.error(f"Firebase authentication error: {str(e)}")
            return Response(
                {'error': f'Authentication failed: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def ensure_wallet_exists(self, user):
        """Helper method to create wallet if it doesn't exist"""
        try:
            from .models import Wallet
            
            try:
                wallet = user.wallet
                return wallet.public_address
            except Wallet.DoesNotExist:
                account = Web3().eth.account.create()
                wallet = Wallet.objects.create(
                    user=user,
                    private_key=account.key.hex(),
                    public_address=account.address,
                    name=f"{user.username}'s Wallet"
                )
                logger.info(f"Created wallet for user {user.username}: {wallet.public_address}")
                return wallet.public_address
                
        except Exception as e:
            logger.error(f"Wallet creation failed for user {user.username}: {str(e)}")
            return None

class CustomAuthToken(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        if 'idToken' in request.data:
            try:
                id_token = request.data['idToken']
                decoded_token = auth.verify_id_token(id_token)
                uid = decoded_token['uid']
                
                user, created = User.objects.get_or_create(
                    firebase_uid=uid,
                    defaults={
                        'username': decoded_token.get('email', '').split('@')[0],
                        'email': decoded_token.get('email', '')
                    }
                )
                
                if not Wallet.objects.filter(user=user).exists():
                    account = Web3().eth.account.create()
                    Wallet.objects.create(
                        user=user,
                        private_key=account.key.hex(),
                        public_address=account.address,
                        name=f"{user.username}'s Wallet"
                    )
                
                token, _ = Token.objects.get_or_create(user=user)
                return Response({
                    'token': token.key,
                    'address': user.wallet.public_address  
                })
                
            except Exception as e:
                return Response({'error': str(e)}, status=400)
        
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            user = User.objects.get(username=request.data['username'])
            if not Wallet.objects.filter(user=user).exists():
                account = Web3().eth.account.create()
                Wallet.objects.create(
                    user=user,
                    private_key=account.key.hex(),
                    public_address=account.address,
                    name=f"{user.username}'s Wallet"
                )
            response.data['address'] = user.wallet.public_address
        return response




class SendCryptoView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            wallet = Wallet.objects.get(user=request.user)
            amount = Decimal(request.data.get('amount', 0))
            to_address = request.data.get('address', '').strip()
            token = request.data.get('token', 'native').lower()
            chain = request.data.get('chain', 'ethereum').lower()

            if not all([amount > 0, to_address, Web3.is_address(to_address)]):
                return Response(
                    {'error': 'Invalid amount or recipient address'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            chain_config = CHAIN_CONFIGS.get(chain)
            if not chain_config:
                return Response(
                    {'error': 'Unsupported chain'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            w3 = Web3(Web3.HTTPProvider(chain_config['rpc_url']))
            if not w3.is_connected():
                return Response(
                    {'error': 'Blockchain connection failed'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )

            private_key = wallet.private_key
            if private_key.startswith('0x'):
                private_key = private_key[2:]
            account = Account.from_key(private_key)

            if token == 'native':
                tx = self._build_native_tx(w3, account, amount, to_address, chain_config)
            else:
                tx = self._build_token_tx(w3, account, amount, to_address, chain_config, token)

            signed_tx = account.sign_transaction(tx)
            raw_tx = signed_tx.rawTransaction if hasattr(signed_tx, 'rawTransaction') else signed_tx.raw_transaction
            tx_hash = w3.eth.send_raw_transaction(raw_tx)

            Transaction.objects.create(
                wallet=wallet,
                tx_hash=tx_hash.hex(),
                amount=-amount,
                to_address=to_address,
                token_symbol=token.upper() if token != 'native' else chain_config['native_currency'],
                status='CONFRIMED',
                chain=chain
            )

            return Response({
                'status': 'Transaction submitted',
                'tx_hash': tx_hash.hex(),
                'explorer_url': f"{chain_config['explorer']}/tx/{tx_hash.hex()}"
            })

        except Exception as e:
            return Response(
                {'error': f'Transaction failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _build_native_tx(self, w3, account, amount, to_address, chain_config):
        return {
            'chainId': chain_config['id'],
            'to': to_address,
            'value': w3.to_wei(str(amount), 'ether'),
            'gas': 21000,
            'gasPrice': w3.eth.gas_price,
            'nonce': w3.eth.get_transaction_count(account.address),
        }

    def _build_token_tx(self, w3, account, amount, to_address, chain_config, token):
        contract_address = chain_config['tokens'].get(token)
        if not contract_address:
            raise Exception(f'Token {token} not configured for {chain_config["name"]}')
        
        contract = w3.eth.contract(
            address=contract_address,
            abi=ERC20_ABI
        )
        
        decimals = contract.functions.decimals().call()
        token_amount = int(Decimal(str(amount)) * (10 ** decimals))
        
        balance = contract.functions.balanceOf(account.address).call()
        if balance < token_amount:
            raise Exception(f'Insufficient {token.upper()} balance. Need {amount}, have {balance / (10 ** decimals)}')
        
        tx = contract.functions.transfer(
            to_address,
            token_amount
        ).build_transaction({
            'chainId': chain_config['id'],
            'from': account.address,  
            'gas': 100000,  
            'gasPrice': w3.eth.gas_price,
            'nonce': w3.eth.get_transaction_count(account.address),
        })
        
        return tx


class WalletDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            wallet = Wallet.objects.get(user=request.user)
            chain = request.query_params.get('chain', 'ethereum').lower()
            
            if chain not in CHAIN_CONFIGS:
                return Response(
                    {'error': 'Unsupported chain'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            chain_config = CHAIN_CONFIGS[chain]
            w3 = Web3(Web3.HTTPProvider(
                chain_config['rpc_url'],
                request_kwargs={'timeout': 10}
            ))
            
            if not w3.is_connected():
                return Response(
                    {'error': 'Failed to connect to blockchain'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )
            
            native_balance = w3.from_wei(
                w3.eth.get_balance(wallet.public_address),
                'ether'
            )
            
            token_balances = {}
            for token_symbol, token_address in chain_config['tokens'].items():
                if token_address:
                    contract = w3.eth.contract(
                        address=token_address,
                        abi=ERC20_ABI
                    )
                    try:
                        decimals = contract.functions.decimals().call()
                        balance = contract.functions.balanceOf(wallet.public_address).call()
                        token_balances[token_symbol] = balance / (10 ** decimals)
                    except Exception as e:
                        token_balances[token_symbol] = f"Error: {str(e)}"
            
            transactions = Transaction.objects.filter(
                wallet=wallet,
                chain=chain
            ).order_by('-created_at')[:10]
            
            return Response({
                'address': wallet.public_address,
                'balances': {
                    'native': str(native_balance),
                    'tokens': token_balances
                },
                'currentChain': chain,
                'transactions': [
                    {
                        'tx_hash': tx.tx_hash,
                        'amount': str(abs(tx.amount)),
                        'to_address': tx.to_address,
                        'status': tx.status,
                        'time': tx.created_at,
                        'token_symbol': tx.token_symbol,
                        'chain': tx.chain
                    } for tx in transactions
                ]
            })
            
        except Wallet.DoesNotExist:
            return Response(
                {'error': 'Wallet not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Dashboard error: {str(e)}", exc_info=True)
            return Response(
                {'error': 'Internal server error'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
