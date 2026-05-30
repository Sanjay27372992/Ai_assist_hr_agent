"""Leave management views"""
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone

from accounts.permissions import IsHRAdmin, IsManagerOrHRAdmin
from employees.models import Employee
from .models import LeaveType, LeaveBalance, LeaveRequest
from .serializers import (
    LeaveTypeSerializer, LeaveBalanceSerializer,
    LeaveRequestSerializer, ApplyLeaveSerializer, ReviewLeaveSerializer
)


class LeaveTypeViewSet(viewsets.ModelViewSet):
    queryset = LeaveType.objects.all()
    serializer_class = LeaveTypeSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsHRAdmin()]
        return [IsAuthenticated()]


class LeaveBalanceViewSet(viewsets.ModelViewSet):
    queryset = LeaveBalance.objects.all().select_related('employee__user', 'leave_type')
    serializer_class = LeaveBalanceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['employee', 'year', 'leave_type']

    def get_queryset(self):
        user = self.request.user
        if user.role == 'employee':
            try:
                emp = Employee.objects.get(user=user)
                return LeaveBalance.objects.filter(employee=emp)
            except Employee.DoesNotExist:
                return LeaveBalance.objects.none()
        return self.queryset

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsHRAdmin()]
        return [IsAuthenticated()]


class LeaveRequestViewSet(viewsets.ModelViewSet):
    """Leave application and approval workflow"""
    queryset = LeaveRequest.objects.all().select_related(
        'employee__user', 'employee__department', 'leave_type', 'reviewed_by'
    )
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'leave_type', 'employee']
    search_fields = ['employee__user__first_name', 'employee__employee_id', 'reason']
    ordering = ['-applied_at']

    def get_serializer_class(self):
        if self.action == 'create':
            return ApplyLeaveSerializer
        return LeaveRequestSerializer

    def get_queryset(self):
        user = self.request.user
        qs = LeaveRequest.objects.all().select_related(
            'employee__user', 'employee__department', 'leave_type', 'reviewed_by'
        )
        if user.role == 'employee':
            try:
                emp = Employee.objects.get(user=user)
                return qs.filter(employee=emp)
            except Employee.DoesNotExist:
                return qs.none()
        if user.role == 'manager':
            try:
                manager_emp = Employee.objects.get(user=user)
                return qs.filter(employee__manager=manager_emp)
            except Employee.DoesNotExist:
                return qs.none()
        return qs

    def perform_create(self, serializer):
        """Employee applies for leave — fixed: no double-save, proper error messages"""
        from rest_framework.exceptions import ValidationError

        # Must have an employee profile to apply for leave
        try:
            employee = Employee.objects.get(user=self.request.user)
        except Employee.DoesNotExist:
            raise ValidationError(
                'You must have an Employee profile to apply for leave. '
                'HR Admins should apply through an employee account.'
            )

        leave_type = serializer.validated_data['leave_type']
        year = serializer.validated_data['start_date'].year

        # Calculate how many days the leave will be (before saving)
        from datetime import timedelta
        start = serializer.validated_data['start_date']
        end = serializer.validated_data['end_date']
        current, total_days = start, 0
        while current <= end:
            if current.weekday() < 5:  # Mon–Fri only
                total_days += 1
            current += timedelta(days=1)

        # Check leave balance if one exists
        try:
            balance = LeaveBalance.objects.get(employee=employee, leave_type=leave_type, year=year)
            if total_days > balance.remaining_days:
                raise ValidationError(
                    f'Insufficient balance. You have {balance.remaining_days} day(s) left '
                    f'for {leave_type.name}, but requested {total_days} day(s).'
                )
            # Save leave request once, then update balance
            leave_obj = serializer.save(employee=employee)
            balance.pending_days += leave_obj.total_days
            balance.save()
            return
        except LeaveBalance.DoesNotExist:
            # No balance record — still allow submission (HR can manage balances separately)
            serializer.save(employee=employee)


    @action(detail=True, methods=['post'], url_path='review')
    def review(self, request, pk=None):
        """HR/Manager approve or reject leave"""
        leave_request = self.get_object()

        if leave_request.status != 'pending':
            return Response({'error': 'Leave request already processed'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = ReviewLeaveSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        new_status = serializer.validated_data['status']
        leave_request.status = new_status
        leave_request.reviewed_by = request.user
        leave_request.review_comment = serializer.validated_data.get('review_comment', '')
        leave_request.reviewed_at = timezone.now()
        leave_request.save()

        # Update leave balance
        try:
            balance = LeaveBalance.objects.get(
                employee=leave_request.employee,
                leave_type=leave_request.leave_type,
                year=leave_request.start_date.year
            )
            balance.pending_days = max(0, balance.pending_days - leave_request.total_days)
            if new_status == 'approved':
                balance.used_days += leave_request.total_days
            balance.save()
        except LeaveBalance.DoesNotExist:
            pass

        return Response({
            'message': f'Leave request {new_status}',
            'leave': LeaveRequestSerializer(leave_request).data
        })

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel(self, request, pk=None):
        """Employee cancels their own pending leave request"""
        leave_request = self.get_object()

        if leave_request.status != 'pending':
            return Response({'error': 'Can only cancel pending requests'}, status=status.HTTP_400_BAD_REQUEST)

        # Verify it belongs to the requesting employee
        if request.user.role == 'employee':
            try:
                emp = Employee.objects.get(user=request.user)
                if leave_request.employee != emp:
                    return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
            except Employee.DoesNotExist:
                return Response({'error': 'Employee not found'}, status=status.HTTP_404_NOT_FOUND)

        leave_request.status = 'cancelled'
        leave_request.save()

        # Refund pending days
        try:
            balance = LeaveBalance.objects.get(
                employee=leave_request.employee,
                leave_type=leave_request.leave_type,
                year=leave_request.start_date.year
            )
            balance.pending_days = max(0, balance.pending_days - leave_request.total_days)
            balance.save()
        except LeaveBalance.DoesNotExist:
            pass

        return Response({'message': 'Leave request cancelled'})
