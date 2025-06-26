import { useState, useEffect } from 'react';
import type { FC, Dispatch, SetStateAction } from 'react';
import { Alert, Box, Paper, Typography, Button, Chip, CircularProgress, Tooltip, Slider, LinearProgress, Dialog, DialogTitle, DialogContent, DialogActions, IconButton } from '@mui/material';
import FileBrowser from '../components/FileBrowser';
import { getCachedFiles, cacheFiles } from '../utils/idbCache';
import ErrorIcon from '@mui/icons-material/Error';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningIcon from '@mui/icons-material/Warning';
import { useFolderScan } from '../hooks/useFolderScan';
import TagFilterBar from '../components/TagFilterBar';
import FileTags from '../components/FileTags';
import { searchFilesByTags, getTags } from '../api/files';
import { moveFileToCloud, copyFileToCloud } from '../api/cloud';
import CrossCloudActions from '../components/CrossCloudActions';

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
  const [tags, setTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<FileItem[]>(files);

  const {
    scanFolder,
    progress,
    status: scanStatus,
    error: scanError,
    isCancelling,
    foldersVisited,
    filesFound,
    cancelScan
  } = useFolderScan(user?.id || '');

  useEffect(() => {
    getTags().then(data => setTags(data.tags || []));
  }, []);

  useEffect(() => {
    if (selectedTags.length > 0) {
      searchFilesByTags(selectedTags.join(',')).then(setFilteredFiles);
    } else {
      setFilteredFiles(files);
    }
  }, [selectedTags, files]);

  const fetchAllFilesRecursive = async (folderId: string, token: string, maxDepth: number, currentDepth = 0, progressCb?: (current: number, total: number) => void): Promise<any[]> => {
    const headers = { 'Authorization': `Bearer ${token}` };
    let url = `/api/onedrive/files?folder_id=${folderId}`;
    const response = await fetch(url, { headers });
    if (!response.ok) return [];
    const data = await response.json();
    const children = data.files || [];
    const files = children.filter((item: any) => item.type === 'file');
    const folders = children.filter((item: any) => item.type === 'folder');
    let allFiles = [...files];
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
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No auth token');
        const cached = await getCachedFiles(folder.id);
        if (cached && cached.length > 0) {
          setCachingFolders(prev => ({ ...prev, [folder.id]: false }));
          continue;
        }
        // Estimate number of files/folders in the first level
        const headers = { 'Authorization': `Bearer ${token}` };
        let url = `/api/onedrive/files?folder_id=${folder.id}`;
        const response = await fetch(url, { headers });
        if (!response.ok) throw new Error('Failed to fetch folder');
        const data = await response.json();
        const children = data.files || [];
        const foldersFirstLevel = children.filter((item: any) => item.type === 'folder');
        const filesFirstLevel = children.filter((item: any) => item.type === 'file');
        const estimatedTotal = filesFirstLevel.length + foldersFirstLevel.length * 100; // rough estimate
        if (estimatedTotal > FILE_WARN_THRESHOLD && !proceedBatch) {
          setBatchWarning({ folder, estimated: estimatedTotal });
          return;
        }
        setBatchProgress({ folderId: folder.id, current: 0, total: estimatedTotal });
        const allFiles = await fetchAllFilesRecursive(folder.id, token, maxDepth, 0, (current, total) => {
          setBatchProgress({ folderId: folder.id, current, total });
        });
        await cacheFiles(folder.id, allFiles);
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
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No auth token');
      // Estimate number of files/folders in the first level
      const headers = { 'Authorization': `Bearer ${token}` };
      let url = `/api/onedrive/files?folder_id=${folder.id}`;
      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error('Failed to fetch folder');
      const data = await response.json();
      const children = data.files || [];
      const foldersFirstLevel = children.filter((item: any) => item.type === 'folder');
      const filesFirstLevel = children.filter((item: any) => item.type === 'file');
      const estimatedTotal = filesFirstLevel.length + foldersFirstLevel.length * 100; // rough estimate
      if (estimatedTotal > FILE_WARN_THRESHOLD) {
        setBatchWarning({ folder, estimated: estimatedTotal });
        return;
      }
      setBatchProgress({ folderId: folder.id, current: 0, total: estimatedTotal });
      const allFiles = await fetchAllFilesRecursive(folder.id, token, maxDepth, 0, (current, total) => {
        setBatchProgress({ folderId: folder.id, current, total });
      });
      await cacheFiles(folder.id, allFiles);
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

  // The component now returns the staging area and the file browser
  return (
    <>
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
      <TagFilterBar tags={tags} selectedTags={selectedTags} onChange={setSelectedTags} />
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
        // renderCrossCloudActions is disabled for now
        // renderCrossCloudActions={(file: FileItem) => (
        //   <CrossCloudActions
        //     fileId={Number(file.id)}
        //     availableClouds={['onedrive', 'googledrive']}
        //     onMove={(targetCloud: string) => moveFileToCloud(Number(file.id), targetCloud)}
        //     onCopy={(targetCloud: string) => copyFileToCloud(Number(file.id), targetCloud)}
        //   />
        // )}
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