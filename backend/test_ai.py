import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hrms.settings')
django.setup()
import google.generativeai as genai

SCHEMA = """
Table: users (id, first_name, last_name, email, role, is_active, last_login)
Table: departments (id, name, description, head_id)
Table: designations (id, title, department_id, level)
Table: employees (id, user_id, employee_id, phone, department_id, designation_id, status, employment_type, date_of_joining)
Table: attendance (id, employee_id, date, status, check_in, check_out, is_late)
Table: leave_types (id, name, is_paid)
Table: leave_requests (id, employee_id, leave_type_id, start_date, end_date, total_days, status)
Table: payrolls (id, employee_id, month, year, gross_salary, net_salary, status)
"""

def execute_sql(query: str) -> str:
    """Executes a read-only SQL query on the HRMS PostgreSQL database and returns the result as a string."""
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

from decouple import config
genai.configure(api_key=config('env.GEMINI_API_KEY'))
model = genai.GenerativeModel(
    model_name='gemini-2.5-flash',
    tools=[execute_sql],
    system_instruction=f"Schema:\n{SCHEMA}\nUse execute_sql tool to get data. Always use the execute_sql tool. Don't answer without using it."
)
chat = model.start_chat(enable_automatic_function_calling=True)
response = chat.send_message("What is John Smith's phone number?")
print("AI:", response.text)
