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

// Global 401 handler
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      // Option 1: Redirect to login page
      window.location.href = '/';
      // Option 2: Show a login modal or notification (customize as needed)
      // alert('Session expired. Please log in again.');
      // Optionally clear token
      localStorage.removeItem('token');
    }
    return Promise.reject(error);
  }
);

export default apiClient; 