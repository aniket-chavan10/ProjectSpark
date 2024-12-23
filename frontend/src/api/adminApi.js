import axiosInstance from './axiosConfig';

const adminApi = {
  // Login admin
  loginAdmin: (loginData) => axiosInstance.post('/admin/login', loginData),

  // Get protected admin dashboard
  getAdminDashboard: () => axiosInstance.get('/admin/dashboard'),
};

export default adminApi;
