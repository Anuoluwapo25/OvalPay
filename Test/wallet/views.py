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

# Chain configurations
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
    # Add more chains as needed
}

# Standard ERC-20 ABI
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



# class RegisterView(APIView):
#     permission_classes = [AllowAny]  # Add this line

#     def post(self, request):
#         id_token = request.data.get('idToken')  # From frontend
        
#         try:
#             # Verify token (expiry, signature, etc.)
#             decoded_token = auth.verify_id_token(id_token)
#             uid = decoded_token['uid']
            
#             # Optional: Get fresh user data from Firebase
#             firebase_user = auth.get_user(uid)

#             if User.objects.filter(firebase_uid=uid).exists():
#                 return Response(
#                     {'error': 'User already registered'},
#                     status=status.HTTP_400_BAD_REQUEST
#                 )
            
#             # Now process registration
#             serializer = UserSerializer(data={
#                 'firebase_uid': uid,
#                 # 'username': request.data.get('username'),
#                 'email': firebase_user.email or request.data.get('email'),
#                 'password': None  # Not needed if using only Firebase auth
#             })
#             if serializer.is_valid():
#                 user = serializer.save()
                
#                 return Response({
#                     'uid': uid,
#                     'username': user.username,
#                     'email': user.email
#                 }, status=status.HTTP_201_CREATED)
                
#             return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            

#         except ValueError as e:
#             raise AuthenticationFailed('Invalid Firebase token')
#         except firebase_admin._auth_utils.UserNotFoundError:
#             raise AuthenticationFailed('Firebase user not found')
#         except Exception as e:
#             return Response(
#                 {'error': str(e)},
#                 status=status.HTTP_500_INTERNAL_SERVER_ERROR
#             )
    


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


from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.response import Response
from rest_framework import status
import firebase_admin
from firebase_admin import auth
from django.contrib.auth import get_user_model

User = get_user_model()

class CustomAuthToken(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        if 'idToken' in request.data:
            try:
                print("Received token:", request.data.get('idToken'))
                id_token = request.data['idToken']
                print("Received token:", id_token)
                decoded_token = auth.verify_id_token(id_token)
                uid = decoded_token['uid']
                
                user, created = User.objects.get_or_create(
                    firebase_uid=uid,
                    defaults={
                        'username': decoded_token.get('email', '').split('@')[0],
                        'email': decoded_token.get('email', '')
                    }
                )
                
                token, _ = Token.objects.get_or_create(user=user)
                
                return Response({
                    'token': token.key,
                    'user_id': user.pk,
                    'username': user.username
                })
                
            except ValueError as e:
                return Response(
                    {'error': 'Invalid Firebase token'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            except Exception as e:
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        return super().post(request, *args, **kwargs)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_wallet(request):
    if Wallet.objects.filter(user=request.user).exists():
        return JsonResponse(
            {'error': 'User already has a wallet'}, 
            status=400
        )
    
    account = Web3().eth.account.create()
    
    wallet = Wallet.objects.create(
        user=request.user,
        private_key=account.key.hex(),
        public_address=account.address,
        name=request.data.get('name', 'MultiChain Wallet')
    )
    
    return JsonResponse({
        'address': account.address,
        'message': 'Wallet created successfully'
    })


class SendCryptoView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            wallet = Wallet.objects.get(user=request.user)
            amount = Decimal(request.data.get('amount', 0))
            to_address = request.data.get('address', '').strip()
            token = request.data.get('token', 'native').lower()
            chain = request.data.get('chain', 'ethereum').lower()

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

            if token == 'native':
                tx = {
                    'chainId': chain_config['id'],
                    'to': to_address,
                    'value': w3.to_wei(str(amount), 'ether'),
                    'gas': 21000,
                    'gasPrice': w3.eth.gas_price,
                    'nonce': w3.eth.get_transaction_count(wallet.public_address),
                }
            else:
                if token not in chain_config['tokens']:
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
                
                tx = contract.functions.transfer(
                    to_address,
                    token_amount
                ).build_transaction({
                    'chainId': chain_config['id'],
                    'gas': 100000,
                    'gasPrice': w3.eth.gas_price,
                    'nonce': w3.eth.get_transaction_count(wallet.public_address),
                })

            try:
                private_key = wallet.private_key
                if private_key.startswith('0x'):
                    private_key = private_key[2:]
                
                account = Account.from_key(private_key)
                signed_tx = account.sign_transaction(tx)
                
                if hasattr(signed_tx, 'rawTransaction'):
                    raw_tx = signed_tx.rawTransaction
                elif hasattr(signed_tx, 'raw_transaction'):
                    raw_tx = signed_tx.raw_transaction
                else:
                    raw_tx = signed_tx['rawTransaction'] if isinstance(signed_tx, dict) else None
                
                if not raw_tx:
                    raise ValueError("Could not extract raw transaction data")

                tx_hash = w3.eth.send_raw_transaction(raw_tx)

                Transaction.objects.create(
                    wallet=wallet,
                    tx_hash=tx_hash.hex(),
                    amount=-amount,
                    to_address=to_address,
                    token_symbol=token.upper() if token != 'native' else chain_config['native_currency'],
                    status='COMPLETED',
                    chain=chain
                )

                return Response({
                    'status': 'Transaction submitted',
                    'tx_hash': tx_hash.hex(),
                    'explorer_url': f"{chain_config['explorer']}/tx/{tx_hash.hex()}"
                })

            except ValueError as e:
                error_msg = str(e)
                if any(msg in error_msg.lower() for msg in ['insufficient funds', 'gas required exceeds allowance']):
                    return Response(
                        {'error': 'Insufficient funds for transaction'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                return Response({'error': f'Transaction signing failed: {error_msg}'}, status=status.HTTP_400_BAD_REQUEST)

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
            
            try:
                bc = BlockchainConnection(chain)
            except ValueError as e:
                return Response({'error': str(e)}, status=400)
            except ConnectionError as e:
                return Response({'error': str(e)}, status=503)
            
            balances = {
                'native': bc.get_native_balance(wallet.public_address),
                'tokens': {}
            }
            
            for token_symbol in bc.config['tokens'].keys():
                balances['tokens'][token_symbol] = bc.get_token_balance(
                    token_symbol,
                    wallet.public_address
                )
            
            transactions = Transaction.objects.filter(
                wallet=wallet,
                chain=chain
            ).order_by('-created_at')[:10]
            
            return Response({
                'address': wallet.public_address,
                'balances': balances,
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