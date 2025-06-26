import axios from 'axios';

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