from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password

class UserSerializer(serializers.ModelSerializer):
    password2 = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password', 'password2')
        extra_kwargs = {
            'password': {'write_only': True},
            'email': {'required': True}
        }
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        validate_password(attrs['password'])
        return attrs
    
    def create(self, validated_data):
        user = User.objects.create(
            username=validated_data['username'],
            email=validated_data['email']
        )
        user.set_password(validated_data['password'])
        user.save()
        return user
    

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