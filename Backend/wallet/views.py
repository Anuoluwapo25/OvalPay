from django.contrib.auth.models import User
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework import generics, status
from .models import Wallet, Transaction
from web3 import Web3
from eth_account import Account
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from django.http import JsonResponse
from .serializers import UserSerializer
from decimal import Decimal


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

# def send_crypto(request):
#     user_wallet = Wallet.objects.get(user=request.user)
#     w3 = Web3(Web3.HTTPProvider(''))
    
#     # Build transaction
#     tx = {
#         'to': '0xRecipientAddress',
#         'value': w3.to_wei('0.1', 'ether'),
#         'gas': 21000,
#         'nonce': w3.eth.get_transaction_count(user_wallet.public_address),
#     }
    
#     # Sign and send (using backend-controlled key)
#     signed_tx = w3.eth.account.sign_transaction(tx, user_wallet.private_key)
#     tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
    
#     return JsonResponse({'tx_hash': tx_hash.hex()})




class WalletDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        wallet = Wallet.objects.get(user=request.user)
        wallet.sync_balance()
        transactions = Transaction.objects.filter(wallet=wallet).order_by('-created_at')[:10]
        
        return Response({
            'address': wallet.public_address,
            'balance': str(wallet.balance),
            'transactions': [
                {
                    'tx_hash': tx.tx_hash,
                    'amount': str(tx.amount),
                    'to_address': tx.to_address,
                    'status': tx.status,
                    'time': tx.created_at
                } for tx in transactions
            ]
        })


from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from web3 import Web3
from eth_account import Account
from decimal import Decimal
import json
from .models import Wallet, Transaction

class SendCryptoView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            # 1. Validate and get data
            wallet = Wallet.objects.get(user=request.user)
            amount = Decimal(request.data.get('amount', 0))
            to_address = request.data.get('address', '').strip()

            if not all([amount > 0, to_address, Web3.is_address(to_address)]):
                return Response(
                    {'error': 'Invalid amount or recipient address'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # 2. Initialize Web3
            w3 = Web3(Web3.HTTPProvider('https://eth-sepolia.g.alchemy.com/v2/'))
            if not w3.is_connected():
                return Response(
                    {'error': 'Failed to connect to blockchain'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )

            # 3. Prepare transaction
            tx = {
                'chainId': 11155111,
                'to': to_address,
                'value': w3.to_wei(str(amount), 'ether'),
                'gas': 21000,
                'gasPrice': w3.eth.gas_price,
                'nonce': w3.eth.get_transaction_count(wallet.public_address),
            }

            # 4. Universal signing approach
            try:
                private_key = wallet.private_key
                if private_key.startswith('0x'):
                    private_key = private_key[2:]
                
                # Version-agnostic signing
                account = Account.from_key(private_key)
                signed_tx = account.sign_transaction(tx)
                
                # Handle different Web3.py versions
                if hasattr(signed_tx, 'rawTransaction'):
                    raw_tx = signed_tx.rawTransaction
                elif hasattr(signed_tx, 'raw_transaction'):
                    raw_tx = signed_tx.raw_transaction
                else:
                    raw_tx = signed_tx['rawTransaction'] if isinstance(signed_tx, dict) else None
                
                if not raw_tx:
                    raise ValueError("Could not extract raw transaction data")

                tx_hash = w3.eth.send_raw_transaction(raw_tx)

                # 5. Save transaction
                Transaction.objects.create(
                    wallet=wallet,
                    tx_hash=tx_hash.hex(),
                    amount=-amount,
                    to_address=to_address,
                    status='PENDING'
                )

                wallet.balance -= amount
                wallet.save()

                return Response({
                    'status': 'Transaction submitted',
                    'tx_hash': tx_hash.hex(),
                    'explorer_url': f'https://sepolia.etherscan.org/tx/{tx_hash.hex()}'
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