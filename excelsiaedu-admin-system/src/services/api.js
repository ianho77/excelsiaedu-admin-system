import config from '../config';

const API_BASE_URL = config.API_URL;

// 通用API請求函數
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, defaultOptions);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API request failed for ${endpoint}:`, error);
    throw error;
  }
};

// API端點
export const api = {
  // 認證相關
  auth: {
    login: (credentials) => apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
    getUsers: () => apiRequest('/api/auth/users'),
    createUser: (userData) => apiRequest('/api/auth/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),
    updatePassword: (username, password) => apiRequest(`/api/auth/users/${username}/password`, {
      method: 'PUT',
      body: JSON.stringify({ password }),
    }),
    deleteUser: (username) => apiRequest(`/api/auth/users/${username}`, {
      method: 'DELETE',
    }),
  },

  // 學生相關
  students: {
    getAll: () => apiRequest('/api/students'),
    create: (studentData) => apiRequest('/api/students', {
      method: 'POST',
      body: JSON.stringify(studentData),
    }),
    update: (id, studentData) => apiRequest(`/api/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(studentData),
    }),
    delete: (id) => apiRequest(`/api/students/${id}`, {
      method: 'DELETE',
    }),
  },

  // 教師相關
  teachers: {
    getAll: () => apiRequest('/api/teachers'),
    create: (teacherData) => apiRequest('/api/teachers', {
      method: 'POST',
      body: JSON.stringify(teacherData),
    }),
    update: (id, teacherData) => apiRequest(`/api/teachers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(teacherData),
    }),
    delete: (id) => apiRequest(`/api/teachers/${id}`, {
      method: 'DELETE',
    }),
  },

  // 課程相關
  courses: {
    getAll: () => apiRequest('/api/courses'),
    create: (courseData) => apiRequest('/api/courses', {
      method: 'POST',
      body: JSON.stringify(courseData),
    }),
    update: (id, courseData) => apiRequest(`/api/courses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(courseData),
    }),
    delete: (id) => apiRequest(`/api/courses/${id}`, {
      method: 'DELETE',
    }),
  },

  // 課堂相關
  classes: {
    getAll: () => apiRequest('/api/classes'),
    create: (classData) => apiRequest('/api/classes', {
      method: 'POST',
      body: JSON.stringify(classData),
    }),
    update: (id, classData) => apiRequest(`/api/classes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(classData),
    }),
    delete: (id) => apiRequest(`/api/classes/${id}`, {
      method: 'DELETE',
    }),
  },

  // 學生賬單狀態
  studentBillingStatus: {
    getByMonth: (month) => apiRequest(`/api/student-billing-status?month=${month}`),
    create: (statusData) => apiRequest('/api/student-billing-status', {
      method: 'POST',
      body: JSON.stringify(statusData),
    }),
    update: (id, statusData) => apiRequest(`/api/student-billing-status/${id}`, {
      method: 'PUT',
      body: JSON.stringify(statusData),
    }),
  },

  // 教師賬單狀態
  teacherBillingStatus: {
    getByMonth: (month) => apiRequest(`/api/teacher-billing-status?month=${month}`),
    create: (statusData) => apiRequest('/api/teacher-billing-status', {
      method: 'POST',
      body: JSON.stringify(statusData),
    }),
    update: (id, statusData) => apiRequest(`/api/teacher-billing-status/${id}`, {
      method: 'PUT',
      body: JSON.stringify(statusData),
    }),
  },
};

export default api;
