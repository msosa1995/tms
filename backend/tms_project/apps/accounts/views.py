"""
accounts/views.py — Vista de login por username (no email)
"""
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()


class UsernameLoginSerializer(TokenObtainPairSerializer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["username"] = serializers.CharField(write_only=True)
        self.fields.pop(self.username_field, None)

    def validate(self, attrs):
        username = attrs.pop("username")
        try:
            user = User.objects.get(username=username)
            attrs[self.username_field] = getattr(user, self.username_field)
        except User.DoesNotExist:
            raise serializers.ValidationError({"detail": "Credenciales incorrectas."})
        return super().validate(attrs)


class UsernameTokenObtainPairView(TokenObtainPairView):
    serializer_class = UsernameLoginSerializer
