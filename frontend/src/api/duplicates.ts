import axios from 'axios';

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`
});

export const getDuplicateFiles = async () => {
  const res = await axios.get('/api/files/duplicates', { headers: authHeaders() });
  return res.data;
};

export const getSimilarFiles = async () => {
  const res = await axios.get('/api/files/similar', { headers: authHeaders() });
  return res.data;
}; 