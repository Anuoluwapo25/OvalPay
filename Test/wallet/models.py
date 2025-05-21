# wallet/models.py
from django.db import models
from django.conf import settings
from cryptography.fernet import Fernet
from django.core.exceptions import ValidationError
from decimal import Decimal
from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    firebase_uid = models.CharField(max_length=128, unique=True)
    
    class Meta:
        db_table = 'wallet_user'  

    groups = models.ManyToManyField(
        'auth.Group',
        related_name='wallet_user_set',
        blank=True,
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        related_name='wallet_user_set',
        blank=True,
    )

class EncryptedField:
    def __init__(self, field_name):
        self.field_name = field_name
    
    def __get__(self, instance, owner):
        if instance is None:
            return self
        value = getattr(instance, self.field_name)
        if value is None:
            return None
        fernet = Fernet(settings.FERNET_KEY.encode())
        return fernet.decrypt(value.encode()).decode()

    def __set__(self, instance, value):
        if value is not None:
            fernet = Fernet(settings.FERNET_KEY.encode())
            encrypted = fernet.encrypt(value.encode()).decode()
            setattr(instance, self.field_name, encrypted)

class Wallet(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    public_address = models.CharField(max_length=42, unique=True)
    private_key = models.CharField(max_length=66)
    created_at = models.DateTimeField(auto_now_add=True)
    name = models.CharField(max_length=100, default="Main Wallet")

    
    def get_balance(self, chain='ethereum'):
        from .utils import BlockchainConnection
        try:
            bc = BlockchainConnection(chain)
            return bc.get_native_balance(self.public_address)
        except:
            return "0"
    
    def get_token_balance(self, token_symbol, chain='ethereum'):
        from .utils import BlockchainConnection
        try:
            bc = BlockchainConnection(chain)
            return bc.get_token_balance(token_symbol, self.public_address)
        except:
            return "0"

class Transaction(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed')
    ]
    
    wallet = models.ForeignKey(Wallet, on_delete=models.CASCADE)
    tx_hash = models.CharField(max_length=66)
    amount = models.DecimalField(max_digits=36, decimal_places=18)
    to_address = models.CharField(max_length=42)
    token_symbol = models.CharField(max_length=10)
    chain = models.CharField(max_length=20, default='ethereum')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

class Token(models.Model):
    symbol = models.CharField(max_length=10, unique=True)
    name = models.CharField(max_length=100)
    contract_address = models.CharField(max_length=42)
    decimals = models.PositiveSmallIntegerField(default=18)
    is_active = models.BooleanField(default=True)
    network = models.CharField(max_length=20, default='sepolia')  # or 'mainnet'


    class Meta:
        unique_together = ('symbol', 'network')

    def __str__(self):
        return f"{self.symbol} ({self.network})"
