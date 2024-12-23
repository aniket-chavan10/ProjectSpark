import axiosInstance from './axiosConfig';

const villageApi = {
  // Register a new village
  registerVillage: (villageData) => axiosInstance.post('/village/register', villageData),
};

export default villageApi;
