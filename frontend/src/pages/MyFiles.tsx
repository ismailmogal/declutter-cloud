import { useState, useEffect } from 'react';
import type { FC, Dispatch, SetStateAction } from 'react';
import { Alert, Box, Paper, Typography, Button, Chip, CircularProgress, Tooltip, Slider, LinearProgress, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Breadcrumbs, Link } from '@mui/material';
import FileBrowser from '../components/FileBrowser';
import { getCachedFiles, cacheFiles } from '../utils/idbCache';
import ErrorIcon from '@mui/icons-material/Error';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningIcon from '@mui/icons-material/Warning';
import { useFolderScan } from '../hooks/useFolderScan';
import FileTags from '../components/FileTags';
import { moveFileToCloud, copyFileToCloud } from '../api/cloud';
import CrossCloudActions from '../components/CrossCloudActions';
import { upsertFiles } from '../api/files';
import Search from '@mui/icons-material/Search';
import { InputBase } from '@mui/material';
import apiClient from '../api/api';

interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size?: number;
  last_modified?: string;
  path: string;
  tags?: string;
  // Add any other fields as needed
}

interface MyFilesProps {
  user: any;
  files: any[];
  loading: boolean;
  error: string | null;
  onCommitToCompare: (folders: any[]) => void;
  breadcrumbs: any[];
  setBreadcrumbs: Dispatch<SetStateAction<any[]>>;
  currentFolder: any;
  setCurrentFolder: Dispatch<SetStateAction<any>>;
  onRefresh: () => void;
}

