"""Attendance serializers"""
from rest_framework import serializers
from .models import Attendance, AttendanceSettings
from employees.serializers import EmployeeListSerializer


class AttendanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.user.get_full_name', read_only=True)
    employee_id = serializers.CharField(source='employee.employee_id', read_only=True)
    department = serializers.CharField(source='employee.department.name', read_only=True)

    class Meta:
        model = Attendance
        fields = [
            'id', 'employee', 'employee_name', 'employee_id', 'department',
            'date', 'check_in', 'check_out', 'status',
            'is_late', 'late_minutes', 'work_hours', 'notes',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['is_late', 'late_minutes', 'work_hours']


class CheckInSerializer(serializers.Serializer):
    """Check-in action serializer"""
    notes = serializers.CharField(required=False, allow_blank=True)


class CheckOutSerializer(serializers.Serializer):
    """Check-out action serializer"""
    notes = serializers.CharField(required=False, allow_blank=True)


class AttendanceReportSerializer(serializers.Serializer):
    """Monthly attendance summary per employee"""
    employee_id = serializers.CharField()
    employee_name = serializers.CharField()
    department = serializers.CharField()
    month = serializers.IntegerField()
    year = serializers.IntegerField()
    total_working_days = serializers.IntegerField()
    present_days = serializers.IntegerField()
    absent_days = serializers.IntegerField()
    half_days = serializers.IntegerField()
    leave_days = serializers.IntegerField()
    late_days = serializers.IntegerField()
    total_work_hours = serializers.FloatField()
    attendance_percentage = serializers.FloatField()
