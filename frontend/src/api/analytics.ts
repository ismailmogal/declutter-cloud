import axios from 'axios';

export const getFileAnalytics = async () => {
  const token = localStorage.getItem('token');
  const res = await axios.get('/api/analytics/files', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}; 