"""
Views for accounts/auth module:
- Login (JWT)
- Logout (blacklist token)
- Profile
- User management
"""
from rest_framework import generics, status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model

from .serializers import (
    CustomTokenObtainPairSerializer,
    UserSerializer,
    UserCreateSerializer,
    ChangePasswordSerializer,
)
from .permissions import IsHRAdmin

User = get_user_model()


class LoginView(TokenObtainPairView):
    """Custom JWT Login returning user info + tokens"""
    permission_classes = [AllowAny]
    serializer_class = CustomTokenObtainPairSerializer


class LogoutView(APIView):
    """Blacklist refresh token on logout"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if not refresh_token:
                return Response({'error': 'Refresh token required'}, status=status.HTTP_400_BAD_REQUEST)
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'message': 'Successfully logged out'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class ProfileView(generics.RetrieveUpdateAPIView):
    """Get and update current user profile"""
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    """Change user password"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user = request.user
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            return Response({'message': 'Password changed successfully'})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserViewSet(viewsets.ModelViewSet):
    """Admin CRUD for user management"""
    queryset = User.objects.all().order_by('-date_joined')
    permission_classes = [IsAuthenticated, IsHRAdmin]

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer

    def get_queryset(self):
        queryset = User.objects.all()
        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(role=role)
        return queryset.order_by('-date_joined')


class DashboardStatsView(APIView):
    """Dashboard statistics for HR Admin"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from employees.models import Employee, Department
        from attendance.models import Attendance
        from leaves.models import LeaveRequest
        from django.utils import timezone
        from django.db.models import Count

        today = timezone.now().date()

        try:
            # Employee statistics
            total_employees = Employee.objects.filter(status='active').count()
            total_departments = Department.objects.count()

            # Today's attendance
            today_present = Attendance.objects.filter(date=today, status='present').count()
            today_absent = total_employees - today_present

            # Pending leaves
            pending_leaves = LeaveRequest.objects.filter(status='pending').count()

            # Department-wise employee count — use related_name 'employees'
            dept_data = Department.objects.annotate(
                employee_count=Count('employees')
            ).values('name', 'employee_count')

            return Response({
                'total_employees': total_employees,
                'total_departments': total_departments,
                'today_present': today_present,
                'today_absent': today_absent,
                'attendance_rate': round((today_present / total_employees * 100), 1) if total_employees > 0 else 0,
                'pending_leaves': pending_leaves,
                'department_stats': list(dept_data),
            })
        except Exception as e:
            return Response({
                'total_employees': 0, 'total_departments': 0,
                'today_present': 0, 'today_absent': 0,
                'attendance_rate': 0, 'pending_leaves': 0,
                'department_stats': [], 'error': str(e),
            }, status=status.HTTP_200_OK)
