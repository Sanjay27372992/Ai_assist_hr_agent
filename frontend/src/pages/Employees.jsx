import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit, Trash2, Eye, Upload, Filter } from 'lucide-react';
import { employeeService, departmentService, designationService } from '../services';
import { Badge, Avatar, Modal, ConfirmDialog, PageLoader, Pagination, EmptyState, FormInput, FormSelect } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const EmployeeForm = ({ employee, departments, designations, onSave, onClose }) => {
  const isEdit = !!employee;
  const [form, setForm] = useState({
    first_name: employee?.user?.first_name || '',
    last_name: employee?.user?.last_name || '',
    email: employee?.user?.email || '',
    password: '',
    employee_id: employee?.employee_id || '',
    phone: employee?.phone || '',
    gender: employee?.gender || '',
    date_of_birth: employee?.date_of_birth || '',
    address: employee?.address || '',
    department: employee?.department || '',
    designation: employee?.designation || '',
    employment_type: employee?.employment_type || 'full_time',
    date_of_joining: employee?.date_of_joining || '',
    basic_salary: employee?.basic_salary || '',
    status: employee?.status || 'active',
  });
  const [saving, setSaving] = useState(false);

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isEdit) {
        await employeeService.update(employee.id, form);
        toast.success('Employee updated!');
      } else {
        await employeeService.create(form);
        toast.success('Employee created!');
      }
      onSave();
      onClose();
    } catch (e) {
      const errors = e.response?.data;
      if (errors) {
        const msg = Object.entries(errors).map(([k, v]) => `${k}: ${v}`).join(', ');
        toast.error(msg);
      } else toast.error('Failed to save employee');
    } finally { setSaving(false); }
  };

  return (
    <div>
      <div className="grid-2">
        <FormInput label="First Name *" value={form.first_name} onChange={e => update('first_name', e.target.value)} placeholder="John" />
        <FormInput label="Last Name *" value={form.last_name} onChange={e => update('last_name', e.target.value)} placeholder="Doe" />
      </div>
      {!isEdit && (
        <div className="grid-2">
          <FormInput label="Email *" type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="john@company.com" />
          <FormInput label="Password" type="password" value={form.password} onChange={e => update('password', e.target.value)} placeholder="Default: Hr@12345" />
        </div>
      )}
      <div className="grid-2">
        <FormInput label="Employee ID *" value={form.employee_id} onChange={e => update('employee_id', e.target.value)} placeholder="EMP001" />
        <FormInput label="Phone" value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="+1-555-0000" />
      </div>
      <div className="grid-2">
        <FormSelect label="Department" value={form.department} onChange={e => update('department', e.target.value)}>
          <option value="">Select Department</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </FormSelect>
        <FormSelect label="Designation" value={form.designation} onChange={e => update('designation', e.target.value)}>
          <option value="">Select Designation</option>
          {designations.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
        </FormSelect>
      </div>
      <div className="grid-2">
        <FormSelect label="Gender" value={form.gender} onChange={e => update('gender', e.target.value)}>
          <option value="">Select</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </FormSelect>
        <FormSelect label="Employment Type" value={form.employment_type} onChange={e => update('employment_type', e.target.value)}>
          <option value="full_time">Full Time</option>
          <option value="part_time">Part Time</option>
          <option value="contract">Contract</option>
          <option value="intern">Intern</option>
        </FormSelect>
      </div>
      <div className="grid-2">
        <FormInput label="Date of Joining *" type="date" value={form.date_of_joining} onChange={e => update('date_of_joining', e.target.value)} />
        <FormInput label="Basic Salary" type="number" value={form.basic_salary} onChange={e => update('basic_salary', e.target.value)} placeholder="50000" />
      </div>
      {isEdit && (
        <FormSelect label="Status" value={form.status} onChange={e => update('status', e.target.value)}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="terminated">Terminated</option>
          <option value="on_leave">On Leave</option>
        </FormSelect>
      )}
      <div className="flex gap-3 justify-end mt-4">
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : isEdit ? 'Update Employee' : 'Add Employee'}
        </button>
      </div>
    </div>
  );
};

