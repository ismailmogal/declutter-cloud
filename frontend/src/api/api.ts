import axios from 'axios';

const API_URL = import.meta.env.PROD
  ? 'https://declutter-cloud.onrender.com'
  : 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient; 