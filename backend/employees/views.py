"""
Employee Management ViewSets:
- DepartmentViewSet
- DesignationViewSet
- EmployeeViewSet (with search/filter/pagination)
"""
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q

from accounts.permissions import IsHRAdmin, IsManagerOrHRAdmin
from .models import Department, Designation, Employee
from .serializers import (
    DepartmentSerializer,
    DesignationSerializer,
    EmployeeListSerializer,
    EmployeeDetailSerializer,
    EmployeeCreateSerializer,
)
from .filters import EmployeeFilter


class DepartmentViewSet(viewsets.ModelViewSet):
    """CRUD for departments"""
    queryset = Department.objects.all().order_by('name')
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'description']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsHRAdmin()]
        return [IsAuthenticated()]


class DesignationViewSet(viewsets.ModelViewSet):
    """CRUD for designations"""
    queryset = Designation.objects.all().select_related('department').order_by('title')
    serializer_class = DesignationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['department']
    search_fields = ['title', 'department__name']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsHRAdmin()]
        return [IsAuthenticated()]


class EmployeeViewSet(viewsets.ModelViewSet):
    """Full CRUD for Employee management with filtering, searching, pagination"""
    queryset = Employee.objects.all().select_related('user', 'department', 'designation', 'manager')
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = EmployeeFilter
    search_fields = ['user__first_name', 'user__last_name', 'user__email', 'employee_id', 'phone']
    ordering_fields = ['created_at', 'date_of_joining', 'user__first_name']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'create':
            return EmployeeCreateSerializer
        if self.action in ['retrieve', 'update', 'partial_update']:
            return EmployeeDetailSerializer
        return EmployeeListSerializer

    def get_permissions(self):
        if self.action in ['create', 'destroy']:
            return [IsAuthenticated(), IsHRAdmin()]
        if self.action in ['update', 'partial_update']:
            return [IsAuthenticated(), IsManagerOrHRAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        # Employees can only see their own profile
        if user.role == 'employee':
            return Employee.objects.filter(user=user).select_related('user', 'department', 'designation')
        # Managers can see their team
        if user.role == 'manager':
            try:
                manager_emp = Employee.objects.get(user=user)
                return Employee.objects.filter(
                    Q(manager=manager_emp) | Q(user=user)
                ).select_related('user', 'department', 'designation')
            except Employee.DoesNotExist:
                return Employee.objects.none()
        return self.queryset

    @action(detail=False, methods=['get'], url_path='my-profile')
    def my_profile(self, request):
        """Get logged-in user's employee profile"""
        try:
            employee = Employee.objects.get(user=request.user)
            serializer = EmployeeDetailSerializer(employee, context={'request': request})
            return Response(serializer.data)
        except Employee.DoesNotExist:
            return Response({'error': 'Employee profile not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'], url_path='upload-photo')
    def upload_photo(self, request, pk=None):
        """Upload employee profile photo"""
        employee = self.get_object()
        if 'profile_picture' in request.FILES:
            employee.profile_picture = request.FILES['profile_picture']
            employee.save()
            return Response({'message': 'Photo uploaded successfully', 'url': employee.profile_picture.url})
        return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
