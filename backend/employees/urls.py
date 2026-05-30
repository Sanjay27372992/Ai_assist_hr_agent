"""Employee app URL configuration"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DepartmentViewSet, DesignationViewSet, EmployeeViewSet

router = DefaultRouter()
router.register('departments', DepartmentViewSet, basename='departments')
router.register('designations', DesignationViewSet, basename='designations')
router.register('', EmployeeViewSet, basename='employees')

urlpatterns = [
    path('', include(router.urls)),
]
