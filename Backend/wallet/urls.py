from django.urls import path
from rest_framework.authtoken.views import obtain_auth_token

from .views import (create_wallet, RegisterView,  
                    WalletDashboardView, SendCryptoView, YellowCardOnRampView, YellowCardOffRampView, yellowcard_webhook)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'), 
    path('wallet/create/', create_wallet, name='create-wallet'),
    path('wallet/dashboard/', WalletDashboardView.as_view(), name='wallet-dashboard'),
    path('wallet/send/', SendCryptoView.as_view(), name='send-crypto'),
    path('token-auth/', obtain_auth_token, name='api_token_auth'),
    path('yellowcard/on-ramp/', YellowCardOnRampView.as_view(), name='yellowcard-on-ramp'),
    path('yellowcard/off-ramp/', YellowCardOffRampView.as_view(), name='yellowcard-off-ramp'),
    path('webhooks/yellowcard/', yellowcard_webhook, name='yellowcard-webhook'),


]