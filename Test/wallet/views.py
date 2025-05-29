from django.contrib.auth.models import User
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.authtoken.views import ObtainAuthToken
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

from django.contrib.auth import get_user_model
User = get_user_model()

CHAIN_CONFIGS = {
    'ethereum': {
        'id': 11155111,
        'name': 'Ethereum Sepolia',
        'rpc_url': 'https://sepolia.g.alchemy.com/KmZaTQIZZnXt1MFSeK0QvQ0DxmG6i53n',
        'explorer': 'https://sepolia.etherscan.io',
        'native_currency': 'ETH',
        'tokens': {
            'usdc': '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
            'usdt': '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06'
        }
    },
    'base': {
        'id': 84531,
        'name': 'Base Sepolia',
        'rpc_url': 'https://base-sepolia.g.alchemy.com/KmZaTQIZZnXt1MFSeK0QvQ0DxmG6i53n',
        'explorer': 'https://basescan.org',
        'native_currency': 'ETH',
        'tokens': {
            'usdc': '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
            'usdt': ''  # Add Base USDT contract
        }
    },
    'polygon': {
        'id': 80002,
        'name': 'Polygon Amoy',
        'rpc_url': 'https://polygon-amoy.g.alchemy.com/v2/KmZaTQIZZnXt1MFSeK0QvQ0DxmG6i53n',
        'explorer': 'https://amoy.polygonscan.com',
        'native_currency': 'MATIC',
        'tokens': {
            'usdc': '0x2aC8262537Cb7e9e80F5f4aC3ee3aD6C5b810C15',
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

    def post(self, request):
        id_token = request.data.get('idToken')
        username = request.data.get('username') 
        
        try:
            decoded_token = auth.verify_id_token(id_token)
            uid = decoded_token['uid']
            firebase_user = auth.get_user(uid)
            
            if User.objects.filter(firebase_uid=uid).exists():
                return Response(
                    {'error': 'User already registered'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            user = User.objects.create(
                firebase_uid=uid,
                email=firebase_user.email,
                username=username or firebase_user.email.split('@')[0],
                is_active=True
            )
            
            token, _ = Token.objects.get_or_create(user=user)
            
            return Response({
                'token': token.key,
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'username': user.username
                }
            }, status=status.HTTP_201_CREATED)

        except ValueError as e:
            raise AuthenticationFailed('Invalid Firebase token')
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )



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

            # Validate input
            if chain not in CHAIN_CONFIGS:
                return Response(
                    {'error': 'Unsupported chain'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if not all([amount > 0, to_address, Web3.is_address(to_address)]):
                return Response(
                    {'error': 'Invalid amount or recipient address'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            chain_config = CHAIN_CONFIGS[chain]
            w3 = Web3(Web3.HTTPProvider(chain_config['rpc_url']))
            
            if not w3.is_connected():
                return Response(
                    {'error': 'Failed to connect to blockchain'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )

            # Format private key properly
            private_key = wallet.private_key
            if private_key.startswith('0x'):
                private_key = private_key[2:]
            
            account = Account.from_key(private_key)
            
            if token == 'native':
                # Native currency transfer
                balance = w3.eth.get_balance(wallet.public_address)
                gas_price = w3.eth.gas_price
                gas_cost = gas_price * 21000  # Base gas for simple transfers
                amount_wei = w3.to_wei(str(amount), 'ether')
                
                if balance < (amount_wei + gas_cost):
                    return Response(
                        {'error': 'Insufficient funds for transaction (including gas)'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                tx = {
                    'chainId': chain_config['id'],
                    'to': to_address,
                    'value': amount_wei,
                    'gas': 21000,
                    'gasPrice': gas_price,
                    'nonce': w3.eth.get_transaction_count(wallet.public_address),
                }
            else:
                # Token transfer
                if token not in chain_config['tokens'] or not chain_config['tokens'][token]:
                    return Response(
                        {'error': 'Unsupported token for this chain'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                contract = w3.eth.contract(
                    address=chain_config['tokens'][token],
                    abi=ERC20_ABI
                )
                
                try:
                    decimals = contract.functions.decimals().call()
                except:
                    decimals = 18
                
                token_amount = int(amount * (10 ** decimals))
                
                # Check token balance
                token_balance = contract.functions.balanceOf(wallet.public_address).call()
                if token_balance < token_amount:
                    return Response(
                        {'error': 'Insufficient token balance'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Build transaction with proper gas estimation
                tx = contract.functions.transfer(
                    to_address,
                    token_amount
                ).build_transaction({
                    'chainId': chain_config['id'],
                    'from': wallet.public_address,
                    'nonce': w3.eth.get_transaction_count(wallet.public_address),
                })
                
                # Estimate gas properly
                try:
                    tx['gas'] = contract.functions.transfer(
                        to_address,
                        token_amount
                    ).estimate_gas({
                        'from': wallet.public_address
                    })
                except Exception as e:
                    return Response(
                        {'error': f'Gas estimation failed: {str(e)}'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                tx['gasPrice'] = w3.eth.gas_price

            # Sign and send transaction
            signed_tx = account.sign_transaction(tx)
            tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)

            # Save transaction record
            Transaction.objects.create(
                wallet=wallet,
                tx_hash=tx_hash.hex(),
                amount=-amount,
                to_address=to_address,
                token_symbol=token.upper() if token != 'native' else chain_config['native_currency'],
                status='PENDING',  # Start as pending, can update later
                chain=chain
            )

            return Response({
                'status': 'Transaction submitted',
                'tx_hash': tx_hash.hex(),
                'explorer_url': f"{chain_config['explorer']}/tx/{tx_hash.hex()}"
            })

        except Wallet.DoesNotExist:
            return Response(
                {'error': 'Wallet not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Transaction failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        


class WalletDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            wallet = Wallet.objects.get(user=request.user)
            chain = request.query_params.get('chain', 'ethereum').lower()
            
            if chain not in CHAIN_CONFIGS:
                return Response({'error': 'Unsupported chain'}, status=400)
            
            chain_config = CHAIN_CONFIGS[chain]
            w3 = Web3(Web3.HTTPProvider(chain_config['rpc_url']))
            
            if not w3.is_connected():
                return Response({'error': 'Failed to connect to blockchain'}, status=503)
            
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
            return Response({'error': 'Wallet not found'}, status=404)
        except Exception as e:
            logger.error(f"Dashboard error: {str(e)}")
            return Response(
                {'error': 'Internal server error'},
                status=500
            )

