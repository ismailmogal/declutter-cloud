import axios from 'axios';

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`
});

export const getDuplicateImages = async () => {
  const res = await axios.get('/api/images/duplicates', { headers: authHeaders() });
  return res.data;
}; 