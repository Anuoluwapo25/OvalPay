from django.urls import path
from rest_framework.authtoken.views import obtain_auth_token

from .views import (create_wallet, RegisterView,  
                    WalletDashboardView, SendCryptoView)




urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'), 
    path('wallet/create/', create_wallet, name='create-wallet'),
    path('wallet/dashboard/', WalletDashboardView.as_view(), name='wallet-dashboard'),
    path('wallet/send/', SendCryptoView.as_view(), name='send-crypto'),
    path('token-auth/', obtain_auth_token, name='api_token_auth'),
    # path('wallet/token-balances/', TokenBalanceView.as_view(), name='token-balances'),
    # path('wallet/transactions/', TransactionHistoryView.as_view(), name='transaction-history'),
    # path('wallet/gas-estimate/', GasEstimateView.as_view(), name='gas-estimate'),



]