import { apiClient } from '@/api/axios';
import { ENDPOINTS } from '@/config/endpoints';

export const AuthService = {
  login: async (data: any) => {
    const response = await apiClient.post(ENDPOINTS.AUTH.LOGIN, data);
    return response.data;
  },
  
  register: async (data: any) => {
    const response = await apiClient.post(ENDPOINTS.AUTH.REGISTER, data);
    return response.data;
  },
};
