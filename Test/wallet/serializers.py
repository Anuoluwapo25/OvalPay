# serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['firebase_uid', 'email']
        extra_kwargs = {
            'firebase_uid': {'read_only': True},  
            'email': {'required': True}
        }

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already exists")
        return value.lower()  
    

# class YellowCardOnRampSerializer(serializers.Serializer):
#     amount = serializers.DecimalField(max_digits=18, decimal_places=8)
#     currency = serializers.CharField(max_length=3)
#     payment_method = serializers.CharField(max_length=50)
#     return_url = serializers.URLField()
    
# class YellowCardOffRampSerializer(serializers.Serializer):
#     amount = serializers.DecimalField(max_digits=18, decimal_places=8)
#     currency = serializers.CharField(max_length=3)
#     bank_account = serializers.CharField(max_length=100)
#     narration = serializers.CharField(max_length=100, required=False)