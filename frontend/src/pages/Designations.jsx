import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { designationService, departmentService } from '../services';
import { Modal, ConfirmDialog, FormInput, FormSelect, Badge } from '../components/UI';
import toast from 'react-hot-toast';

const Designations = () => {
  const [designations, setDesignations] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, type: '', data: null });

  const fetch = async () => {
    setLoading(true);
    try {
      const [dRes, depRes] = await Promise.all([
        designationService.getAll(),
        departmentService.getAll(),
      ]);
      setDesignations(dRes.data.results || dRes.data);
      setDepartments(depRes.data.results || depRes.data);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const handleSave = async (form) => {
    try {
      if (form.id) { await designationService.update(form.id, form); toast.success('Updated!'); }
      else { await designationService.create(form); toast.success('Created!'); }
      setModal({ open: false, type: '', data: null });
      fetch();
    } catch { toast.error('Failed to save'); }
  };

  const handleDelete = async (id) => {
    try { await designationService.delete(id); toast.success('Deleted!'); fetch(); }
    catch { toast.error('Failed to delete'); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Designations</h1>
          <p className="page-subtitle">{designations.length} job titles</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({ open: true, type: 'form', data: null })}>
          <Plus size={16} /> Add Designation
        </button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr><th>Title</th><th>Department</th><th>Level</th><th>Description</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {designations.map(d => (
              <tr key={d.id}>
                <td className="font-medium text-slate-200">{d.title}</td>
                <td><Badge status="info" label={d.department_name} /></td>
                <td><span className="text-indigo-400 font-bold">L{d.level}</span></td>
                <td className="text-slate-400 text-sm">{d.description || '—'}</td>
                <td>
                  <div className="flex gap-2">
                    <button className="btn btn-secondary btn-sm" onClick={() => setModal({ open: true, type: 'form', data: d })}><Edit size={14} /></button>
                    <button className="btn btn-danger btn-sm" onClick={() => setModal({ open: true, type: 'delete', data: d })}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modal.open && modal.type === 'form'} onClose={() => setModal({ open: false, type: '', data: null })} title={modal.data ? 'Edit Designation' : 'Add Designation'}>
        <DesigForm des={modal.data} departments={departments} onSave={handleSave} onClose={() => setModal({ open: false, type: '', data: null })} />
      </Modal>
      <ConfirmDialog open={modal.open && modal.type === 'delete'} onClose={() => setModal({ open: false, type: '', data: null })} onConfirm={() => handleDelete(modal.data?.id)} title="Delete Designation" message={`Delete "${modal.data?.title}"?`} />
    </div>
  );
};

const DesigForm = ({ des, departments, onSave, onClose }) => {
  const [form, setForm] = useState({ id: des?.id, title: des?.title || '', department: des?.department || '', level: des?.level || 1, description: des?.description || '' });
  return (
    <div>
      <FormInput label="Title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Software Engineer" />
      <FormSelect label="Department *" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
        <option value="">Select Department</option>
        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
      </FormSelect>
      <FormInput label="Level (1-5)" type="number" min={1} max={5} value={form.level} onChange={e => setForm(f => ({ ...f, level: +e.target.value }))} />
      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea className="form-input" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      </div>
      <div className="flex gap-3 justify-end">
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={() => onSave(form)}>Save</button>
      </div>
    </div>
  );
};

export default Designations;
