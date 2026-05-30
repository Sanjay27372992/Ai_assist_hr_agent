import api from './api';


// Auth
export const authService = {
  login: (credentials) => api.post('/auth/login/', credentials),
  logout: (refresh) => api.post('/auth/logout/', { refresh }),
  getProfile: () => api.get('/auth/profile/'),
  updateProfile: (data) => api.patch('/auth/profile/', data),
  changePassword: (data) => api.post('/auth/change-password/', data),
  getDashboardStats: () => api.get('/auth/dashboard/stats/'),
};

// Employees
export const employeeService = {
  getAll: (params) => api.get('/employees/', { params }),
  getById: (id) => api.get(`/employees/${id}/`),
  create: (data) => api.post('/employees/', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, data) => api.patch(`/employees/${id}/`, data),
  delete: (id) => api.delete(`/employees/${id}/`),
  myProfile: () => api.get('/employees/my-profile/'),
  uploadPhoto: (id, file) => {
    const fd = new FormData(); fd.append('profile_picture', file);
    return api.post(`/employees/${id}/upload-photo/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

// Departments
export const departmentService = {
  getAll: (params) => api.get('/employees/departments/', { params }),
  create: (data) => api.post('/employees/departments/', data),
  update: (id, data) => api.patch(`/employees/departments/${id}/`, data),
  delete: (id) => api.delete(`/employees/departments/${id}/`),
};

// Designations
export const designationService = {
  getAll: (params) => api.get('/employees/designations/', { params }),
  create: (data) => api.post('/employees/designations/', data),
  update: (id, data) => api.patch(`/employees/designations/${id}/`, data),
  delete: (id) => api.delete(`/employees/designations/${id}/`),
};

// Attendance
export const attendanceService = {
  getAll: (params) => api.get('/attendance/', { params }),
  checkIn: (data) => api.post('/attendance/check-in/', data),
  checkOut: (data) => api.post('/attendance/check-out/', data),
  getToday: () => api.get('/attendance/today/'),
  getMonthlySummary: (params) => api.get('/attendance/monthly-summary/', { params }),
  create: (data) => api.post('/attendance/', data),
  update: (id, data) => api.patch(`/attendance/${id}/`, data),
};

// Payroll
export const payrollService = {
  getAll: (params) => api.get('/payroll/', { params }),
  getById: (id) => api.get(`/payroll/${id}/`),
  generate: (data) => api.post('/payroll/generate/', data),
  markPaid: (id) => api.post(`/payroll/${id}/mark-paid/`),
  getSalaryStructures: () => api.get('/payroll/salary-structures/'),
  createSalaryStructure: (data) => api.post('/payroll/salary-structures/', data),
  updateSalaryStructure: (id, data) => api.patch(`/payroll/salary-structures/${id}/`, data),
  getBonuses: (params) => api.get('/payroll/bonuses/', { params }),
  createBonus: (data) => api.post('/payroll/bonuses/', data),
  getDeductions: (params) => api.get('/payroll/deductions/', { params }),
  createDeduction: (data) => api.post('/payroll/deductions/', data),
};

// Leaves
export const leaveService = {
  getAll: (params) => api.get('/leaves/', { params }),
  apply: (data) => api.post('/leaves/', data),
  review: (id, data) => api.post(`/leaves/${id}/review/`, data),
  cancel: (id) => api.post(`/leaves/${id}/cancel/`),
  getTypes: () => api.get('/leaves/types/'),
  getBalances: (params) => api.get('/leaves/balances/', { params }),
  createBalance: (data) => api.post('/leaves/balances/', data),
};

// AI Chat
export const aiService = {
  chat: (message) => api.post('/auth/ai/chat/', { message }),
  getHistory: () => api.get('/auth/ai/chat/'),
};

