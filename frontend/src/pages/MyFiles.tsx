import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, CircularProgress, Alert, Button, Checkbox, Toolbar, TextField, Paper, Tabs, Tab, Breadcrumbs, IconButton } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import FileBrowser from '../components/FileBrowser';
import apiClient from '../api/api';
import { getCachedFiles, cacheFiles } from '../utils/idbCache';
import { Search, Cloud as CloudIcon, Google as GoogleIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';

const PROVIDERS = [
  { key: 'onedrive', label: 'OneDrive', icon: <CloudIcon /> },
  { key: 'google', label: 'Google Drive', icon: <GoogleIcon /> },
  { key: 'googlephotos', label: 'Google Photos', icon: <PhotoLibraryIcon /> },
];

const MyFiles: React.FC = () => {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFolder, setCurrentFolder] = useState<any>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<any[]>([]);
  const [selectedFolders, setSelectedFolders] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('onedrive');
  const navigate = useNavigate();
  
  const fetchFiles = useCallback(async (folderId: string | null = 'root', forceRefresh = false) => {
    setLoading(true);
    setError(null);
    const effectiveFolderId = folderId || 'root';
    const cacheKey = `${selectedProvider}_${effectiveFolderId}`;

    try {
      let filesData: any[] = [];
      if (!forceRefresh) {
        filesData = await getCachedFiles(cacheKey);
      }

      if (forceRefresh || filesData.length === 0) {
        if (selectedProvider === 'google') {
          const response = await apiClient.get(`/api/${selectedProvider}/files?folder_id=${effectiveFolderId}`);
          filesData = response.data.files || [];
          await cacheFiles(cacheKey, filesData);

          if (response.data.folder_details) {
            setBreadcrumbs(response.data.folder_details.path || []);
          } else {
            setBreadcrumbs([]);
          }
        } else if (selectedProvider === 'googlephotos') {
          const response = await apiClient.get('/api/googlephotos/files');
          filesData = response.data.files || [];
          setBreadcrumbs([]);
        } else {
          const response = await apiClient.get(`/api/${selectedProvider}/files?folder_id=${effectiveFolderId}`);
          filesData = response.data.files || [];
          await cacheFiles(cacheKey, filesData);

          if (response.data.folder_details) {
            setBreadcrumbs(response.data.folder_details.path || []);
          } else {
            setBreadcrumbs([]);
          }
        }
      }
      setFiles(filesData);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch files.');
    } finally {
      setLoading(false);
    }
  }, [selectedProvider]);

  useEffect(() => {
    fetchFiles();
    setCurrentFolder(null);
    setBreadcrumbs([]);
    setSelectedFolders({});
  }, [fetchFiles, selectedProvider]);
  
  const handleFolderClick = (folder: any) => {
    setCurrentFolder(folder);
    fetchFiles(folder.id);
  };
  
  const handleBreadcrumbClick = (crumb: { id: string; name: string; path: string }) => {
    fetchFiles(crumb.id);
    if(crumb.id === 'root') {
      setCurrentFolder(null);
      setBreadcrumbs([]);
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

  const handleProviderChange = (event: React.SyntheticEvent, newValue: string) => {
    setSelectedProvider(newValue);
  };

  // Breadcrumbs for UI
  const allBreadcrumbs = [{id: 'root', name: 'Root', path: '/'}].concat(breadcrumbs);

  if (loading && files.length === 0) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        <Tabs value={selectedProvider} onChange={handleProviderChange} sx={{ mb: 1 }}>
          {PROVIDERS.map(p => (
            <Tab key={p.key} value={p.key} label={p.label} icon={p.icon} />
          ))}
        </Tabs>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Breadcrumbs aria-label="breadcrumb">
            {allBreadcrumbs.map((crumb, idx) => (
              <Typography
                key={crumb.id}
                color={idx === allBreadcrumbs.length - 1 ? 'text.primary' : 'inherit'}
                sx={{ cursor: idx === allBreadcrumbs.length - 1 ? 'default' : 'pointer' }}
                onClick={() => idx !== allBreadcrumbs.length - 1 && handleBreadcrumbClick(crumb)}
              >
                {crumb.name}
              </Typography>
            ))}
          </Breadcrumbs>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              size="small"
              placeholder="Search everything (name, tags, ... )"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              InputProps={{
                sx: { borderRadius: 2, bgcolor: 'background.paper', width: 350, fontSize: 18 }
              }}
            />
            <IconButton onClick={handleRefresh}><RefreshIcon /></IconButton>
          </Box>
        </Box>
      </Paper>
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
      {selectedProvider === 'googlephotos' ? (
        <>
          {loading && <CircularProgress />}
          {error && <Alert severity="error">{error}</Alert>}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
            {files.length === 0 && !loading && !error ? (
              <Typography>No Google Photos found. Make sure you are connected.</Typography>
            ) : (
              files.map(photo => (
                <Box key={photo.id} sx={{ width: 160, textAlign: 'center' }}>
                  <a href={photo.url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={photo.thumbnail}
                      alt={photo.name}
                      style={{ width: 150, height: 150, objectFit: 'cover', borderRadius: 8 }}
                    />
                  </a>
                  <Typography variant="body2" noWrap>{photo.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {photo.createdTime ? new Date(photo.createdTime).toLocaleDateString() : ''}
                  </Typography>
                </Box>
              ))
            )}
          </Box>
        </>
      ) : (
        <FileBrowser
          files={files}
          onFolderClick={handleFolderClick}
          onRefresh={handleRefresh}
          breadcrumbs={allBreadcrumbs}
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
      )}
    </Box>
  );
};

export default MyFiles; 