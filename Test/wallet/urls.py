from django.urls import path
from rest_framework.authtoken.views import obtain_auth_token

from .views import (RegisterView, CustomAuthToken, 
                    WalletDashboardView, SendCryptoView)




urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'), 
    path('wallet/dashboard/', WalletDashboardView.as_view(), name='wallet-dashboard'),
    path('wallet/send/', SendCryptoView.as_view(), name='send-crypto'),
    path('token-auth/', CustomAuthToken.as_view(), name='api_token_auth'),




]