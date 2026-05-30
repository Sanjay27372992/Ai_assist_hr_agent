"""
Payroll Management Models:
- SalaryStructure
- Payroll (monthly payslip)
- Bonus
- Deduction
"""
from django.db import models
from employees.models import Employee


class SalaryStructure(models.Model):
    """Salary components template for employees"""
    employee = models.OneToOneField(Employee, on_delete=models.CASCADE, related_name='salary_structure')
    basic_salary = models.DecimalField(max_digits=12, decimal_places=2)
    house_rent_allowance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    transport_allowance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    medical_allowance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    other_allowances = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    # Deductions
    provident_fund_percent = models.DecimalField(max_digits=5, decimal_places=2, default=12)
    tax_percent = models.DecimalField(max_digits=5, decimal_places=2, default=10)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'salary_structures'

    def __str__(self):
        return f"Salary Structure - {self.employee}"

    @property
    def gross_salary(self):
        return (
            self.basic_salary +
            self.house_rent_allowance +
            self.transport_allowance +
            self.medical_allowance +
            self.other_allowances
        )


class Payroll(models.Model):
    """Monthly payslip record"""

    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('processed', 'Processed'),
        ('paid', 'Paid'),
    ]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='payrolls')
    month = models.IntegerField()
    year = models.IntegerField()
    basic_salary = models.DecimalField(max_digits=12, decimal_places=2)
    house_rent_allowance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    transport_allowance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    medical_allowance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    other_allowances = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    bonus = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    gross_salary = models.DecimalField(max_digits=12, decimal_places=2)
    provident_fund = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_deduction = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    other_deductions = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_deductions = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    net_salary = models.DecimalField(max_digits=12, decimal_places=2)
    working_days = models.IntegerField(default=26)
    present_days = models.IntegerField(default=26)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    payment_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'payrolls'
        unique_together = ['employee', 'month', 'year']
        ordering = ['-year', '-month']

    def __str__(self):
        return f"Payroll - {self.employee} - {self.month}/{self.year}"


class Bonus(models.Model):
    """Employee bonuses"""

    BONUS_TYPES = [
        ('performance', 'Performance'),
        ('festival', 'Festival'),
        ('annual', 'Annual'),
        ('project', 'Project'),
        ('other', 'Other'),
    ]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='bonuses')
    bonus_type = models.CharField(max_length=20, choices=BONUS_TYPES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    reason = models.TextField(blank=True)
    date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'bonuses'

    def __str__(self):
        return f"{self.bonus_type} bonus - {self.employee} - {self.amount}"


class Deduction(models.Model):
    """Additional deductions"""

    DEDUCTION_TYPES = [
        ('advance', 'Salary Advance'),
        ('loan', 'Loan'),
        ('penalty', 'Penalty'),
        ('other', 'Other'),
    ]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='deductions')
    deduction_type = models.CharField(max_length=20, choices=DEDUCTION_TYPES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    reason = models.TextField(blank=True)
    date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'deductions'

    def __str__(self):
        return f"{self.deduction_type} deduction - {self.employee} - {self.amount}"
