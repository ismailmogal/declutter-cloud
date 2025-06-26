import axios from 'axios';

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`
});

export const getFolderSuggestions = async (fileId: number) => {
  const res = await axios.post('/api/ai/folder-suggestions', { file_id: fileId }, { headers: authHeaders() });
  return res.data;
};

export const acceptFolderSuggestion = async (fileId: number, folderId: string) => {
  const res = await axios.post('/api/ai/accept-suggestion', { file_id: fileId, folder_id: folderId }, { headers: authHeaders() });
  return res.data;
};

export const ignoreFolderSuggestion = async (fileId: number, folderId: string) => {
  const res = await axios.post('/api/ai/ignore-suggestion', { file_id: fileId, folder_id: folderId }, { headers: authHeaders() });
  return res.data;
}; 