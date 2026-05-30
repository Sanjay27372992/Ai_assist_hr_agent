"""Leave URL routes"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LeaveTypeViewSet, LeaveBalanceViewSet, LeaveRequestViewSet

router = DefaultRouter()
router.register('types', LeaveTypeViewSet, basename='leave-types')
router.register('balances', LeaveBalanceViewSet, basename='leave-balances')
router.register('', LeaveRequestViewSet, basename='leave-requests')

urlpatterns = [
    path('', include(router.urls)),
]
