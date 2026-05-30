"""Payroll serializers"""
from rest_framework import serializers
from .models import SalaryStructure, Payroll, Bonus, Deduction


class SalaryStructureSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.user.get_full_name', read_only=True)
    gross_salary = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = SalaryStructure
        fields = '__all__'


class PayrollSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.user.get_full_name', read_only=True)
    employee_id = serializers.CharField(source='employee.employee_id', read_only=True)
    department = serializers.CharField(source='employee.department.name', read_only=True)
    designation = serializers.CharField(source='employee.designation.title', read_only=True)

    class Meta:
        model = Payroll
        fields = '__all__'


class BonusSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.user.get_full_name', read_only=True)

    class Meta:
        model = Bonus
        fields = '__all__'


class DeductionSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.user.get_full_name', read_only=True)

    class Meta:
        model = Deduction
        fields = '__all__'


class GeneratePayrollSerializer(serializers.Serializer):
    """Serializer for bulk payroll generation"""
    month = serializers.IntegerField(min_value=1, max_value=12)
    year = serializers.IntegerField(min_value=2020)
    department = serializers.IntegerField(required=False)
