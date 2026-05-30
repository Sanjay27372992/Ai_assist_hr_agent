from datetime import date
from django.db.models import Q

def get_db_context(question: str) -> str:
    context = []
    q = question.lower()

    try:
        from employees.models import Employee
        from attendance.models import Attendance
        from leaves.models import LeaveRequest

        # 1. ALWAYS LOAD GENERAL EMPLOYEE INFO
        total_emps = Employee.objects.count()
        active_emps = Employee.objects.filter(status='active').count()
        context.append(f"[COMPANY OVERVIEW] Total Employees: {total_emps}, Active: {active_emps}.")
        
        # Load a summary of all employees so the AI knows who everyone is and their roles
        all_emps = Employee.objects.all().select_related('user', 'department', 'designation')[:50] # Limit to 50 for token safety
        emp_list = []
        for emp in all_emps:
            dept = emp.department.name if emp.department else "No Dept"
            desig = emp.designation.title if emp.designation else "No Title"
            emp_list.append(f"{emp.full_name} ({desig} in {dept}, Status: {emp.status})")
        
        context.append(f"[ALL EMPLOYEES DIRECTORY]\n" + "\n".join(emp_list))

        # 2. ALWAYS LOAD TODAY'S ATTENDANCE SUMMARY
        today = date.today()
        att = Attendance.objects.filter(date=today)
        present = att.filter(status='present').count()
        absent = att.filter(status='absent').count()
        late = att.filter(is_late=True).count()
        context.append(f"[TODAY'S ATTENDANCE ({today})] {present} Present, {absent} Absent, {late} Late.")

        # 3. ALWAYS LOAD PENDING LEAVES
        pending_leaves = LeaveRequest.objects.filter(status="pending").select_related('employee__user', 'leave_type')
        if pending_leaves.exists():
            leave_list = []
            for l in pending_leaves:
                leave_list.append(f"{l.employee.full_name}: {l.leave_type.name} from {l.start_date} to {l.end_date}")
            context.append(f"[PENDING LEAVE REQUESTS]\n" + "\n".join(leave_list))
        else:
            context.append("[PENDING LEAVE REQUESTS] None.")

        # 4. IF SPECIFIC NAMES ARE DETECTED, GET DETAILED HISTORY
        words = q.split()
        potential_names = [w for w in words if len(w) > 2]
        
        target_employees = Employee.objects.none()
        if potential_names:
            query = Q()
            for name in potential_names:
                query |= Q(user__first_name__icontains=name) | Q(user__last_name__icontains=name)
            target_employees = Employee.objects.filter(query).distinct()[:5]

        if target_employees.exists():
            for emp in target_employees:
                # Add their specific latest attendance
                emp_att = Attendance.objects.filter(employee=emp).order_by('-date').first()
                if emp_att:
                    context.append(f"[SPECIFIC DATA FOR {emp.full_name}] Last attendance record on {emp_att.date} - Status: {emp_att.status}, Check-in: {emp_att.check_in}")
                
                # Add their specific leave history
                emp_leaves = LeaveRequest.objects.filter(employee=emp).order_by('-applied_at')[:2]
                for l in emp_leaves:
                    context.append(f"[SPECIFIC DATA FOR {emp.full_name}] Past leave: {l.leave_type.name} from {l.start_date} to {l.end_date} (Status: {l.status})")

    except Exception as e:
        context.append(f"DB Error: {str(e)}")

    return "\n\n".join(context)