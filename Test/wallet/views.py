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

            # Input validation
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

            # Initialize Web3
            w3 = Web3(Web3.HTTPProvider(chain_config['rpc_url']))
            if not w3.is_connected():
                return Response(
                    {'error': 'Blockchain connection failed'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )

            # Prepare account
            private_key = wallet.private_key
            if private_key.startswith('0x'):
                private_key = private_key[2:]
            account = Account.from_key(private_key)

            # Build transaction
            if token == 'native':
                tx = self._build_native_tx(w3, account, amount, to_address, chain_config)
            else:
                tx = self._build_token_tx(w3, account, amount, to_address, chain_config, token)

            # Sign and send
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
        
        # Get token decimals
        decimals = contract.functions.decimals().call()
        token_amount = int(Decimal(str(amount)) * (10 ** decimals))
        
        # Check token balance first
        balance = contract.functions.balanceOf(account.address).call()
        if balance < token_amount:
            raise Exception(f'Insufficient {token.upper()} balance. Need {amount}, have {balance / (10 ** decimals)}')
        
        # Build the transaction with explicit 'from' field
        tx = contract.functions.transfer(
            to_address,
            token_amount
        ).build_transaction({
            'chainId': chain_config['id'],
            'from': account.address,  # This is crucial!
            'gas': 100000,  # Set appropriate gas limit
            'gasPrice': w3.eth.gas_price,
            'nonce': w3.eth.get_transaction_count(account.address),
        })
        
        return tx


class WalletDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # 1. Get wallet and validate chain
            wallet = Wallet.objects.get(user=request.user)
            chain = request.query_params.get('chain', 'ethereum').lower()
            
            if chain not in CHAIN_CONFIGS:
                return Response(
                    {'error': 'Unsupported chain'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # 2. Initialize Web3 connection
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
            
            # 3. Get balances
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
            
            # 4. Get transactions
            transactions = Transaction.objects.filter(
                wallet=wallet,
                chain=chain
            ).order_by('-created_at')[:10]
            
            # 5. Return successful response
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
# @api_view(['POST'])
# @permission_classes([IsAuthenticated])
# def create_wallet(request):
#     if Wallet.objects.filter(user=request.user).exists():
#         return JsonResponse(
#             {'error': 'User already has a wallet'}, 
#             status=400
#         )
    
#     account = Web3().eth.account.create()
    
#     wallet = Wallet.objects.create(
#         user=request.user,
#         private_key=account.key.hex(),
#         public_address=account.address,
#         name=request.data.get('name', 'MultiChain Wallet')
#     )
    
#     return JsonResponse({
#         'address': account.address,
#         'message': 'Wallet created successfully'
#     })


# class SendCryptoView(APIView):
#     permission_classes = [IsAuthenticated]

#     def post(self, request):
#         try:
#             wallet = Wallet.objects.get(user=request.user)
#             amount = Decimal(request.data.get('amount', 0))
#             to_address = request.data.get('address', '').strip()
#             token = request.data.get('token', 'native').lower()
#             chain = request.data.get('chain', 'ethereum').lower()

#             if chain not in CHAIN_CONFIGS:
#                 return Response(
#                     {'error': 'Unsupported chain'},
#                     status=status.HTTP_400_BAD_REQUEST
#                 )

#             if not all([amount > 0, to_address, Web3.is_address(to_address)]):
#                 return Response(
#                     {'error': 'Invalid amount or recipient address'},
#                     status=status.HTTP_400_BAD_REQUEST
#                 )

#             chain_config = CHAIN_CONFIGS[chain]
#             w3 = Web3(Web3.HTTPProvider(chain_config['rpc_url']))
#             if not w3.is_connected():
#                 return Response(
#                     {'error': 'Failed to connect to blockchain'},
#                     status=status.HTTP_503_SERVICE_UNAVAILABLE
#                 )

#             if token == 'native':
#                 tx = {
#                     'chainId': chain_config['id'],
#                     'to': to_address,
#                     'value': w3.to_wei(str(amount), 'ether'),
#                     'gas': 21000,
#                     'gasPrice': w3.eth.gas_price,
#                     'nonce': w3.eth.get_transaction_count(wallet.public_address),
#                 }
#             else:
#                 if token not in chain_config['tokens']:
#                     return Response(
#                         {'error': 'Unsupported token for this chain'},
#                         status=status.HTTP_400_BAD_REQUEST
#                     )
                
#                 contract = w3.eth.contract(
#                     address=chain_config['tokens'][token],
#                     abi=ERC20_ABI
#                 )
                
#                 try:
#                     decimals = contract.functions.decimals().call()
#                 except:
#                     decimals = 18  
                
#                 token_amount = int(amount * (10 ** decimals))
                
#                 tx = contract.functions.transfer(
#                     to_address,
#                     token_amount
#                 ).build_transaction({
#                     'chainId': chain_config['id'],
#                     'gas': 100000,
#                     'gasPrice': w3.eth.gas_price,
#                     'nonce': w3.eth.get_transaction_count(wallet.public_address),
#                 })

#             try:
#                 private_key = wallet.private_key
#                 if private_key.startswith('0x'):
#                     private_key = private_key[2:]
                
#                 account = Account.from_key(private_key)
#                 signed_tx = account.sign_transaction(tx)
                
#                 if hasattr(signed_tx, 'rawTransaction'):
#                     raw_tx = signed_tx.rawTransaction
#                 elif hasattr(signed_tx, 'raw_transaction'):
#                     raw_tx = signed_tx.raw_transaction
#                 else:
#                     raw_tx = signed_tx['rawTransaction'] if isinstance(signed_tx, dict) else None
                
#                 if not raw_tx:
#                     raise ValueError("Could not extract raw transaction data")

#                 tx_hash = w3.eth.send_raw_transaction(raw_tx)

#                 Transaction.objects.create(
#                     wallet=wallet,
#                     tx_hash=tx_hash.hex(),
#                     amount=-amount,
#                     to_address=to_address,
#                     token_symbol=token.upper() if token != 'native' else chain_config['native_currency'],
#                     status='COMPLETED',
#                     chain=chain
#                 )

#                 return Response({
#                     'status': 'Transaction submitted',
#                     'tx_hash': tx_hash.hex(),
#                     'explorer_url': f"{chain_config['explorer']}/tx/{tx_hash.hex()}"
#                 })

#             except ValueError as e:
#                 error_msg = str(e)
#                 if any(msg in error_msg.lower() for msg in ['insufficient funds', 'gas required exceeds allowance']):
#                     return Response(
#                         {'error': 'Insufficient funds for transaction'},
#                         status=status.HTTP_400_BAD_REQUEST
#                     )
#                 return Response({'error': f'Transaction signing failed: {error_msg}'}, status=status.HTTP_400_BAD_REQUEST)

#         except Wallet.DoesNotExist:
#             return Response(
#                 {'error': 'Wallet not found'},
#                 status=status.HTTP_404_NOT_FOUND
#             )
#         except Exception as e:
#             return Response(
#                 {'error': f'Transaction failed: {str(e)}'},
#                 status=status.HTTP_500_INTERNAL_SERVER_ERROR
#             )




# class WalletDashboardView(APIView):
#     permission_classes = [IsAuthenticated]

#     def get(self, request):
#         try:
#             wallet = Wallet.objects.get(user=request.user)
#             chain = request.query_params.get('chain', 'ethereum').lower()
            
#             try:
#                 bc = BlockchainConnection(chain)
#             except ValueError as e:
#                 return Response({'error': str(e)}, status=400)
#             except ConnectionError as e:
#                 return Response({'error': str(e)}, status=503)
            
#             balances = {
#                 'native': bc.get_native_balance(wallet.public_address),
#                 'tokens': {}
#             }
            
#             for token_symbol in bc.config['tokens'].keys():
#                 balances['tokens'][token_symbol] = bc.get_token_balance(
#                     token_symbol,
#                     wallet.public_address
#                 )
            
#             transactions = Transaction.objects.filter(
#                 wallet=wallet,
#                 chain=chain
#             ).order_by('-created_at')[:10]
            
#             return Response({
#                 'address': wallet.public_address,
#                 'balances': balances,
#                 'currentChain': chain,
#                 'transactions': [
#                     {
#                         'tx_hash': tx.tx_hash,
#                         'amount': str(abs(tx.amount)),
#                         'to_address': tx.to_address,
#                         'status': tx.status,
#                         'time': tx.created_at,
#                         'token_symbol': tx.token_symbol,
#                         'chain': tx.chain
#                     } for tx in transactions
#                 ]
#             })
            
#         except Wallet.DoesNotExist:
#             return Response({'error': 'Wallet not found'}, status=404)
#         except Exception as e:
#             logger.error(f"Dashboard error: {str(e)}")
#             return Response(
#                 {'error': 'Internal server error'},
#                 status=500
#             )