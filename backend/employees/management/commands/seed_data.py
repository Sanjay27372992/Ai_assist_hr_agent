"""
Seed initial data for HRMS demo
Usage: python manage.py seed_data
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import date, timedelta
import random

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed initial demo data for HRMS'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding data...')

        from employees.models import Department, Designation, Employee
        from leaves.models import LeaveType, LeaveBalance

        # Create HR Admin
        if not User.objects.filter(email='admin@hrms.com').exists():
            admin = User.objects.create_superuser(
                email='admin@hrms.com',
                password='Admin@123',
                first_name='HR',
                last_name='Admin',
                role='hr_admin'
            )
            self.stdout.write(self.style.SUCCESS('Created HR Admin: admin@hrms.com / Admin@123'))

        # Create Departments
        departments_data = [
            {'name': 'Engineering', 'description': 'Software development team'},
            {'name': 'Human Resources', 'description': 'HR and people management'},
            {'name': 'Finance', 'description': 'Financial management'},
            {'name': 'Marketing', 'description': 'Marketing and branding'},
            {'name': 'Sales', 'description': 'Sales and business development'},
        ]
        departments = {}
        for d in departments_data:
            dept, _ = Department.objects.get_or_create(name=d['name'], defaults=d)
            departments[d['name']] = dept

        # Create Designations
        designations_data = [
            {'title': 'Software Engineer', 'department': departments['Engineering'], 'level': 2},
            {'title': 'Senior Software Engineer', 'department': departments['Engineering'], 'level': 3},
            {'title': 'Tech Lead', 'department': departments['Engineering'], 'level': 4},
            {'title': 'HR Manager', 'department': departments['Human Resources'], 'level': 4},
            {'title': 'HR Executive', 'department': departments['Human Resources'], 'level': 2},
            {'title': 'Finance Manager', 'department': departments['Finance'], 'level': 4},
            {'title': 'Accountant', 'department': departments['Finance'], 'level': 2},
            {'title': 'Marketing Manager', 'department': departments['Marketing'], 'level': 4},
            {'title': 'Sales Executive', 'department': departments['Sales'], 'level': 2},
        ]
        designations = {}
        for d in designations_data:
            des, _ = Designation.objects.get_or_create(
                title=d['title'], department=d['department'],
                defaults={'level': d['level']}
            )
            designations[d['title']] = des

        # Create Leave Types
        leave_types_data = [
            {'name': 'Annual Leave', 'max_days_per_year': 15, 'is_paid': True, 'carry_forward': True},
            {'name': 'Sick Leave', 'max_days_per_year': 12, 'is_paid': True},
            {'name': 'Casual Leave', 'max_days_per_year': 7, 'is_paid': True},
            {'name': 'Unpaid Leave', 'max_days_per_year': 30, 'is_paid': False},
            {'name': 'Maternity Leave', 'max_days_per_year': 90, 'is_paid': True},
        ]
        leave_types = {}
        for lt in leave_types_data:
            ltype, _ = LeaveType.objects.get_or_create(name=lt['name'], defaults=lt)
            leave_types[lt['name']] = ltype

        # Create Sample Employees
        employees_data = [
            {'first_name': 'John', 'last_name': 'Smith', 'email': 'john.smith@hrms.com',
             'dept': 'Engineering', 'designation': 'Senior Software Engineer', 'salary': 85000},
            {'first_name': 'Jane', 'last_name': 'Doe', 'email': 'jane.doe@hrms.com',
             'dept': 'Human Resources', 'designation': 'HR Manager', 'salary': 70000, 'role': 'manager'},
            {'first_name': 'Robert', 'last_name': 'Johnson', 'email': 'robert.j@hrms.com',
             'dept': 'Finance', 'designation': 'Finance Manager', 'salary': 90000, 'role': 'manager'},
            {'first_name': 'Emily', 'last_name': 'Williams', 'email': 'emily.w@hrms.com',
             'dept': 'Engineering', 'designation': 'Software Engineer', 'salary': 65000},
            {'first_name': 'Michael', 'last_name': 'Brown', 'email': 'michael.b@hrms.com',
             'dept': 'Marketing', 'designation': 'Marketing Manager', 'salary': 75000, 'role': 'manager'},
            {'first_name': 'Sarah', 'last_name': 'Davis', 'email': 'sarah.d@hrms.com',
             'dept': 'Sales', 'designation': 'Sales Executive', 'salary': 55000},
            {'first_name': 'David', 'last_name': 'Miller', 'email': 'david.m@hrms.com',
             'dept': 'Engineering', 'designation': 'Tech Lead', 'salary': 100000, 'role': 'manager'},
            {'first_name': 'Lisa', 'last_name': 'Wilson', 'email': 'lisa.w@hrms.com',
             'dept': 'Finance', 'designation': 'Accountant', 'salary': 60000},
        ]

        emp_ids = ['EMP001', 'EMP002', 'EMP003', 'EMP004', 'EMP005', 'EMP006', 'EMP007', 'EMP008']

        for i, emp_data in enumerate(employees_data):
            if not User.objects.filter(email=emp_data['email']).exists():
                role = emp_data.get('role', 'employee')
                user = User.objects.create_user(
                    email=emp_data['email'],
                    password='Employee@123',
                    first_name=emp_data['first_name'],
                    last_name=emp_data['last_name'],
                    role=role
                )
                employee = Employee.objects.create(
                    user=user,
                    employee_id=emp_ids[i],
                    department=departments[emp_data['dept']],
                    designation=designations[emp_data['designation']],
                    date_of_joining=date(2023, random.randint(1, 12), random.randint(1, 28)),
                    basic_salary=emp_data['salary'],
                    employment_type='full_time',
                    status='active',
                    phone=f'+1-555-{random.randint(1000, 9999)}',
                    gender=random.choice(['male', 'female']),
                )

                # Create leave balances
                year = date.today().year
                for lt in leave_types.values():
                    LeaveBalance.objects.get_or_create(
                        employee=employee,
                        leave_type=lt,
                        year=year,
                        defaults={'total_days': lt.max_days_per_year, 'used_days': 0, 'pending_days': 0}
                    )

                self.stdout.write(f'  Created employee: {user.get_full_name()} ({emp_ids[i]})')

        self.stdout.write(self.style.SUCCESS('\nSeed data created successfully!'))
        self.stdout.write('\nLogin credentials:')
        self.stdout.write('  HR Admin: admin@hrms.com / Admin@123')
        self.stdout.write('  Employee: john.smith@hrms.com / Employee@123')
