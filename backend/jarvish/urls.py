from django.urls import path
from .views import jarvish_ask

urlpatterns = [
    path('ask/', jarvish_ask),
]