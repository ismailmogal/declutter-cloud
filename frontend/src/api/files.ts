import axios from 'axios';

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`
});

export const autoTagFile = async (fileId: number) => {
  const res = await axios.post('/api/files/auto-tag', { file_id: fileId }, { headers: authHeaders() });
  return res.data;
};

export const searchFilesByTags = async (tags: string) => {
  const res = await axios.get('/api/files/search', { params: { tags }, headers: authHeaders() });
  return res.data;
};

export const getCleanupRecommendations = async () => {
  const res = await axios.get('/api/files/cleanup-recommendations', { headers: authHeaders() });
  return res.data;
};

export const getTags = async () => {
  const res = await axios.get('/api/files/tags', { headers: authHeaders() });
  return res.data;
}; 