from django.db import models
from django.contrib.auth.models import User
from cryptography.fernet import Fernet
from django.core.exceptions import ValidationError
from django.conf import settings
from decimal import Decimal
from .utils import get_actual_balance

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
    _private_key = models.CharField(max_length=255, null=True, blank=True)  
    public_address = models.CharField(max_length=42)
    balance = models.DecimalField(max_digits=36, decimal_places=18, default=Decimal('0'))
    name = models.CharField(max_length=100, default="Main Wallet")
    created_at = models.DateTimeField(auto_now_add=True)
    
    private_key = EncryptedField('_private_key')

    def sync_balance(self):
        actual_balance = get_actual_balance(self.public_address)
        if actual_balance is None:
            raise ValidationError("Failed to sync balance with blockchain")
        
        if self.balance != actual_balance:
            self.balance = actual_balance
            self.save()
        return self.balance

    

    def __str__(self):
        return f"{self.user.username}'s {self.name} ({self.public_address})"

    @classmethod
    def create_wallet(cls, user, private_key, public_address, name="Main Wallet"):
        """Proper way to create a wallet with private key"""
        wallet = cls(user=user, public_address=public_address, name=name)
        wallet.private_key = private_key  
        wallet.save()
        return wallet
    private_key = EncryptedField('_private_key')

    def __str__(self):
        return f"{self.user.username}'s {self.name} ({self.public_address})"

class Transaction(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
    ]
    
    wallet = models.ForeignKey(
        Wallet, 
        on_delete=models.CASCADE,
        related_name='transactions'
    )
    tx_hash = models.CharField(max_length=66, unique=True)
    amount = models.DecimalField(max_digits=36, decimal_places=18)
    to_address = models.CharField(max_length=42)
    token_symbol = models.CharField(max_length=10, default='ETH')
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDING'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if self.status == 'COMPLETED' and not self._state.adding:
            self.wallet.balance += self.amount
            self.wallet.save()
        super().save(*args, **kwargs)


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