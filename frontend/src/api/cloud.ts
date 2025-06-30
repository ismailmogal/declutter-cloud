import axios from 'axios';
import apiClient from './api';

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`
});

export const moveFileToCloud = async (fileId: number, targetCloud: string) => {
  const res = await axios.post('/api/cloud/move', { file_id: fileId, target_cloud: targetCloud }, { headers: authHeaders() });
  return res.data;
};

export const copyFileToCloud = async (fileId: number, targetCloud: string) => {
  const res = await axios.post('/api/cloud/copy', { file_id: fileId, target_cloud: targetCloud }, { headers: authHeaders() });
  return res.data;
};

export const getCloudConnections = async () => {
  const response = await apiClient.get('/api/cloud/connections');
  return response.data;
};

export const disconnectCloudConnection = async (connectionId: number) => {
  const response = await apiClient.post('/api/cloud/disconnect', { connection_id: connectionId });
  return response.data;
};

export const initiateCloudConnection = async (provider: string) => {
    const response = await apiClient.get(`/auth/${provider}/login`, {
        // We expect a redirect, so handle non-200 status codes without throwing an error
        validateStatus: (status) => status < 500
    });

    if (response.status === 200 && response.data.auth_url) {
        window.location.href = response.data.auth_url;
    } else if (response.headers.location) {
        window.location.href = response.headers.location;
    } else {
        throw new Error('Failed to initiate connection: No authorization URL found.');
    }
    // This function will not return anything as it redirects the page
}; 