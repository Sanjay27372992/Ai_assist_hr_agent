"""
Serializers for Employee Management Module
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Department, Designation, Employee

User = get_user_model()


class DepartmentSerializer(serializers.ModelSerializer):
    employee_count = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = ['id', 'name', 'description', 'head', 'employee_count', 'created_at']

    def get_employee_count(self, obj):
        return obj.employees.filter(status='active').count()


class DesignationSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)

    class Meta:
        model = Designation
        fields = ['id', 'title', 'department', 'department_name', 'level', 'description', 'created_at']


class EmployeeUserSerializer(serializers.ModelSerializer):
    """Nested user info for employee"""
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'role']


class EmployeeListSerializer(serializers.ModelSerializer):
    """Compact serializer for list views"""
    full_name = serializers.CharField(source='user.get_full_name', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    designation_title = serializers.CharField(source='designation.title', read_only=True)
    profile_picture_url = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = [
            'id', 'employee_id', 'full_name', 'email',
            'department_name', 'designation_title',
            'employment_type', 'status', 'date_of_joining',
            'profile_picture_url', 'phone',
        ]

    def get_profile_picture_url(self, obj):
        request = self.context.get('request')
        if obj.profile_picture and request:
            return request.build_absolute_uri(obj.profile_picture.url)
        return None


class EmployeeDetailSerializer(serializers.ModelSerializer):
    """Full detail serializer for employee profile"""
    user = EmployeeUserSerializer(read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    designation_title = serializers.CharField(source='designation.title', read_only=True)
    manager_name = serializers.CharField(source='manager.user.get_full_name', read_only=True)
    profile_picture_url = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = '__all__'

    def get_profile_picture_url(self, obj):
        request = self.context.get('request')
        if obj.profile_picture and request:
            return request.build_absolute_uri(obj.profile_picture.url)
        return None


class EmployeeCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new employees (with user creation)"""
    email = serializers.EmailField(write_only=True)
    first_name = serializers.CharField(write_only=True)
    last_name = serializers.CharField(write_only=True)
    password = serializers.CharField(write_only=True, default='Hr@12345')

    class Meta:
        model = Employee
        fields = [
            'email', 'first_name', 'last_name', 'password',
            'employee_id', 'phone', 'date_of_birth', 'gender',
            'address', 'department', 'designation', 'manager',
            'employment_type', 'date_of_joining', 'basic_salary',
            'emergency_contact', 'emergency_phone',
        ]

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('User with this email already exists')
        return value

    def create(self, validated_data):
        # Extract user fields
        email = validated_data.pop('email')
        first_name = validated_data.pop('first_name')
        last_name = validated_data.pop('last_name')
        password = validated_data.pop('password', 'Hr@12345')

        # Create user
        user = User.objects.create_user(
            email=email,
            first_name=first_name,
            last_name=last_name,
            password=password,
            role='employee'
        )

        # Create employee profile
        employee = Employee.objects.create(user=user, **validated_data)
        return employee
