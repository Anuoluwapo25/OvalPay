from django.contrib.auth.models import User
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from django.views.decorators.csrf import csrf_exempt
from rest_framework import generics, status
from .models import Wallet, Transaction, Token
from web3 import Web3
from django.utils import timezone
from web3.contract import Contract
from eth_account import Account
from django.conf import settings
from django.core.paginator import Paginator
from .models import Wallet, Token, Transaction
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from django.http import JsonResponse
from .serializers import UserSerializer
from decimal import Decimal
import requests
import json
import hmac
import hashlib
import os

BASE_SEPOLIA_CHAIN_ID = 84532
BASE_SEPOLIA_RPC_URL = f'https://base-sepolia.g.alchemy.com/v2/{settings.ALCHEMY_PROJECT_ID}'
BASE_SEPOLIA_EXPLORER_URL = 'https://sepolia.basescan.org/tx'


STABLECOIN_CONTRACTS = {
    'usdc': '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    'usdt': '0x22c0DB4CC9B339E34956A5699E5E95dC0E00c800',

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
    }
]

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        if request.data.get('password') != request.data.get('password2'):
            return Response(
                {"error": "Passwords do not match"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        user = serializer.save() 
        return Response(
            {"success": "User registered successfully"},
            status=status.HTTP_201_CREATED
        )
    
class CustomAuthToken(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data,
                                         context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user_id': user.pk,
            'email': user.email
        })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_wallet(request):
    if Wallet.objects.filter(user=request.user).exists():
        return JsonResponse(
            {'error': 'User already has a wallet'}, 
            status=400
        )
    
    account = Web3().eth.account.create()
    
    wallet = Wallet.create_wallet(
            user=request.user,
            private_key=account.key.hex(),
            public_address=account.address,
            name=request.data.get('name', 'Oval P')
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
            token = request.data.get('token', 'eth').lower()

            if not all([amount > 0, to_address, Web3.is_address(to_address)]):
                return Response(
                    {'error': 'Invalid amount or recipient address'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            w3 = Web3(Web3.HTTPProvider(f'https://base-sepolia.g.alchemy.com/v2/{settings.ALCHEMY_PROJECT_ID}'))
            if not w3.is_connected():
                return Response(
                    {'error': 'Failed to connect to blockchain'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )

            if token == 'eth':
                tx = {
                    'chainId': 84532,
                    'to': to_address,
                    'value': w3.to_wei(str(amount), 'ether'),
                    'gas': 21000,
                    'gasPrice': w3.eth.gas_price,
                    'nonce': w3.eth.get_transaction_count(wallet.public_address),
                }
            else:
                if token not in STABLECOIN_CONTRACTS:
                    return Response(
                        {'error': 'Unsupported token'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                contract = w3.eth.contract(
                    address=STABLECOIN_CONTRACTS[token],
                    abi=ERC20_ABI
                )
                
                decimals = 6
                token_amount = int(amount * (10 ** decimals))
                
                tx = contract.functions.transfer(
                    to_address,
                    token_amount
                ).build_transaction({
                    'chainId': 84532,
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
                    token_symbol=token.upper(),
                    status='COMPLETED'
                )

                if token == 'eth':
                    wallet.balance -= amount
                    wallet.save()

                return Response({
                    'status': 'Transaction submitted',
                    'tx_hash': tx_hash.hex(),
                    'explorer_url': f'https://base-sepolia.g.alchemy.com/v2/{tx_hash.hex()}'
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
        wallet = Wallet.objects.get(user=request.user)
        wallet.sync_balance()
        
        w3 = Web3(Web3.HTTPProvider(f'https://base-sepolia.g.alchemy.com/v2/{settings.ALCHEMY_PROJECT_ID}'))
        balances = {
            'eth': str(wallet.balance),
            'usdc': '0',
            'usdt': '0'
        }
        
        for token in ['usdc', 'usdt']:
            contract = w3.eth.contract(
                address=STABLECOIN_CONTRACTS[token],
                abi=ERC20_ABI
            )
            try:
                balance = contract.functions.balanceOf(wallet.public_address).call()
                balances[token] = str(Decimal(balance) / Decimal(10**6)) 
            except Exception as e:
                print(f"Error fetching {token} balance: {str(e)}")
        
        transactions = Transaction.objects.filter(wallet=wallet).order_by('-created_at')[:10]
        
        return Response({
            'address': wallet.public_address,
            'balances': balances,
            'transactions': [
                {
                    'tx_hash': tx.tx_hash,
                    'amount': str(abs(tx.amount)),
                    'to_address': tx.to_address,
                    'status': tx.status,
                    'time': tx.created_at,
                    'token_symbol': tx.token_symbol if tx.token_symbol else 'ETH'
                } for tx in transactions
            ]
        })


# class WalletDashboardView(APIView):
#     permission_classes = [IsAuthenticated]

#     def get(self, request):
#         try:
#             wallet = Wallet.objects.get(user=request.user)
            
#             # Add error handling for balance sync
#             try:
#                 wallet.sync_balance()
#             except Exception as sync_error:
#                 print(f"Balance sync failed, using cached values: {str(sync_error)}")
#                 # Continue with potentially stale data rather than failing completely
            
#             w3 = Web3(Web3.HTTPProvider(BASE_SEPOLIA_RPC_URL))
#             if not w3.is_connected():
#                 return Response(
#                     {'error': 'Failed to connect to blockchain'},
#                     status=status.HTTP_503_SERVICE_UNAVAILABLE
#                 )

#             # Initialize balances with cached values first
#             balances = {
#                 'eth': str(wallet.balance),
#                 'usdc': '0',
#                 'usdt': '0'
#             }
            
#             # Try to fetch token balances with proper error handling
#             for token in ['usdc', 'usdt']:
#                 try:
#                     if token in STABLECOIN_CONTRACTS:
#                         contract = w3.eth.contract(
#                             address=STABLECOIN_CONTRACTS[token],
#                             abi=ERC20_ABI
#                         )
#                         balance = contract.functions.balanceOf(wallet.public_address).call()
#                         balances[token] = str(Decimal(balance) / Decimal(10**6))
#                 except Exception as token_error:
#                     print(f"Error fetching {token} balance: {str(token_error)}")
#                     # Keep the default 0 value if the fetch fails
            
#             transactions = Transaction.objects.filter(wallet=wallet).order_by('-created_at')[:10]
            
#             return Response({
#                 'address': wallet.public_address,
#                 'balances': balances,
#                 'transactions': [
#                     {
#                         'tx_hash': tx.tx_hash,
#                         'amount': str(abs(tx.amount)),
#                         'to_address': tx.to_address,
#                         'status': tx.status,
#                         'time': tx.created_at,
#                         'token_symbol': tx.token_symbol if tx.token_symbol else 'ETH'
#                     } for tx in transactions
#                 ]
#             })
            
#         except Wallet.DoesNotExist:
#             return Response(
#                 {'error': 'Wallet not found'},
#                 status=status.HTTP_404_NOT_FOUND
#             )
#         except Exception as e:
#             return Response(
#                 {'error': f'Failed to load dashboard: {str(e)}'},
#                 status=status.HTTP_500_INTERNAL_SERVER_ERROR
#             )





class GasEstimateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            w3 = Web3(Web3.HTTPProvider(settings.WEB3_PROVIDER))
            if not w3.is_connected():
                return Response(
                    {'error': 'Failed to connect to blockchain'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )

            token_symbol = request.data.get('token', 'ETH').upper()
            to_address = request.data.get('address', '').strip()
            amount = Decimal(request.data.get('amount', 0))

            if token_symbol == 'ETH':
                gas_limit = 21000
            else:
                try:
                    token = Token.objects.get(symbol=token_symbol)
                    with open('erc20_abi.json') as f:
                        erc20_abi = json.load(f)
                    contract = w3.eth.contract(address=token.contract_address, abi=erc20_abi)
                    gas_limit = contract.functions.transfer(
                        to_address,
                        w3.to_wei(str(amount), token.decimals)
                    ).estimate_gas({
                        'from': request.user.wallet.public_address
                    })
                except Exception as e:
                    return Response(
                        {'error': f'Gas estimation failed: {str(e)}'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            gas_price = w3.eth.gas_price
            eth_price = self.get_eth_price()
            
            total_cost_eth = float(w3.from_wei(gas_price * gas_limit, 'ether'))
            total_cost_usd = total_cost_eth * eth_price

            return Response({
                'gas_price': str(w3.from_wei(gas_price, 'gwei')),
                'gas_limit': str(gas_limit),
                'total_cost_eth': f"{total_cost_eth:.6f}",
                'total_cost_usd': f"{total_cost_usd:.2f}"
            })

        except Exception as e:
            return Response(
                {'error': f'Failed to estimate gas: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def get_eth_price(self):
        try:
            response = requests.get('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd')
            return response.json()['ethereum']['usd']
        except:
            return 2000  

class TokenBalanceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            w3 = Web3(Web3.HTTPProvider(settings.WEB3_PROVIDER))
            if not w3.is_connected():
                return Response(
                    {'error': 'Failed to connect to blockchain'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )

            wallet = request.user.wallet
            
            try:
                with open('wallet/erc20_abi.json', 'r') as f:
                    erc20_abi = json.load(f)
            except FileNotFoundError:
                return Response(
                    {'error': 'ERC-20 ABI file not found'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            balances = []
            
            eth_balance = w3.from_wei(w3.eth.get_balance(wallet.public_address), 'ether')
            balances.append({
                'symbol': 'ETH',
                'balance': str(eth_balance),
                'contractAddress': '',
                'decimals': 18,
                'icon': 'https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@bea1a9722a8c63169dcc06e86182bf2c55a76bbc/svg/color/eth.svg'
            })

            supported_tokens = Token.objects.filter(network='sepolia')  
            for token in supported_tokens:
                try:
                    contract = w3.eth.contract(address=token.contract_address, abi=erc20_abi)
                    balance = contract.functions.balanceOf(wallet.public_address).call()
                    normalized_balance = balance / (10 ** token.decimals)
                    
                    balances.append({
                        'symbol': token.symbol,
                        'balance': str(normalized_balance),
                        'contractAddress': token.contract_address,
                        'decimals': token.decimals,
                        'icon': f'https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@bea1a9722a8c63169dcc06e86182bf2c55a76bbc/svg/color/{token.symbol.lower()}.svg'
                    })
                except Exception as e:
                    print(f"Error fetching balance for {token.symbol}: {str(e)}")
                    continue
            
            return Response(balances)
            
        except Exception as e:
            print(f"Error in TokenBalanceView: {str(e)}")
            return Response(
                {'error': f'Failed to fetch balances: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
class TransactionHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            wallet = request.user.wallet
            transactions = Transaction.objects.filter(wallet=wallet).order_by('-time')
            
            page_number = request.query_params.get('page', 1)
            page_size = request.query_params.get('page_size', 10)
            paginator = Paginator(transactions, page_size)
            page_obj = paginator.get_page(page_number)
            
            transaction_data = [{
                'tx_hash': tx.tx_hash,
                'to_address': tx.to_address,
                'amount': str(tx.amount),
                'status': tx.status,
                'time': tx.time.isoformat(),
                'token_symbol': tx.token_symbol
            } for tx in page_obj.object_list]
            
            return Response({
                'count': paginator.count,
                'pages': paginator.num_pages,
                'current_page': page_obj.number,
                'results': transaction_data
            })
            
        except Exception as e:
            return Response(
                {'error': f'Failed to fetch transactions: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class YellowCardOnRampView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = YellowCardOnRampSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        wallet = Wallet.objects.get(user=request.user)
        
        payload = {
            "reference": f"OVAL_{request.user.id}_{int(time.time())}",
            "customer": {
                "email": request.user.email,
                "name": f"{request.user.first_name} {request.user.last_name}"
            },
            "currency": serializer.validated_data['currency'],
            "requestedAmount": float(serializer.validated_data['amount']),
            "paymentMethod": serializer.validated_data['payment_method'],
            "redirectUrl": serializer.validated_data['return_url'],
            "settlementWallet": wallet.public_address,
            "metadata": {
                "user_id": request.user.id,
                "wallet_address": wallet.public_address
            }
        }

        headers = {
            "Content-Type": "application/json",
            "X-API-KEY": settings.YELLOWCARD_API_KEY
        }

        try:
            response = requests.post(
                f"{settings.YELLOWCARD_BASE_URL}/transactions/on-ramp",
                json=payload,
                headers=headers
            )
            response.raise_for_status()
            return Response(response.json(), status=status.HTTP_201_CREATED)
        except requests.exceptions.RequestException as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_502_BAD_GATEWAY
            )
        

class YellowCardOffRampView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = YellowCardOffRampSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        wallet = Wallet.objects.get(user=request.user)
        
        wallet.sync_balance()
        if wallet.balance < Decimal(serializer.validated_data['amount']):
            return Response(
                {"error": "Insufficient wallet balance"},
                status=status.HTTP_400_BAD_REQUEST
            )

        payload = {
            "reference": f"OVAL_OFF_{request.user.id}_{int(time.time())}",
            "customer": {
                "email": request.user.email,
                "name": f"{request.user.first_name} {request.user.last_name}"
            },
            "currency": serializer.validated_data['currency'],
            "amount": float(serializer.validated_data['amount']),
            "bankAccount": serializer.validated_data['bank_account'],
            "narration": serializer.validated_data.get('narration', 'Withdrawal from Oval'),
            "sourceWallet": wallet.public_address,
            "metadata": {
                "user_id": request.user.id,
                "wallet_address": wallet.public_address
            }
        }

        headers = {
            "Content-Type": "application/json",
            "X-API-KEY": settings.YELLOWCARD_API_KEY
        }

        try:
            response = requests.post(
                f"{settings.YELLOWCARD_BASE_URL}/transactions/off-ramp",
                json=payload,
                headers=headers
            )
            response.raise_for_status()
            
            wallet.balance -= Decimal(serializer.validated_data['amount'])
            wallet.save()
            
            Transaction.objects.create(
                wallet=wallet,
                tx_hash=response.json().get('id'),
                amount=-Decimal(serializer.validated_data['amount']),
                to_address=f"BANK:{serializer.validated_data['bank_account']}",
                status='PENDING',
                is_off_ramp=True
            )
            
            return Response(response.json(), status=status.HTTP_201_CREATED)
        except requests.exceptions.RequestException as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_502_BAD_GATEWAY
            )


@csrf_exempt
@api_view(['POST'])
def yellowcard_webhook(request):
    signature = request.headers.get('X-Yellowcard-Signature')
    if not signature:
        return Response(status=status.HTTP_401_UNAUTHORIZED)
    
    expected_signature = hmac.new(
        settings.YELLOWCARD_WEBHOOK_SECRET.encode(),
        request.body,
        hashlib.sha256
    ).hexdigest()
    
    if not hmac.compare_digest(signature, expected_signature):
        return Response(status=status.HTTP_401_UNAUTHORIZED)
    
    data = json.loads(request.body)
    event_type = data.get('event')
    transaction_data = data.get('data', {})
    
    if event_type == 'onramp.success':
        try:
            wallet = Wallet.objects.get(public_address=transaction_data.get('settlementWallet'))
            amount = Decimal(transaction_data.get('settledAmount', 0))
            
            wallet.balance += amount
            wallet.save()
            
            Transaction.objects.create(
                wallet=wallet,
                tx_hash=transaction_data.get('id'),
                amount=amount,
                to_address=wallet.public_address,
                status='COMPLETED',
                is_on_ramp=True
            )
        except Wallet.DoesNotExist:
            pass
    
    elif event_type == 'offramp.success':
        try:
            transaction = Transaction.objects.get(tx_hash=transaction_data.get('id'))
            transaction.status = 'COMPLETED'
            transaction.save()
        except Transaction.DoesNotExist:
            pass
    
    elif event_type in ['onramp.failed', 'offramp.failed']:
        try:
            transaction = Transaction.objects.get(tx_hash=transaction_data.get('id'))
            transaction.status = 'FAILED'
            transaction.save()
            
            if event_type == 'offramp.failed':
                wallet = transaction.wallet
                wallet.balance += abs(transaction.amount)
                wallet.save()
        except Transaction.DoesNotExist:
            pass
    
    return Response(status=status.HTTP_200_OK)