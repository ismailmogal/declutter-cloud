import axios from 'axios';

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`
});

export const getDuplicateImages = async () => {
  const res = await axios.get('/api/images/duplicates', { headers: authHeaders() });
  return res.data;
};

export const getImageDownloadUrls = async (fileIds: number[]) => {
  const res = await axios.post('/api/images/download-urls', fileIds, { headers: authHeaders() });
  return res.data;
}; 