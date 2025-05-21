# wallet/authentication.py
from django.contrib.auth import get_user_model
import firebase_admin
from firebase_admin import auth
from rest_framework.authtoken.models import Token

User = get_user_model()

class FirebaseAuthentication:
    def authenticate(self, request, id_token=None):
        try:
            decoded_token = auth.verify_id_token(id_token)
            uid = decoded_token['uid']
            
         
            user, created = User.objects.get_or_create(
                firebase_uid=uid,
                defaults={
                    'username': decoded_token.get('email', '').split('@')[0],
                    'email': decoded_token.get('email', ''),
                    'password': None  
                }
            )
            
            if created:
                Token.objects.create(user=user)
            
            return user
            
        except Exception as e:
            print(f"Firebase auth error: {str(e)}")
            return None