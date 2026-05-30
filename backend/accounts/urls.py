"""URL routes for accounts/auth module"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    LoginView,
    LogoutView,
    ProfileView,
    ChangePasswordView,
    UserViewSet,
    DashboardStatsView,
)
from .ai_views import AIChatView

router = DefaultRouter()
router.register('users', UserViewSet, basename='users')

urlpatterns = [
    # JWT Authentication
    path('login/', LoginView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', LogoutView.as_view(), name='logout'),

    # Profile
    path('profile/', ProfileView.as_view(), name='profile'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),

    # Dashboard stats
    path('dashboard/stats/', DashboardStatsView.as_view(), name='dashboard_stats'),

    # AI Chat
    path('ai/chat/', AIChatView.as_view(), name='ai_chat'),

    # User management
    path('', include(router.urls)),
]