const MyFiles: FC<MyFilesProps> = ({ user, files, loading, error, onCommitToCompare, breadcrumbs, setBreadcrumbs, currentFolder, setCurrentFolder, onRefresh }) => {
  const [stagedFolders, setStagedFolders] = useState<any[]>([]);
  const [cachingFolders, setCachingFolders] = useState<Record<string, boolean>>({});
  const [cachingErrors, setCachingErrors] = useState<Record<string, string>>({});
  const [maxDepth, setMaxDepth] = useState<number>(2);
  const [batchProgress, setBatchProgress] = useState<{ folderId: string, current: number, total: number } | null>(null);
  const [batchWarning, setBatchWarning] = useState<{ folder: any, estimated: number } | null>(null);
  const [proceedBatch, setProceedBatch] = useState(false);
  const FILE_WARN_THRESHOLD = 1000;
  const [searchTerm, setSearchTerm] = useState('');

  const {
    scanFolder
  } = useFolderScan(user?.id || '');

  const fetchAllFilesRecursive = async (folderId: string, maxDepth: number, currentDepth = 0, progressCb?: (current: number, total: number) => void): Promise<any[]> => {
    const url = `/api/onedrive/files?folder_id=${folderId}`;
    const response = await apiClient.get(url);
    if (response.status !== 200) return [];
    
    const children = response.data.files || [];
    const files = children.filter((item: any) => item.type === 'file');
    const folders = children.filter((item: any) => item.type === 'folder');
    let allFiles = [...files];
    if (progressCb) progressCb(allFiles.length, allFiles.length + folders.length);
    if (maxDepth < 0 || currentDepth < maxDepth) {
      for (let i = 0; i < folders.length; i++) {
        const subfolder = folders[i];
        const subFiles = await fetchAllFilesRecursive(subfolder.id, maxDepth, currentDepth + 1, progressCb);
        allFiles = allFiles.concat(subFiles);
        if (progressCb) progressCb(allFiles.length, allFiles.length + folders.length - (i + 1));
      }
    }
    return allFiles;
  };

  const handleStageFolders = async (folders: any[]) => {
    const newFolders = folders.filter(folder => !stagedFolders.some(p => p.id === folder.id));
    if (newFolders.length === 0) return;
    const foldersWithDepth = newFolders.map(f => ({ ...f, maxDepth }));
    setStagedFolders(prev => [...prev, ...foldersWithDepth]);
    for (const folder of foldersWithDepth) {
      setCachingFolders(prev => ({ ...prev, [folder.id]: true }));
      setCachingErrors(prev => ({ ...prev, [folder.id]: '' }));
      setBatchProgress(null);
      setProceedBatch(false);
      try {
        const cached = await getCachedFiles(folder.id);
        if (cached && cached.length > 0) {
          setCachingFolders(prev => ({ ...prev, [folder.id]: false }));
          continue;
        }
        // Estimate number of files/folders in the first level
        const url = `/api/onedrive/files?folder_id=${folder.id}`;
        const response = await apiClient.get(url);
        if (response.status !== 200) throw new Error('Failed to fetch folder');
        const data = response.data;
        const children = data.files || [];
        const foldersFirstLevel = children.filter((item: any) => item.type === 'folder');
        const filesFirstLevel = children.filter((item: any) => item.type === 'file');
        const estimatedTotal = filesFirstLevel.length + foldersFirstLevel.length * 100; // rough estimate
        if (estimatedTotal > FILE_WARN_THRESHOLD && !proceedBatch) {
          setBatchWarning({ folder, estimated: estimatedTotal });
          return;
        }
        setBatchProgress({ folderId: folder.id, current: 0, total: estimatedTotal });
        const allFiles = await fetchAllFilesRecursive(folder.id, maxDepth, 0, (current: number, total: number) => {
          setBatchProgress({ folderId: folder.id, current, total });
        });
        await cacheFiles(folder.id, allFiles);
        // Upsert files to backend DB
        try {
          // Remove downloadUrl dependency - just send basic file metadata
          const filesWithMetadata = allFiles.map(f => ({
            ...f,
            cloud_id: f.id,
            provider: 'onedrive',
            // Remove url field entirely
          }));
          await upsertFiles(filesWithMetadata);
        } catch (err) {
          // Optionally handle/report upsert error
          console.error('Failed to upsert files to backend', err);
        }
        setBatchProgress(null);
      } catch (e: any) {
        setCachingErrors(prev => ({ ...prev, [folder.id]: e.message || 'Failed to cache files' }));
        setBatchProgress(null);
      } finally {
        setCachingFolders(prev => ({ ...prev, [folder.id]: false }));
        setBatchWarning(null);
        setProceedBatch(false);
      }
    }
  };

  const handleRemoveFromStaged = (folderId: string) => {
    setStagedFolders(prev => prev.filter(f => f.id !== folderId));
  };
  
  const handleCommitClick = () => {
    onCommitToCompare(stagedFolders);
  };

  const handleFolderClick = (folder: any) => {
    setCurrentFolder(folder);
    setBreadcrumbs(prev => [...prev, { id: folder.id, name: folder.name, path: folder.path || '' }]);
  };

  const handleBreadcrumbClick = (crumb: any) => {
    setCurrentFolder(crumb);
    const index = breadcrumbs.findIndex((b) => b.id === crumb.id);
    setBreadcrumbs(breadcrumbs.slice(0, index + 1));
  };

  const handleForceRefresh = async (folder: any) => {
    setCachingFolders(prev => ({ ...prev, [folder.id]: true }));
    setCachingErrors(prev => ({ ...prev, [folder.id]: '' }));
    try {
      const cached = await getCachedFiles(folder.id);
      if (cached && cached.length > 0) {
        setCachingFolders(prev => ({ ...prev, [folder.id]: false }));
        return;
      }
      // Estimate number of files/folders in the first level
      const url = `/api/onedrive/files?folder_id=${folder.id}`;
      const response = await apiClient.get(url);
      if (response.status !== 200) throw new Error('Failed to fetch folder');
      const data = response.data;
      const children = data.files || [];
      const foldersFirstLevel = children.filter((item: any) => item.type === 'folder');
      const filesFirstLevel = children.filter((item: any) => item.type === 'file');
      const estimatedTotal = filesFirstLevel.length + foldersFirstLevel.length * 100; // rough estimate
      if (estimatedTotal > FILE_WARN_THRESHOLD) {
        setBatchWarning({ folder, estimated: estimatedTotal });
        return;
      }
      setBatchProgress({ folderId: folder.id, current: 0, total: estimatedTotal });
      const allFiles = await fetchAllFilesRecursive(folder.id, maxDepth, 0, (current: number, total: number) => {
        setBatchProgress({ folderId: folder.id, current, total });
      });
      await cacheFiles(folder.id, allFiles);
      // Upsert files to backend DB
      try {
        // Remove downloadUrl dependency - just send basic file metadata
        const filesWithMetadata = allFiles.map(f => ({
          ...f,
          cloud_id: f.id,
          provider: 'onedrive',
          // Remove url field entirely
        }));
        await upsertFiles(filesWithMetadata);
      } catch (err) {
        // Optionally handle/report upsert error
        console.error('Failed to upsert files to backend', err);
      }
      setBatchProgress(null);
    } catch (e: any) {
      setCachingErrors(prev => ({ ...prev, [folder.id]: e.message || 'Failed to cache files' }));
      setBatchProgress(null);
    } finally {
      setCachingFolders(prev => ({ ...prev, [folder.id]: false }));
      setBatchWarning(null);
      setProceedBatch(false);
    }
  };

  const filteredFiles = files.filter(f => {
    const nameMatch = f.name.toLowerCase().includes(searchTerm.toLowerCase());
    const tagMatch = f.tags && f.tags.toLowerCase().includes(searchTerm.toLowerCase());
    return nameMatch || tagMatch;
  });

  // Sync files to backend DB after every folder navigation
  useEffect(() => {
    if (files && files.length > 0) {
      // Map files to include cloud_id, provider - remove url dependency
      const filesWithCloudId = files.map(f => ({
        ...f,
        cloud_id: f.id,
        provider: 'onedrive', // Change if supporting multiple providers
        // Remove url field entirely
      }));
      upsertFiles(filesWithCloudId).catch(err => {
        // Optionally handle/report upsert error
        console.error('Failed to upsert files to backend', err);
      });
    }
  }, [files]);

  // The component now returns the staging area and the file browser
  return (
    <>
      <Box sx={{ mb: 2 }}>
        <Paper sx={{ p: 1, display: 'flex', alignItems: 'center', mb: 1 }}>
          <Search sx={{ mr: 1, color: 'text.secondary' }} />
          <InputBase
            placeholder="Search everything (name, tags, ... )"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            sx={{ width: '100%' }}
          />
        </Paper>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          {breadcrumbs.map((crumb, idx) => (
            <Link
              key={crumb.id}
              color={idx === breadcrumbs.length - 1 ? 'text.primary' : 'inherit'}
              underline={idx === breadcrumbs.length - 1 ? 'none' : 'hover'}
              onClick={() => handleBreadcrumbClick(crumb)}
              sx={{ cursor: 'pointer' }}
            >
              {crumb.name}
            </Link>
          ))}
        </Breadcrumbs>
      </Box>
      {stagedFolders.length > 0 && (
        <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Staged for Comparison</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                disabled={Object.values(cachingFolders).some(Boolean) || !stagedFolders.some(f => f.maxDepth !== maxDepth)}
                onClick={async () => {
                  for (const folder of stagedFolders) {
                    if (folder.maxDepth !== maxDepth) {
                      await handleForceRefresh(folder);
                    }
                  }
                }}
              >
                Refresh All Out-of-Sync
              </Button>
              <Button variant="contained" onClick={handleCommitClick} disabled={Object.values(cachingFolders).some(Boolean)}>
                Compare {stagedFolders.length} Folders
              </Button>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {stagedFolders.map(folder => (
              <span key={folder.id} style={{ display: 'flex', alignItems: 'center' }}>
                <Chip
                  label={folder.name}
                  onDelete={() => handleRemoveFromStaged(folder.id)}
                />
                {folder.maxDepth !== maxDepth && (
                  <Tooltip title={`Depth out of sync. Folder cached with depth ${folder.maxDepth}, current is ${maxDepth}. Use Force Refresh to update.`}>
                    <WarningIcon color="warning" sx={{ ml: 1 }} />
                  </Tooltip>
                )}
                {cachingFolders[folder.id] && <CircularProgress size={18} sx={{ ml: 1 }} />}
                {cachingErrors[folder.id] && (
                  <Tooltip title={cachingErrors[folder.id]}>
                    <ErrorIcon color="error" sx={{ ml: 1 }} />
                  </Tooltip>
                )}
              </span>
            ))}
          </Box>
          <Box sx={{ mt: 2, mb: 1 }}>
            <Typography gutterBottom variant="body2">
              Maximum folder depth to scan: {maxDepth < 0 ? 'All levels' : maxDepth === 1 ? 'Top-level only' : `Up to ${maxDepth}`}
            </Typography>
            <Slider
              value={maxDepth}
              min={-1}
              max={10}
              step={1}
              marks={[
                { value: -1, label: 'All' },
                { value: 1, label: '1' },
                { value: 2, label: '2' },
                { value: 3, label: '3' },
                { value: 5, label: '5' },
                { value: 10, label: '10' },
              ]}
              valueLabelDisplay="auto"
              onChange={(_, v) => setMaxDepth(Array.isArray(v) ? v[0] : v)}
              sx={{ maxWidth: 350 }}
            />
          </Box>
        </Paper>
      )}
      {error && <Alert severity="error">{error}</Alert>}
      <FileBrowser
        files={filteredFiles}
        loading={loading}
        error={error}
        onAddFoldersToCompare={handleStageFolders}
        breadcrumbs={[{ id: 'root', name: 'Root', path: '/' }, ...breadcrumbs]}
        onFolderClick={handleFolderClick}
        onBreadcrumbClick={handleBreadcrumbClick}
        onFileClick={()=>{}}
        onRefresh={onRefresh}
        currentPath=""
        renderFileTags={(file: FileItem) => <FileTags tags={file.tags ? file.tags.split(',') : []} />}
        searchTerm={searchTerm}
      />
      {/* Progress bar and batch warning dialog */}
      {batchProgress && (
        <Box sx={{ width: '100%', mt: 1 }}>
          <LinearProgress variant="determinate" value={Math.min(100, (batchProgress.current / Math.max(1, batchProgress.total)) * 100)} />
          <Typography variant="caption" sx={{ ml: 1 }}>
            Caching files: {batchProgress.current} / {batchProgress.total}
          </Typography>
        </Box>
      )}
      <Dialog open={!!batchWarning}>
        <DialogTitle>Large Folder Detected</DialogTitle>
        <DialogContent>
          <Typography>
            This folder and its subfolders may contain a large number of files (estimated {batchWarning ? batchWarning.estimated : '...'}).
            Caching all files may take a long time and use significant resources. Do you want to proceed?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setBatchWarning(null); setProceedBatch(false); }}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={() => { if (batchWarning) { setBatchWarning(null); setProceedBatch(true); handleStageFolders([batchWarning.folder]); } }}>Proceed</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default MyFiles; 