const Employees = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ status: '', department: '' });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [modal, setModal] = useState({ open: false, type: '', data: null });

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, search, ...filters };
      const res = await employeeService.getAll(params);
      setEmployees(res.data.results || res.data);
      if (res.data.count) setTotalPages(Math.ceil(res.data.count / 10));
    } catch { toast.error('Failed to load employees'); }
    finally { setLoading(false); }
  }, [page, search, filters]);

  useEffect(() => {
    fetchEmployees();
    departmentService.getAll().then(r => setDepartments(r.data.results || r.data)).catch(() => {});
    designationService.getAll().then(r => setDesignations(r.data.results || r.data)).catch(() => {});
  }, [fetchEmployees]);

  const handleDelete = async (id) => {
    try {
      await employeeService.delete(id);
      toast.success('Employee deleted');
      fetchEmployees();
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Employees</h1>
          <p className="page-subtitle">{employees.length} total employees</p>
        </div>
        {user?.role === 'hr_admin' && (
          <button className="btn btn-primary" onClick={() => setModal({ open: true, type: 'add', data: null })}>
            <Plus size={16} /> Add Employee
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="search-box flex-1" style={{ minWidth: 240 }}>
            <Search size={16} style={{ color: '#64748b', flexShrink: 0 }} />
            <input placeholder="Search employees..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select className="form-input" style={{ width: 160 }} value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="terminated">Terminated</option>
          </select>
          <select className="form-input" style={{ width: 180 }} value={filters.department} onChange={e => setFilters(f => ({ ...f, department: e.target.value }))}>
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        {loading ? (
          <div className="flex items-center justify-center" style={{ padding: 60 }}>
            <div className="spinner" style={{ width: 32, height: 32 }} />
          </div>
        ) : employees.length === 0 ? (
          <EmptyState icon={Users => Users} title="No employees found" subtitle="Try adjusting your search or filters" />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Employee</th><th>ID</th><th>Department</th>
                <th>Designation</th><th>Type</th><th>Joining</th>
                <th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <Avatar name={emp.full_name} src={emp.profile_picture_url} />
                      <div>
                        <div className="font-medium text-slate-200">{emp.full_name}</div>
                        <div className="text-xs text-slate-500">{emp.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="font-mono text-indigo-400">{emp.employee_id}</td>
                  <td className="text-slate-400">{emp.department_name || '—'}</td>
                  <td className="text-slate-400">{emp.designation_title || '—'}</td>
                  <td><Badge status={emp.employment_type} /></td>
                  <td className="text-slate-400">{emp.date_of_joining}</td>
                  <td><Badge status={emp.status} /></td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn btn-secondary btn-sm" onClick={() => setModal({ open: true, type: 'edit', data: emp })} title="Edit">
                        <Edit size={14} />
                      </button>
                      {user?.role === 'hr_admin' && (
                        <button className="btn btn-danger btn-sm" onClick={() => setModal({ open: true, type: 'delete', data: emp })} title="Delete">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Add/Edit Modal */}
      <Modal
        open={modal.open && (modal.type === 'add' || modal.type === 'edit')}
        onClose={() => setModal({ open: false, type: '', data: null })}
        title={modal.type === 'edit' ? 'Edit Employee' : 'Add New Employee'}
        maxWidth={700}
      >
        <EmployeeForm
          employee={modal.data}
          departments={departments}
          designations={designations}
          onSave={fetchEmployees}
          onClose={() => setModal({ open: false, type: '', data: null })}
        />
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={modal.open && modal.type === 'delete'}
        onClose={() => setModal({ open: false, type: '', data: null })}
        onConfirm={() => handleDelete(modal.data?.id)}
        title="Delete Employee"
        message={`Are you sure you want to delete ${modal.data?.full_name}? This action cannot be undone.`}
      />
    </div>
  );
};

export default Employees;
