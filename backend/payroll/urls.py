"""Payroll URL routes"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SalaryStructureViewSet, PayrollViewSet, BonusViewSet, DeductionViewSet

router = DefaultRouter()
router.register('salary-structures', SalaryStructureViewSet, basename='salary-structures')
router.register('bonuses', BonusViewSet, basename='bonuses')
router.register('deductions', DeductionViewSet, basename='deductions')
router.register('', PayrollViewSet, basename='payroll')

urlpatterns = [
    path('', include(router.urls)),
]
