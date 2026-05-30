"""
AI Chat View — Dynamically queries the HRMS PostgreSQL database using Google Gemini's tool calling.
"""
import os
import json
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

SCHEMA = """
Table: users (id, first_name, last_name, email, role, is_active, last_login)
Table: departments (id, name, description, head_id)
Table: designations (id, title, department_id, level)
Table: employees (id, user_id, employee_id, phone, department_id, designation_id, status, employment_type, date_of_joining)
Table: attendance (id, employee_id, date, status, check_in, check_out, is_late)
Table: leave_types (id, name, is_paid)
Table: leave_balances (id, employee_id, leave_type_id, year, total_days, used_days, pending_days)
Table: leave_requests (id, employee_id, leave_type_id, start_date, end_date, total_days, status)
Table: salary_structures (id, employee_id, basic_salary, house_rent_allowance, transport_allowance)
Table: payrolls (id, employee_id, month, year, gross_salary, net_salary, status)
Table: bonuses (id, employee_id, bonus_type, amount, date)
Table: deductions (id, employee_id, deduction_type, amount, date)
"""

def execute_sql(query: str) -> str:
    """Executes a read-only SQL query on the HRMS PostgreSQL database and returns the result."""
    from django.db import connection
    if not query.strip().upper().startswith('SELECT'):
        return "Error: Only SELECT queries are allowed."
    try:
        with connection.cursor() as cursor:
            cursor.execute(query)
            columns = [col[0] for col in cursor.description]
            results = cursor.fetchall()
            return str([dict(zip(columns, row)) for row in results])[:5000]
    except Exception as e:
        return f"Error executing query: {str(e)}"

class AIChatView(APIView):
    """
    Natural language chat interface backed by dynamic LIVE database queries.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from accounts.models import AIChatMessage
        # Fetch the last 30 messages for this user to load history
        history = AIChatMessage.objects.filter(user=request.user).order_by('timestamp')[:30]
        data = [{
            'id': msg.id,
            'user_message': msg.user_message,
            'ai_response': msg.ai_response,
            'timestamp': msg.timestamp.isoformat()
        } for msg in history]
        return Response(data)

    def post(self, request):
        message = request.data.get('message', '').strip()
        if not message:
            return Response({'error': 'Message is required'}, status=400)

        api_key = os.environ.get('GEMINI_API_KEY') or \
                  __import__('django').conf.settings.__dict__.get('GEMINI_API_KEY', '')

        if not api_key:
            return Response({'answer': 'Please set your GEMINI_API_KEY in backend/.env'})

        try:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            
            user_name = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.email
            system_instruction = f"""You are the HRMS Pro AI Assistant, and also a helpful Personal Assistant.
User asking: {user_name} (Role: {request.user.role}).
Today's date: {timezone.now().strftime('%A, %d %B %Y')}

You have a dual role:
1. HR Assistant: For questions related to company data, employees, attendance, payroll, leaves, etc., you MUST use the 'execute_sql' tool to query the PostgreSQL database. Do NOT make up company data.
2. Personal Assistant: For general knowledge questions (e.g., "how many states in India", "write a python script", "what is the capital of France"), answer directly using your general knowledge like a normal AI assistant without querying the database.

Database Schema for HR Queries:
{SCHEMA}

Important Rules for Database Queries:
- Employees are linked to users via employees.user_id = users.id.
- To get an employee's name, join employees and users: SELECT users.first_name, users.last_name FROM employees JOIN users ON employees.user_id = users.id
- Status values in the database are lowercase (e.g., 'present', 'absent', 'active', 'pending', 'approved').
- Do not expose the SQL query syntax to the user.

Output a clear, friendly, and concise answer using Markdown.
"""
            # Robust multi-model cascade to circumvent rate-limits and quotas
            models_to_try = [
                'gemini-flash-latest',
                'gemini-2.5-flash-lite',
                'gemini-2.0-flash-lite',
                'gemini-2.5-flash',
                'gemini-2.0-flash',
            ]

            response = None
            last_err = None

            for model_name in models_to_try:
                try:
                    model = genai.GenerativeModel(
                        model_name=model_name,
                        tools=[execute_sql],
                        system_instruction=system_instruction
                    )
                    chat = model.start_chat(enable_automatic_function_calling=True)
                    response = chat.send_message(message)
                    # If successful, break the loop
                    break
                except Exception as e:
                    last_err = str(e)
                    # If it's a quota/rate limit, log and try next model
                    if '429' in last_err or 'quota' in last_err.lower():
                        continue
                    else:
                        # For syntax or other critical exceptions, raise immediately
                        raise e

            if response is None:
                raise Exception(f"All available models hit rate limits. Last error: {last_err}")

            
            # Store chat data into the database
            from accounts.models import AIChatMessage
            AIChatMessage.objects.create(
                user=request.user,
                user_message=message,
                ai_response=response.text
            )

            return Response({
                'answer': response.text,
            })
        except Exception as e:
            return Response({'error': str(e)}, status=500)
