import axiosInstance from './axiosConfig';

const masterAdminApi = {
  // Register master admin
  registerMasterAdmin: (adminData) => axiosInstance.post('/master-admin/register', adminData),

  // Login master admin
  loginMasterAdmin: (loginData) => axiosInstance.post('/master-admin/login', loginData),

  // Get all villages
  getAllVillages: () => axiosInstance.get('/master-admin/villages'),

  // Update village status
  updateVillageStatus: (id, statusData) =>
    axiosInstance.put(`/master-admin/villages/update/${id}`, statusData),
};

export default masterAdminApi;
