import apiClient from './api';

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

export const changePassword = async (payload: ChangePasswordPayload) => {
  const response = await apiClient.post('/user/change-password', payload);
  return response.data;
}; 