import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, CircularProgress, Alert, Button, Checkbox, Toolbar, TextField, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import FileBrowser from '../components/FileBrowser';
import apiClient from '../api/api';
import { getCachedFiles, cacheFiles } from '../utils/idbCache';
import { Search } from '@mui/icons-material';

const MyFiles: React.FC = () => {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFolder, setCurrentFolder] = useState<any>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<any[]>([]);
  const [selectedFolders, setSelectedFolders] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  
  const fetchFiles = useCallback(async (folderId: string | null = 'root', forceRefresh = false) => {
    setLoading(true);
    setError(null);
    const effectiveFolderId = folderId || 'root';

    try {
      let filesData: any[] = [];
      if (!forceRefresh) {
        filesData = await getCachedFiles(effectiveFolderId);
      }

      if (forceRefresh || filesData.length === 0) {
        const response = await apiClient.get(`/api/onedrive/files?folder_id=${effectiveFolderId}`);
        filesData = response.data.files || [];
        await cacheFiles(effectiveFolderId, filesData);

        if (response.data.folder_details) {
          setBreadcrumbs(response.data.folder_details.path || []);
        } else {
          setBreadcrumbs([]);
        }
      }
      setFiles(filesData);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch files.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);
  
  const handleFolderClick = (folder: any) => {
    setCurrentFolder(folder);
    fetchFiles(folder.id);
  };
  
  const handleBreadcrumbClick = (crumb: { id: string; name: string; path: string }) => {
    fetchFiles(crumb.id);
    if(crumb.id === 'root') {
      setCurrentFolder(null);
      setBreadcrumbs([]);
    } else {
      // In a more robust implementation, we might get the full crumb object
      // and update the current folder and breadcrumb trail from it.
      // For now, fetching re-calculates the breadcrumbs.
    }
  };
  
  const handleRefresh = () => {
    fetchFiles(currentFolder?.id, true);
  };
  
  const handleSelectFolder = (folderId: string, isSelected: boolean) => {
    const newSelected = { ...selectedFolders };
    if (isSelected) {
      newSelected[folderId] = true;
    } else {
      delete newSelected[folderId];
    }
    setSelectedFolders(newSelected);
  };
  
  const handleCompareClick = () => {
    const folderIds = Object.keys(selectedFolders);
    if (folderIds.length > 0) {
      navigate(`/compare?folders=${folderIds.join(',')}`);
    }
  };

  const numSelected = Object.keys(selectedFolders).length;

  if (loading && files.length === 0) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
        <Paper elevation={3} sx={{ p: 1.5, borderRadius: 3, minWidth: 350, maxWidth: 500, width: '100%', display: 'flex', alignItems: 'center' }}>
          <Search sx={{ mr: 1, color: 'text.secondary' }} />
          <TextField
            fullWidth
            size="small"
            variant="outlined"
            placeholder="Search everything (name, tags, ... )"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            InputProps={{
              disableUnderline: true,
              sx: { borderRadius: 2, bgcolor: 'background.paper' }
            }}
          />
        </Paper>
      </Box>
      {numSelected > 0 && (
        <Toolbar sx={{ bgcolor: 'action.selected', mb: 2, borderRadius: 1 }}>
          <Typography sx={{ flex: '1 1 100%' }} variant="h6">
            {numSelected} selected
          </Typography>
          <Button variant="contained" onClick={handleCompareClick}>
            Compare
          </Button>
        </Toolbar>
      )}
      <FileBrowser
        files={files}
        onFolderClick={handleFolderClick}
        onRefresh={handleRefresh}
        breadcrumbs={[{id: 'root', name: 'Root', path: '/'}, ...breadcrumbs]}
        onBreadcrumbClick={handleBreadcrumbClick}
        loading={loading}
        error={error}
        onFileClick={() => {}}
        onAddFoldersToCompare={() => {}}
        currentPath={currentFolder?.path || ''}
        selectedFolders={selectedFolders}
        onSelectFolder={handleSelectFolder}
        searchTerm={searchTerm}
      />
    </Box>
  );
};

export default MyFiles; 