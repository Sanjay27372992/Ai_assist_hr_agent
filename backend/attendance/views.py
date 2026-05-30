"""
Attendance Views:
- Daily attendance CRUD
- Check-in / Check-out
- Monthly reports
"""
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db.models import Count, Sum, Q
from datetime import date, timedelta
import calendar

from accounts.permissions import IsHRAdmin, IsManagerOrHRAdmin
from employees.models import Employee
from .models import Attendance
from .serializers import AttendanceSerializer, CheckInSerializer, CheckOutSerializer


class AttendanceViewSet(viewsets.ModelViewSet):
    """Full CRUD for attendance records"""
    queryset = Attendance.objects.all().select_related('employee__user', 'employee__department')
    serializer_class = AttendanceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'is_late', 'date', 'employee']
    search_fields = ['employee__user__first_name', 'employee__user__last_name', 'employee__employee_id']
    ordering_fields = ['date', 'check_in']
    ordering = ['-date']

    def get_queryset(self):
        user = self.request.user
        qs = Attendance.objects.all().select_related('employee__user', 'employee__department')

        if user.role == 'employee':
            try:
                emp = Employee.objects.get(user=user)
                return qs.filter(employee=emp)
            except Employee.DoesNotExist:
                return qs.none()

        # Filter by month/year if provided
        month = self.request.query_params.get('month')
        year = self.request.query_params.get('year')
        if month and year:
            qs = qs.filter(date__month=month, date__year=year)

        return qs

    @action(detail=False, methods=['post'], url_path='check-in')
    def check_in(self, request):
        """Employee check-in action"""
        try:
            employee = Employee.objects.get(user=request.user)
        except Employee.DoesNotExist:
            return Response({'error': 'Employee profile not found'}, status=status.HTTP_404_NOT_FOUND)

        today = timezone.now().date()
        now_time = timezone.now().time()

        attendance, created = Attendance.objects.get_or_create(
            employee=employee,
            date=today,
            defaults={'check_in': now_time, 'status': 'present'}
        )

        if not created:
            if attendance.check_in:
                return Response({'error': 'Already checked in today'}, status=status.HTTP_400_BAD_REQUEST)
            attendance.check_in = now_time
            attendance.status = 'present'
            attendance.notes = request.data.get('notes', '')
            attendance.save()

        serializer = AttendanceSerializer(attendance)
        return Response({'message': 'Checked in successfully', 'attendance': serializer.data})

    @action(detail=False, methods=['post'], url_path='check-out')
    def check_out(self, request):
        """Employee check-out action"""
        try:
            employee = Employee.objects.get(user=request.user)
        except Employee.DoesNotExist:
            return Response({'error': 'Employee profile not found'}, status=status.HTTP_404_NOT_FOUND)

        today = timezone.now().date()
        now_time = timezone.now().time()

        try:
            attendance = Attendance.objects.get(employee=employee, date=today)
        except Attendance.DoesNotExist:
            return Response({'error': 'No check-in found for today'}, status=status.HTTP_404_NOT_FOUND)

        if attendance.check_out:
            return Response({'error': 'Already checked out today'}, status=status.HTTP_400_BAD_REQUEST)

        attendance.check_out = now_time
        if request.data.get('notes'):
            attendance.notes = request.data.get('notes')
        attendance.save()

        serializer = AttendanceSerializer(attendance)
        return Response({'message': 'Checked out successfully', 'attendance': serializer.data})

    @action(detail=False, methods=['get'], url_path='today')
    def today_attendance(self, request):
        """Get today's attendance summary"""
        today = timezone.now().date()
        attendance = Attendance.objects.filter(date=today).select_related('employee__user', 'employee__department')

        total_employees = Employee.objects.filter(status='active').count()
        present = attendance.filter(status='present').count()
        absent = total_employees - present
        late = attendance.filter(is_late=True).count()

        serializer = AttendanceSerializer(attendance, many=True, context={'request': request})
        return Response({
            'date': today,
            'total_employees': total_employees,
            'present': present,
            'absent': absent,
            'late': late,
            'records': serializer.data,
        })

    @action(detail=False, methods=['get'], url_path='monthly-summary')
    def monthly_summary(self, request):
        """Monthly attendance summary per employee"""
        month = int(request.query_params.get('month', timezone.now().month))
        year = int(request.query_params.get('year', timezone.now().year))
        employee_id = request.query_params.get('employee_id')

        # Calculate working days in month
        _, days_in_month = calendar.monthrange(year, month)
        working_days = sum(
            1 for d in range(1, days_in_month + 1)
            if date(year, month, d).weekday() < 5
        )

        employees = Employee.objects.filter(status='active')
        if employee_id:
            employees = employees.filter(employee_id=employee_id)

        summary = []
        for emp in employees:
            records = Attendance.objects.filter(
                employee=emp, date__month=month, date__year=year
            )
            present = records.filter(status='present').count()
            half_day = records.filter(status='half_day').count()
            on_leave = records.filter(status='on_leave').count()
            late = records.filter(is_late=True).count()
            total_hours = float(records.aggregate(Sum('work_hours'))['work_hours__sum'] or 0)

            summary.append({
                'employee_id': emp.employee_id,
                'employee_name': emp.user.get_full_name(),
                'department': emp.department.name if emp.department else '-',
                'month': month,
                'year': year,
                'total_working_days': working_days,
                'present_days': present,
                'absent_days': max(0, working_days - present - half_day - on_leave),
                'half_days': half_day,
                'leave_days': on_leave,
                'late_days': late,
                'total_work_hours': round(total_hours, 2),
                'attendance_percentage': round((present / working_days) * 100, 1) if working_days > 0 else 0,
            })

        return Response(summary)
