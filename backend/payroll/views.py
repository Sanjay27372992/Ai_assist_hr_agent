"""Payroll views with payslip generation"""
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db.models import Sum
from decimal import Decimal

from accounts.permissions import IsHRAdmin
from employees.models import Employee
from attendance.models import Attendance
from .models import SalaryStructure, Payroll, Bonus, Deduction
from .serializers import (
    SalaryStructureSerializer, PayrollSerializer,
    BonusSerializer, DeductionSerializer, GeneratePayrollSerializer
)


class SalaryStructureViewSet(viewsets.ModelViewSet):
    queryset = SalaryStructure.objects.all().select_related('employee__user')
    serializer_class = SalaryStructureSerializer
    permission_classes = [IsAuthenticated, IsHRAdmin]
    filter_backends = [filters.SearchFilter]
    search_fields = ['employee__user__first_name', 'employee__user__last_name', 'employee__employee_id']


class PayrollViewSet(viewsets.ModelViewSet):
    """Payroll management with bulk generation"""
    queryset = Payroll.objects.all().select_related('employee__user', 'employee__department', 'employee__designation')
    serializer_class = PayrollSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'month', 'year', 'employee']
    search_fields = ['employee__user__first_name', 'employee__employee_id']
    ordering = ['-year', '-month']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'generate']:
            return [IsAuthenticated(), IsHRAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'employee':
            try:
                emp = Employee.objects.get(user=user)
                return Payroll.objects.filter(employee=emp).order_by('-year', '-month')
            except Employee.DoesNotExist:
                return Payroll.objects.none()
        return self.queryset

    @action(detail=False, methods=['post'], url_path='generate')
    def generate(self, request):
        """Bulk generate payroll for a month"""
        serializer = GeneratePayrollSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        month = serializer.validated_data['month']
        year = serializer.validated_data['year']
        department_id = serializer.validated_data.get('department')

        employees = Employee.objects.filter(status='active')
        if department_id:
            employees = employees.filter(department_id=department_id)

        generated = []
        errors = []

        for emp in employees:
            if Payroll.objects.filter(employee=emp, month=month, year=year).exists():
                errors.append(f"Payroll already exists for {emp.user.get_full_name()}")
                continue

            # Get salary structure or use basic_salary from employee
            try:
                ss = SalaryStructure.objects.get(employee=emp)
                basic = ss.basic_salary
                hra = ss.house_rent_allowance
                ta = ss.transport_allowance
                ma = ss.medical_allowance
                oa = ss.other_allowances
                pf_pct = ss.provident_fund_percent
                tax_pct = ss.tax_percent
            except SalaryStructure.DoesNotExist:
                basic = emp.basic_salary
                hra = basic * Decimal('0.4')
                ta = Decimal('1500')
                ma = Decimal('1000')
                oa = Decimal('0')
                pf_pct = Decimal('12')
                tax_pct = Decimal('10')

            # Attendance-based calculation
            attendance_records = Attendance.objects.filter(
                employee=emp, date__month=month, date__year=year
            )
            present_days = attendance_records.filter(status='present').count()

            # Bonuses for this month
            bonus_total = Bonus.objects.filter(
                employee=emp,
                date__month=month, date__year=year
            ).aggregate(Sum('amount'))['amount__sum'] or Decimal('0')

            # Extra deductions
            extra_deductions = Deduction.objects.filter(
                employee=emp,
                date__month=month, date__year=year
            ).aggregate(Sum('amount'))['amount__sum'] or Decimal('0')

            gross = basic + hra + ta + ma + oa + bonus_total
            pf = (basic * pf_pct) / 100
            tax = (gross * tax_pct) / 100
            total_deductions = pf + tax + extra_deductions
            net = gross - total_deductions

            payroll = Payroll.objects.create(
                employee=emp,
                month=month,
                year=year,
                basic_salary=basic,
                house_rent_allowance=hra,
                transport_allowance=ta,
                medical_allowance=ma,
                other_allowances=oa,
                bonus=bonus_total,
                gross_salary=gross,
                provident_fund=pf,
                tax_deduction=tax,
                other_deductions=extra_deductions,
                total_deductions=total_deductions,
                net_salary=net,
                present_days=present_days,
                status='processed',
            )
            generated.append(payroll.id)

        return Response({
            'generated': len(generated),
            'errors': errors,
            'message': f'Generated {len(generated)} payrolls for {month}/{year}'
        })

    @action(detail=True, methods=['post'], url_path='mark-paid')
    def mark_paid(self, request, pk=None):
        """Mark a payroll as paid"""
        payroll = self.get_object()
        payroll.status = 'paid'
        payroll.payment_date = timezone.now().date()
        payroll.save()
        return Response({'message': 'Payroll marked as paid'})


class BonusViewSet(viewsets.ModelViewSet):
    queryset = Bonus.objects.all().select_related('employee__user')
    serializer_class = BonusSerializer
    permission_classes = [IsAuthenticated, IsHRAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['bonus_type', 'employee']
    search_fields = ['employee__user__first_name', 'employee__employee_id']


class DeductionViewSet(viewsets.ModelViewSet):
    queryset = Deduction.objects.all().select_related('employee__user')
    serializer_class = DeductionSerializer
    permission_classes = [IsAuthenticated, IsHRAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['deduction_type', 'employee']
    search_fields = ['employee__user__first_name', 'employee__employee_id']
