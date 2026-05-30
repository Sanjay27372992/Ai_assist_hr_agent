"""
Custom permissions for HRMS role-based access control
"""
from rest_framework.permissions import BasePermission


class IsHRAdmin(BasePermission):
    """Allow access only to HR Admins"""
    message = 'Access restricted to HR Administrators only.'

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'hr_admin'


class IsManagerOrHRAdmin(BasePermission):
    """Allow access to Managers and HR Admins"""
    message = 'Access restricted to Managers and HR Administrators.'

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['hr_admin', 'manager']


class IsOwnerOrHRAdmin(BasePermission):
    """Allow access to object owner or HR Admin"""

    def has_object_permission(self, request, view, obj):
        if request.user.role == 'hr_admin':
            return True
        # Check if the object belongs to the user
        if hasattr(obj, 'user'):
            return obj.user == request.user
        if hasattr(obj, 'employee'):
            return obj.employee.user == request.user
        return False
