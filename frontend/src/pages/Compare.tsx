import React, { useState } from 'react';
import {
  Box, Button, Typography, Switch, FormControlLabel, List, ListItem, ListItemText,
  IconButton, Paper, CircularProgress, Alert, Checkbox, Chip, MenuItem, Select, Tooltip
} from '@mui/material';
import { Delete, Folder, PlaylistAdd, Refresh } from '@mui/icons-material';
import { getCachedFiles, cacheFiles, clearFilesCache } from '../utils/idbCache';
import apiClient from '../api/api';

interface File {
  id: string;
  name: string;
  path: string;
  size: number;
  last_modified?: string;
  file?: {
    hashes?: {
      sha1Hash?: string;
      quickXorHash?: string;
    }
  };
}

interface CompareProps {
  folders: { id: string, name: string, maxDepth?: number }[];
  setFolders: React.Dispatch<React.SetStateAction<{ id: string, name: string, maxDepth?: number }[]>>;
}

// Utility type for progress callback
type ProgressCallback = (current: number, total: number) => void;

const Compare: React.FC<CompareProps> = ({ folders, setFolders }) => {
  const [recursive, setRecursive] = useState(true);
  const [duplicates, setDuplicates] = useState<File[][]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedToDelete, setSelectedToDelete] = useState<Record<string, boolean>>({});
  const [deleteStatus, setDeleteStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [folderStats, setFolderStats] = useState<Record<string, { count: number; cached: boolean; error?: string }>>({});
  const [groupMethod, setGroupMethod] = useState<'name+size+path' | 'size' | 'quickXorHash'>('name+size+path');
  const [folderLoading, setFolderLoading] = useState<Record<string, boolean>>({});
  const [selectMode, setSelectMode] = useState<'oldest' | 'latest' | 'none'>('none');

  const handleRemoveFolder = (folderId: string) => {
    setFolders(prev => prev.filter(f => f.id !== folderId));
    setFolderStats(prev => {
      const copy = { ...prev };
      delete copy[folderId];
      return copy;
    });
  };

  const handleRefreshFolder = async (folderId: string) => {
    setFolderLoading(prev => ({ ...prev, [folderId]: true }));
    try {
      const folder = folders.find(f => f.id === folderId);
      const depth = folder && typeof folder.maxDepth === 'number' ? folder.maxDepth : -1;
      let url = `/api/onedrive/files?folder_id=${folderId}&recursive=true`;
      if (depth > 0) url += `&max_depth=${depth}`;
      
      const response = await apiClient.get(url);

      if (response.status !== 200) throw new Error((response.data).detail || 'Failed to fetch files');
      
      await cacheFiles(folderId, response.data.files || []);
      setFolderStats(prev => ({ ...prev, [folderId]: { count: (response.data.files || []).length, cached: false } }));
    } catch (err: any) {
      setFolderStats(prev => ({ ...prev, [folderId]: { count: 0, cached: false, error: err.message } }));
    } finally {
      setFolderLoading(prev => ({ ...prev, [folderId]: false }));
    }
  };

  const handleScan = async () => {
    setLoading(true);
    setError(null);
    setDuplicates([]);
    setSelectedToDelete({});
    setDeleteStatus(null);
    let folderStatsTemp: Record<string, { count: number; cached: boolean; error?: string }> = {};
    try {
      // Gather all files from IDB for each folder
      let allFiles: File[] = [];
      for (const folder of folders) {
        let files = await getCachedFiles(folder.id);
        let cached = true;
        if (!files || files.length === 0) {
          // Fetch from API and cache if missing
          const depth = typeof folder.maxDepth === 'number' ? folder.maxDepth : -1;
          let url = `/api/onedrive/files?folder_id=${folder.id}&recursive=true`;
          if (depth > 0) url += `&max_depth=${depth}`;
          const response = await apiClient.get(url);
          if (response.status !== 200) throw new Error((response.data).detail || 'Failed to fetch files');
          files = response.data.files || [];
          await cacheFiles(folder.id, files);
          cached = false;
        }
        // Only include files, not folders
        files = (files || []).filter((item: any) => !item.type || item.type === 'file');
        allFiles = allFiles.concat(files);
        folderStatsTemp[folder.id] = { count: files.length, cached };
      }
      setFolderStats(folderStatsTemp);
      // Grouping logic
      let groups: Record<string, File[]> = {};
      if (groupMethod === 'quickXorHash') {
        // Group by QuickXorHash if available, fallback to name+size+path
        for (const file of allFiles) {
          if (!file.size) continue;
          let hash = file.file?.hashes?.quickXorHash || '';
          if (!hash) {
            hash = `${file.name}|${file.size}|${file.path}`;
          }
          if (!groups[hash]) groups[hash] = [];
          groups[hash].push(file);
        }
      } else if (groupMethod === 'size') {
        // Group by size only
        for (const file of allFiles) {
          if (!file.size) continue;
          if (!groups[file.size]) groups[file.size] = [];
          groups[file.size].push(file);
        }
      } else {
        // Group by name+size+path (default)
        for (const file of allFiles) {
          if (!file.size) continue;
          const hash = `${file.name}|${file.size}|${file.path}`;
          if (!groups[hash]) groups[hash] = [];
          groups[hash].push(file);
        }
      }
      // Only keep groups with >1 file
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
  };

  const handleToggleDelete = (fileId: string) => {
    setSelectedToDelete(prev => ({ ...prev, [fileId]: !prev[fileId] }));
  };

  const handleDelete = async () => {
    const fileIdsToDelete = Object.keys(selectedToDelete).filter(id => selectedToDelete[id]);
    if (fileIdsToDelete.length === 0) {
      setDeleteStatus({ message: 'No files selected for deletion.', type: 'error' });
      return;
    }
    setLoading(true);
    setError(null);
    setDeleteStatus(null);
    try {
      const response = await apiClient.post('/api/onedrive/delete_files', { file_ids: fileIdsToDelete });
      
      const data = response.data;
      if (response.status === 200 && data.status !== 'partial_success') {
        // Clear cache for all involved folders
        for (const folder of folders) {
          await clearFilesCache(folder.id);
        }
        setDeleteStatus({ message: `${data.deleted} files deleted successfully. Refreshing results...`, type: 'success' });
        // After a successful deletion, re-scan to get the updated list of duplicates
        await handleScan();
      } else {
        const errorDetail = data.errors ? data.errors.map((e: any) => `${e.file_id}: ${e.error}`).join(', ') : (data.detail || 'Failed to delete some files.');
        throw new Error(errorDetail);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setSelectedToDelete({});
    }
  };

  // Pre-select all but the first file in each duplicate group
  const handleSelectAllButOne = (group: File[]) => {
    let sortedGroup = [...group];
    if (selectMode === 'oldest') {
      sortedGroup.sort((a, b) => new Date(a.last_modified || 0).getTime() - new Date(b.last_modified || 0).getTime());
    } else if (selectMode === 'latest') {
      sortedGroup.sort((a, b) => new Date(b.last_modified || 0).getTime() - new Date(a.last_modified || 0).getTime());
    }
    const newSelected: Record<string, boolean> = {};
    sortedGroup.slice(1).forEach(file => {
      newSelected[file.id] = true;
    });
    setSelectedToDelete(prev => ({ ...prev, ...newSelected }));
  };
  
  // Add this function to select all but one file in every group
  const handleSelectAllGroups = () => {
    let newSelected: Record<string, boolean> = {};
    duplicates.forEach(group => {
      let sortedGroup = [...group];
      if (selectMode === 'oldest') {
        sortedGroup.sort((a, b) => new Date(a.last_modified || 0).getTime() - new Date(b.last_modified || 0).getTime());
      } else if (selectMode === 'latest') {
        sortedGroup.sort((a, b) => new Date(b.last_modified || 0).getTime() - new Date(a.last_modified || 0).getTime());
      }
      sortedGroup.slice(1).forEach(file => {
        newSelected[file.id] = true;
      });
    });
    setSelectedToDelete(newSelected);
  };
  
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Find the maxDepth used for these folders (assume all staged with same value, or show range if not)
  const allDepths = folders.map(f => f.maxDepth).filter(d => d !== undefined);
  let depthSummary = '';
  if (allDepths.length > 0) {
    const uniqueDepths = Array.from(new Set(allDepths));
    if (uniqueDepths.length === 1) {
      const d = uniqueDepths[0];
      depthSummary = d === -1 ? 'All levels' : d === 1 ? 'Top-level only' : `Up to ${d}`;
    } else {
      depthSummary = `Mixed (${uniqueDepths.join(', ')})`;
    }
  }

  // Deep scan utility (copied from MyFiles)
  const fetchAllFilesRecursive = async (
    folderId: string,
    token: string,
    maxDepth: number,
    currentDepth: number = 0,
    progressCb?: ProgressCallback
  ): Promise<File[]> => {
    const headers = { 'Authorization': `Bearer ${token}` };
    let url = `/api/onedrive/files?folder_id=${folderId}`;
    const response = await fetch(url, { headers });
    if (!response.ok) return [];
    const data = await response.json();
    const children: any[] = data.files || [];
    const files: File[] = children.filter((item: any) => item.type === 'file');
    const folders: any[] = children.filter((item: any) => item.type === 'folder');
    let allFiles: File[] = [...files];
    if (progressCb) progressCb(allFiles.length, allFiles.length + folders.length);
    if (maxDepth < 0 || currentDepth < maxDepth) {
      for (let i = 0; i < folders.length; i++) {
        const subfolder = folders[i];
        const subFiles = await fetchAllFilesRecursive(subfolder.id, token, maxDepth, currentDepth + 1, progressCb);
        allFiles = allFiles.concat(subFiles);
        if (progressCb) progressCb(allFiles.length, allFiles.length + folders.length - (i + 1));
      }
    }
    return allFiles;
  };

  const handleDeepScanAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No auth token');
      for (const folder of folders) {
        const allFiles = await fetchAllFilesRecursive(folder.id, token, -1);
        await cacheFiles(folder.id, allFiles);
      }
      await handleScan();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Compare & Find Duplicates</Typography>
      
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6">Folders to Scan</Typography>
        {folders.length === 0 ? (
          <Typography sx={{ my: 2, display: 'flex', alignItems: 'center' }}>
            Go to "My Files" and click the <PlaylistAdd sx={{ verticalAlign: 'middle', mx: 0.5 }} /> icon on any folder to add it here.
          </Typography>
        ) : (
          <List dense>
            {folders.map(folder => (
              <ListItem key={folder.id} secondaryAction={
                <>
                  <Tooltip title="Refresh folder cache">
                    <span>
                      <IconButton edge="end" aria-label="refresh" onClick={() => handleRefreshFolder(folder.id)} disabled={!!folderLoading[folder.id]}>
                        <Refresh />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <IconButton edge="end" aria-label="delete" onClick={() => handleRemoveFolder(folder.id)}>
                    <Delete />
                  </IconButton>
                </>
              }>
                <Folder sx={{ mr: 1, color: 'primary.main' }} />
                <ListItemText primary={folder.name} />
                {folderStats[folder.id] && (
                  <>
                    <Chip label={folderStats[folder.id].cached ? 'Cached' : 'Fresh'} size="small" color={folderStats[folder.id].cached ? 'default' : 'primary'} sx={{ ml: 1 }} />
                    <Chip label={`${folderStats[folder.id].count} files`} size="small" sx={{ ml: 1 }} />
                    {folderStats[folder.id].error && <Chip label={folderStats[folder.id].error} size="small" color="error" sx={{ ml: 1 }} />}
                  </>
                )}
              </ListItem>
            ))}
          </List>
        )}
        <FormControlLabel
          control={<Switch checked={recursive} onChange={(e) => setRecursive(e.target.checked)} />}
          label="Recursive Scan (includes all sub-folders)"
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
          <Button 
            variant="contained" 
            onClick={handleScan} 
            disabled={loading || folders.length === 0}
          >
            {loading ? <CircularProgress size={24} /> : 'Scan for Duplicates'}
          </Button>
          <Select
            value={groupMethod}
            onChange={e => setGroupMethod(e.target.value as any)}
            size="small"
            sx={{ minWidth: 250 }}
          >
            <MenuItem value="name+size+path">Compare: Name + Size + Path (Strict)</MenuItem>
            <MenuItem value="size">Compare: Size Only (Loose)</MenuItem>
            <MenuItem value="quickXorHash">Compare: Hash (Recommended)</MenuItem>
          </Select>
          <Select
            value={selectMode}
            onChange={e => setSelectMode(e.target.value as any)}
            size="small"
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="none">Manual Select</MenuItem>
            <MenuItem value="oldest">Select All But Oldest</MenuItem>
            <MenuItem value="latest">Select All But Latest</MenuItem>
          </Select>
        </Box>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {Object.keys(folderStats).length > 0 && (
              <>
                Scanned <b>{Object.values(folderStats).reduce((a, b) => a + b.count, 0)}</b> files from <b>{Object.keys(folderStats).length}</b> folder(s)
                {depthSummary && <> &mdash; Depth: <b>{depthSummary}</b></>}
              </>
            )}
          </Typography>
        </Box>
      </Paper>

      <Button
        variant="contained"
        onClick={handleDeepScanAll}
        disabled={folders.length === 0 || loading}
        sx={{ mb: 2 }}
      >
        Deep Scan All Folders
      </Button>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {deleteStatus && <Alert severity={deleteStatus.type} sx={{ mb: 2 }}>{deleteStatus.message}</Alert>}
      
      {duplicates.length > 0 && (
        <Paper elevation={2} sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Duplicate Groups ({duplicates.length})</Typography>
            <Typography variant="body2" color="text.secondary">
              {duplicates.reduce((a, b) => a + b.length, 0)} files in groups
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={handleSelectAllGroups}
                disabled={loading || selectMode === 'none'}
              >
                Select All But {selectMode === 'oldest' ? 'Oldest' : selectMode === 'latest' ? 'Latest' : ''} (All Groups)
              </Button>
              <Button 
                variant="contained" 
                color="error"
                onClick={handleDelete}
                disabled={loading || Object.values(selectedToDelete).every(v => !v)}
              >
                Delete Selected
              </Button>
            </Box>
          </Box>
          {duplicates.map((group, index) => (
            <Paper key={index} variant="outlined" sx={{ mb: 2, p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1">
                  Group {index + 1} ({group.length} files) - Size: {formatFileSize(group[0]?.size || 0)}
                </Typography>
                <Button size="small" onClick={() => handleSelectAllButOne(group)}>Select all but one</Button>
              </Box>
              <List dense>
                {group.map(file => (
                  <ListItem key={file.id} sx={{ pl: 0 }}>
                    <Checkbox
                      edge="start"
                      checked={!!selectedToDelete[file.id]}
                      onChange={() => handleToggleDelete(file.id)}
                    />
                    <ListItemText 
                      primary={file.name} 
                      secondary={`Path: ${file.path.replace('drives/me/root:', '')} | Modified: ${file.last_modified ? new Date(file.last_modified).toLocaleString() : 'N/A'}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          ))}
        </Paper>
      )}
    </Box>
  );
};

export default Compare; 