import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box, Button, Typography, Switch, FormControlLabel, List, ListItem, ListItemText,
  IconButton, Paper, CircularProgress, Alert, Checkbox, Chip, MenuItem, Select, Tooltip, ListItemIcon
} from '@mui/material';
import { Delete, Folder } from '@mui/icons-material';
import { getCachedFiles, cacheFiles, clearFilesCache } from '../utils/idbCache';
import apiClient from '../api/api';

interface File {
  id: number; // local DB id
  cloud_id: string; // OneDrive file id
  name: string;
  path: string;
  size: number;
  last_modified?: string;
  file?: {
    hashes?: {
      quickXorHash?: string;
    }
  };
}

// Utility type for progress callback
type ProgressCallback = (current: number, total: number) => void;

const Compare: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [folders, setFolders] = useState<{ id: string, name: string }[]>([]);
  const [duplicates, setDuplicates] = useState<File[][]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedToDelete, setSelectedToDelete] = useState<Record<string, boolean>>({});
  const [deleteStatus, setDeleteStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [groupMethod, setGroupMethod] = useState<'name+size+path' | 'size' | 'quickXorHash'>('name+size+path');

  useEffect(() => {
    const folderIds = searchParams.get('folders')?.split(',') || [];
    if (folderIds.length > 0) {
      const folderDetails = folderIds.map(id => ({ id, name: `Folder ${id.substring(0, 8)}...` }));
      setFolders(folderDetails);
    }
  }, [searchParams]);

  const handleRemoveFolder = (folderId: string) => {
    setFolders(prev => prev.filter(f => f.id !== folderId));
  };
  
  const handleScan = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDuplicates([]);
    setSelectedToDelete({});
    setDeleteStatus(null);
    
    try {
      let allFiles: File[] = [];
      for (const folder of folders) {
          let files = await getCachedFiles(folder.id);
          if (!files || files.length === 0) {
            const response = await apiClient.get(`/api/onedrive/files?folder_id=${folder.id}&recursive=true`);
            if (response.status !== 200) throw new Error(`Failed to fetch files for folder ${folder.name}`);
            files = response.data.files || [];
            await cacheFiles(folder.id, files);
          }
          files = (files || []).filter((item: any) => !item.type || item.type === 'file');
          allFiles = allFiles.concat(files);
      }
      
      let groups: Record<string, File[]> = {};
      // Grouping logic... (same as before)
      for (const file of allFiles) {
        if (!file.size) continue;
        const hash = `${file.name}|${file.size}`;
        if (!groups[hash]) groups[hash] = [];
        groups[hash].push(file);
      }

      const duplicatesArr = Object.values(groups).filter(g => g.length > 1);
      setDuplicates(duplicatesArr);

      if (duplicatesArr.length === 0) {
        setDeleteStatus({ message: 'No duplicates found.', type: 'success' });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [folders]);

  const handleToggleDelete = (fileId: string) => {
    setSelectedToDelete(prev => ({ ...prev, [fileId]: !prev[fileId] }));
  };

  const handleDelete = async () => {
    // Map selectedToDelete keys to both id and cloud_id
    const filesToDelete = duplicates.flat().filter(f => selectedToDelete[f.id.toString()]);
    const cloudIdsToDelete = filesToDelete.map(f => f.cloud_id);
    const dbIdsToDelete = filesToDelete.map(f => f.id);
    if (cloudIdsToDelete.length === 0) return;
    setLoading(true);
    try {
      // First delete from OneDrive
      await apiClient.post('/api/onedrive/delete_files', { file_ids: cloudIdsToDelete });
      // Then delete from DB
      await apiClient.post('/api/files/delete', dbIdsToDelete);
      // Update duplicates state: remove deleted files and filter out groups with only one file
      const newDuplicates = duplicates
        .map(group => group.filter(f => !dbIdsToDelete.includes(f.id)))
        .filter(group => group.length > 1);
      setDuplicates(newDuplicates);
      setDeleteStatus({ message: `${cloudIdsToDelete.length} files deleted successfully.`, type: 'success' });
      setSelectedToDelete({});
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete files.');
    } finally {
      setLoading(false);
    }
  };
  
    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Compare & Find Duplicates</Typography>
      
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6">Folders to Compare</Typography>
        <List>
          {folders.map(folder => (
            <ListItem key={folder.id} secondaryAction={<IconButton edge="end" onClick={() => handleRemoveFolder(folder.id)}><Delete /></IconButton>}>
              <ListItemIcon><Folder /></ListItemIcon>
              <ListItemText primary={folder.name} secondary={folder.id} />
            </ListItem>
          ))}
        </List>
        {folders.length === 0 && <Typography color="text.secondary" sx={{ml: 2}}>Navigate to "My Files" to select folders to compare.</Typography>}
      </Paper>
      
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Button variant="contained" onClick={handleScan} disabled={loading || folders.length < 1}>
          {loading ? <CircularProgress size={24} /> : 'Find Duplicates'}
        </Button>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {deleteStatus && <Alert severity={deleteStatus.type} sx={{ mb: 2 }}>{deleteStatus.message}</Alert>}
      
      {duplicates.length > 0 && (
        <Paper elevation={2} sx={{ p: 2 }}>
          <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2}}>
            <Typography variant="h6">Duplicate Sets ({duplicates.length})</Typography>
            <Button variant="outlined" color="error" onClick={handleDelete} disabled={Object.keys(selectedToDelete).length === 0}>
              Delete Selected
            </Button>
          </Box>
          {duplicates.map((group, index) => (
            <Box key={index} sx={{ mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>Set {index + 1} ({group.length} items)</Typography>
              <List dense>
                {group.map(file => (
                  <ListItem key={file.id} secondaryAction={<Checkbox edge="end" onChange={() => handleToggleDelete(file.id.toString())} checked={!!selectedToDelete[file.id.toString()]} />}>
                    <ListItemText primary={file.name} secondary={`${file.path} - ${formatFileSize(file.size)}`} />
                  </ListItem>
                ))}
              </List>
            </Box>
          ))}
        </Paper>
      )}
    </Box>
  );
};

export default Compare; 