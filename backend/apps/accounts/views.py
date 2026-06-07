from django.contrib.auth import get_user_model
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from .permissions import IsAdminLevel
from .serializers import (
    ChangePasswordSerializer,
    LoginSerializer,
    UserCreateSerializer,
    UserSerializer,
)

User = get_user_model()


class LoginView(TokenObtainPairView):
    """POST /api/v1/auth/login/  -> { access, refresh, user }"""
    serializer_class = LoginSerializer


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("last_name", "first_name")
    permission_classes = [IsAuthenticated, IsAdminLevel]
    search_fields = ("email", "first_name", "last_name", "username")
    filterset_fields = ("role", "is_active", "is_locked")

    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        return UserSerializer

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def me(self, request):
        return Response(UserSerializer(request.user).data)

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated])
    def change_password(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Mot de passe mis à jour."})

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsAdminLevel])
    def toggle_lock(self, request, pk=None):
        user = self.get_object()
        user.is_locked = not user.is_locked
        user.is_active = not user.is_locked
        user.save(update_fields=["is_locked", "is_active"])
        return Response({"is_locked": user.is_locked})
