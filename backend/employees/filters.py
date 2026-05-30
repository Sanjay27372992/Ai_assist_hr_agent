"""Django-filter FilterSets for employees"""
import django_filters
from .models import Employee


class EmployeeFilter(django_filters.FilterSet):
    status = django_filters.ChoiceFilter(choices=Employee.STATUS_CHOICES)
    department = django_filters.NumberFilter(field_name='department__id')
    designation = django_filters.NumberFilter(field_name='designation__id')
    employment_type = django_filters.ChoiceFilter(choices=Employee.EMPLOYMENT_TYPE_CHOICES)
    joining_from = django_filters.DateFilter(field_name='date_of_joining', lookup_expr='gte')
    joining_to = django_filters.DateFilter(field_name='date_of_joining', lookup_expr='lte')

    class Meta:
        model = Employee
        fields = ['status', 'department', 'designation', 'employment_type', 'gender']
