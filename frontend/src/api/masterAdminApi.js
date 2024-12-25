import axiosInstance from './axiosConfig';

const masterAdminApi = {
  // Login master admin
  loginMasterAdmin: (loginData) => axiosInstance.post('/master-admin/login', loginData),

  // Get all villages
  getAllVillages: () => axiosInstance.get('/master-admin/villages'),

  // Update village status
  updateVillageStatus: (id, statusData) => axiosInstance.put(`/master-admin/villages/update/${id}`, statusData),
};

export default masterAdminApi;
