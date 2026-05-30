"""
Leave Management Models:
- LeaveType
- LeaveBalance
- LeaveRequest
"""
from django.db import models
from employees.models import Employee
from django.conf import settings


class LeaveType(models.Model):
    """Types of leave (Annual, Sick, Casual, etc.)"""
    name = models.CharField(max_length=100, unique=True)
    max_days_per_year = models.IntegerField(default=12)
    description = models.TextField(blank=True)
    is_paid = models.BooleanField(default=True)
    carry_forward = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'leave_types'

    def __str__(self):
        return self.name


class LeaveBalance(models.Model):
    """Annual leave balance per employee per type"""
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='leave_balances')
    leave_type = models.ForeignKey(LeaveType, on_delete=models.CASCADE)
    year = models.IntegerField()
    total_days = models.IntegerField(default=0)
    used_days = models.IntegerField(default=0)
    pending_days = models.IntegerField(default=0)

    class Meta:
        db_table = 'leave_balances'
        unique_together = ['employee', 'leave_type', 'year']

    @property
    def remaining_days(self):
        return self.total_days - self.used_days - self.pending_days

    def __str__(self):
        return f"{self.employee} - {self.leave_type} ({self.year})"


class LeaveRequest(models.Model):
    """Leave application from employees"""

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
    ]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='leave_requests')
    leave_type = models.ForeignKey(LeaveType, on_delete=models.CASCADE)
    start_date = models.DateField()
    end_date = models.DateField()
    total_days = models.IntegerField(default=0)
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='reviewed_leaves'
    )
    review_comment = models.TextField(blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    applied_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'leave_requests'
        ordering = ['-applied_at']

    def __str__(self):
        return f"{self.employee} - {self.leave_type} ({self.status})"

    def save(self, *args, **kwargs):
        # Auto-calculate total days (excluding weekends)
        if self.start_date and self.end_date:
            from datetime import timedelta
            current = self.start_date
            count = 0
            while current <= self.end_date:
                if current.weekday() < 5:  # Mon-Fri
                    count += 1
                current += timedelta(days=1)
            self.total_days = count
        super().save(*args, **kwargs)
