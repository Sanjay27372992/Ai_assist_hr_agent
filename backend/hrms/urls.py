"""HRMS URL Configuration"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.core.management import call_command
from django.http import JsonResponse

def setup_database(request):
    try:
        call_command('migrate', interactive=False)
        call_command('seed_data')
        return JsonResponse({
            'status': 'success',
            'message': 'Database migrated and seeded successfully! Demo users created.'
        })
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': f'Error during database setup: {str(e)}'
        }, status=500)

urlpatterns = [
    path('admin/', admin.site.urls),

    # Temporary database setup/seed helper for Render free tier
    path('api/setup-database/', setup_database, name='setup_database'),

    # API Routes
    path('api/auth/', include('accounts.urls')),
    path('api/employees/', include('employees.urls')),
    path('api/attendance/', include('attendance.urls')),
    path('api/payroll/', include('payroll.urls')),
    path('api/leaves/', include('leaves.urls')),
    path("api/jarvis/", include("jarvish.urls")),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

