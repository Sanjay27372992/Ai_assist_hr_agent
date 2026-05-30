"""
Attendance Management Models:
- Attendance (daily check-in/out)
- Late entry tracking
"""
from django.db import models
from django.utils import timezone
from employees.models import Employee
import datetime


class Attendance(models.Model):
    """Daily attendance record"""

    STATUS_CHOICES = [
        ('present', 'Present'),
        ('absent', 'Absent'),
        ('half_day', 'Half Day'),
        ('on_leave', 'On Leave'),
        ('holiday', 'Holiday'),
        ('weekend', 'Weekend'),
    ]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='attendances')
    date = models.DateField(default=timezone.now)
    check_in = models.TimeField(null=True, blank=True)
    check_out = models.TimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='absent')
    is_late = models.BooleanField(default=False)
    late_minutes = models.IntegerField(default=0)
    work_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'attendance'
        unique_together = ['employee', 'date']
        ordering = ['-date']

    def __str__(self):
        return f"{self.employee} - {self.date} ({self.status})"

    def save(self, *args, **kwargs):
        # Auto-calculate work hours and late status
        if self.check_in and self.check_out:
            check_in_dt = datetime.datetime.combine(datetime.date.today(), self.check_in)
            check_out_dt = datetime.datetime.combine(datetime.date.today(), self.check_out)
            diff = check_out_dt - check_in_dt
            self.work_hours = round(diff.total_seconds() / 3600, 2)

            # Check if late (standard time 09:00)
            standard_time = datetime.time(9, 0)
            if self.check_in > standard_time:
                self.is_late = True
                late_dt = datetime.datetime.combine(datetime.date.today(), self.check_in)
                std_dt = datetime.datetime.combine(datetime.date.today(), standard_time)
                self.late_minutes = int((late_dt - std_dt).total_seconds() / 60)
            else:
                self.is_late = False
                self.late_minutes = 0

        super().save(*args, **kwargs)


class AttendanceSettings(models.Model):
    """Company-wide attendance settings"""
    standard_check_in = models.TimeField(default=datetime.time(9, 0))
    standard_check_out = models.TimeField(default=datetime.time(18, 0))
    work_hours_per_day = models.DecimalField(max_digits=4, decimal_places=1, default=8.0)
    late_threshold_minutes = models.IntegerField(default=15)

    class Meta:
        db_table = 'attendance_settings'

    def __str__(self):
        return "Attendance Settings"
