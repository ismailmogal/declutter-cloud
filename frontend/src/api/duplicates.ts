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

export const getCrossCloudDuplicates = async () => {
  const res = await axios.get('/api/duplicates/cross-cloud', { headers: authHeaders() });
  return res.data;
};

export const mergeDuplicateGroup = async (duplicateGroup: any, strategy: string = 'keep_largest', targetCloud?: string) => {
  const res = await axios.post('/api/duplicates/merge', {
    duplicate_group: duplicateGroup,
    strategy,
    target_cloud: targetCloud,
  }, { headers: authHeaders() });
  return res.data;
};

export const batchMergeDuplicates = async (duplicateGroups: any[]) => {
  const res = await axios.post('/api/duplicates/batch-merge', {
    duplicate_groups: duplicateGroups,
  }, { headers: authHeaders() });
  return res.data;
}; 