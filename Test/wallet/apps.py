# wallet/apps.py
from django.apps import AppConfig
import firebase_admin
from firebase_admin import credentials

class WalletConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'wallet'

    def ready(self):
        if not firebase_admin._apps:
            cred = credentials.Certificate("./serviceAccount.json")  # Update path
            firebase_admin.initialize_app(cred)