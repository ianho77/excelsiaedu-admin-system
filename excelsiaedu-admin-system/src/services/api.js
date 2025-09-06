import config from '../config';

const API_BASE_URL = config.API_URL;

// 通用API請求函數
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  console.log(`API請求: ${url}`);
  console.log('請求選項:', options);
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, defaultOptions);
    
    console.log(`響應狀態: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP錯誤響應: ${errorText}`);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }
    
    const result = await response.json();
    console.log('API響應成功:', result);
    return result;
  } catch (error) {
    console.error(`API request failed for ${endpoint}:`, error);
    throw error;
  }
};

// API端點
export const api = {
  // 認證相關
  auth: {
    login: (credentials) => apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
    getUsers: () => apiRequest('/auth/users'),
    createUser: (userData) => apiRequest('/auth/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),
    updatePassword: (username, password) => apiRequest(`/auth/users/${username}/password`, {
      method: 'PUT',
      body: JSON.stringify({ password }),
    }),
    deleteUser: (username) => apiRequest(`/auth/users/${username}`, {
      method: 'DELETE',
    }),
  },

  // 學生相關
  students: {
    getAll: () => apiRequest('/students'),
    create: (studentData) => apiRequest('/students', {
      method: 'POST',
      body: JSON.stringify(studentData),
    }),
    update: (id, studentData) => apiRequest(`/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(studentData),
    }),
    delete: (id) => apiRequest(`/students/${id}`, {
      method: 'DELETE',
    }),
  },

  // 教師相關
  teachers: {
    getAll: () => apiRequest('/teachers'),
    create: (teacherData) => apiRequest('/teachers', {
      method: 'POST',
      body: JSON.stringify(teacherData),
    }),
    update: (id, teacherData) => apiRequest(`/teachers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(teacherData),
    }),
    delete: (id) => apiRequest(`/teachers/${id}`, {
      method: 'DELETE',
    }),
  },

  // 課程相關
  courses: {
    getAll: () => apiRequest('/courses'),
    create: (courseData) => apiRequest('/courses', {
      method: 'POST',
      body: JSON.stringify(courseData),
    }),
    update: (id, courseData) => apiRequest(`/courses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(courseData),
    }),
    delete: (id) => apiRequest(`/courses/${id}`, {
      method: 'DELETE',
    }),
  },

  // 課堂相關
  classes: {
    getAll: () => apiRequest('/classes'),
    create: (classData) => apiRequest('/classes', {
      method: 'POST',
      body: JSON.stringify(classData),
    }),
    update: (id, classData) => apiRequest(`/classes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(classData),
    }),
    delete: (id) => apiRequest(`/classes/${id}`, {
      method: 'DELETE',
    }),
  },

  // 學生賬單狀態
  studentBillingStatus: {
    getByMonth: (month) => apiRequest(`/student-billing-status?month=${month}`),
    create: (statusData) => apiRequest('/student-billing-status', {
      method: 'POST',
      body: JSON.stringify(statusData),
    }),
    update: (id, statusData) => apiRequest(`/student-billing-status/${id}`, {
      method: 'PUT',
      body: JSON.stringify(statusData),
    }),
  },

  // 教師賬單狀態
  teacherBillingStatus: {
    getByMonth: (month) => apiRequest(`/teacher-billing-status?month=${month}`),
    create: (statusData) => apiRequest('/teacher-billing-status', {
      method: 'POST',
      body: JSON.stringify(statusData),
    }),
    update: (id, statusData) => apiRequest(`/teacher-billing-status/${id}`, {
      method: 'PUT',
      body: JSON.stringify(statusData),
    }),
  },

  // 成本管理
  costs: {
    getAll: () => apiRequest('/costs'),
    getByMonth: (month) => apiRequest(`/costs?month=${month}`),
    create: (costData) => apiRequest('/costs', {
      method: 'POST',
      body: JSON.stringify(costData),
    }),
    update: (id, costData) => apiRequest(`/costs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(costData),
    }),
    delete: (id) => apiRequest(`/costs/${id}`, {
      method: 'DELETE',
    }),
  },

  // 利潤統計
  profit: {
    getStatistics: () => apiRequest('/profit/statistics'),
    getByMonth: (month) => apiRequest(`/profit/statistics?month=${month}`),
  },
};

export default api;
