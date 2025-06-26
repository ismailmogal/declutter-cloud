import { useEffect, useState } from 'react';
import { AppBar, Toolbar, Typography, Box, Drawer, List, ListItem, ListItemText, CircularProgress, ListItemButton, Button, Alert, AlertTitle, IconButton, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import AuthModal from './components/AuthModal';
import UserProfile from './components/UserProfile';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import Chip from '@mui/material/Chip';
import { getSessionId } from './utils/sessionId';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import { cacheFiles, getCachedFiles, cacheUIState, getCachedUIState, clearFilesCache } from './utils/idbCache';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import SettingsModal from './components/SettingsModal';

// Page Components
import MyFiles from './pages/MyFiles';
import Compare from './pages/Compare';
import SmartOrganiser from './pages/SmartOrganiser';

const sections = [
  'My Files',
  'Compare',
  'Smart Organiser',
];

function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

function App() {
  const [selected, setSelected] = useState('My Files');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [files, setFiles] = useState<any[]>([]);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [compareProgress, setCompareProgress] = useState<{ status: string, progress: number } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [fileFilter, setFileFilter] = useState('');
  const [currentFolder, setCurrentFolder] = useState<any>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<any[]>([]);
  const [selectedFolders, setSelectedFolders] = useState<{ id: string, name: string }[]>([]);
  const [compareFolders, setCompareFolders] = useState<{ folder1: { id: string, name: string } | null, folder2: { id: string, name: string } | null }>({ folder1: null, folder2: null });
  const [recursiveCompare, setRecursiveCompare] = useState(false);
  const [foldersToCompare, setFoldersToCompare] = useState<any[]>([]);
  const [stagedFolders, setStagedFolders] = useState<any[]>([]);
  const [forceRefresh, setForceRefresh] = useState(false);

  const fetchUserProfile = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const userResponse = await fetch('/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!userResponse.ok) {
        throw new Error('Failed to fetch user profile.');
      }
      
      const userData = await userResponse.json();

      const connectionsResponse = await fetch('/api/cloud/connections', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const connectionsData = connectionsResponse.ok ? await connectionsResponse.json() : [];
      
      setUser({ ...userData, connections: connectionsData });

    } catch (err: any) {
      setError(err.message || 'An error occurred.');
      setUser(null);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  useEffect(() => {
    const fetchFiles = async () => {
      if (!user?.cloud_connections?.some((conn: any) => conn.provider === 'onedrive' && conn.is_active)) {
        return;
      }
      setDataLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      if (!token) {
        setError("Authentication token not found.");
        setDataLoading(false);
        return;
      }
      try {
        const folderId = currentFolder?.id || 'root';
        let filesData: any[] = [];
        if (!forceRefresh) {
          filesData = await getCachedFiles(folderId);
        }
        if (forceRefresh || !filesData || filesData.length === 0) {
          const headers = { 'Authorization': `Bearer ${token}` };
          const filesResponse = await fetch(`/api/onedrive/files?folder_id=${folderId}`, { headers });
          if (!filesResponse.ok) throw new Error((await filesResponse.json()).detail || 'Failed to fetch files');
          const apiData = await filesResponse.json();
          filesData = apiData.files || [];
          await cacheFiles(folderId, filesData);
        }
        setFiles(filesData);
        setForceRefresh(false);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setDataLoading(false);
      }
    };
    if (user) {
      fetchFiles();
    }
  }, [user, currentFolder, forceRefresh]);

  const handleLoginSuccess = async () => {
    await fetchUserProfile();
    setAuthModalOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const handleOpenSettings = () => {
    setSettingsModalOpen(true);
  };

  const handleAddFolderToCompare = (folder: any) => {
    setFoldersToCompare(prev => {
      if (prev.find(f => f.id === folder.id)) {
        return prev; // Avoid duplicates
      }
      return [...prev, folder];
    });
    setSelected('Compare'); // Switch to compare page when a folder is added
  };

  const handleAddFoldersToCompare = (folders: any[]) => {
    setFoldersToCompare(prev => {
      const newFolders = folders.filter(folder => !prev.some(p => p.id === folder.id));
      return [...prev, ...newFolders];
    });
    setSelected('Compare');
  };

  const handleStageFolders = (folders: any[]) => {
    setStagedFolders(prev => {
      const newFolders = folders.filter(folder => !prev.some(p => p.id === folder.id));
      return [...prev, ...newFolders];
    });
  };

  const handleCommitToCompare = (folders: any[]) => {
    setFoldersToCompare(folders);
    setSelected('Compare');
  };

  const handleRemoveFromStaged = (folderId: string) => {
    setStagedFolders(prev => prev.filter(f => f.id !== folderId));
  };

  const handleRefresh = () => {
    setForceRefresh(true);
  };

  const renderContent = () => {
    if (loading) {
      return <CircularProgress sx={{ m: 4 }} />;
    }
    if (!user) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6">Welcome to Declutter Cloud</Typography>
          <Typography>Please log in to manage your files.</Typography>
          <Button variant="contained" sx={{ mt: 2 }} onClick={() => setAuthModalOpen(true)}>Login</Button>
        </Box>
      );
    }
    if (error) {
      return <Typography color="error" sx={{ p: 3 }}>Error: {error}</Typography>;
    }

    switch (selected) {
      case 'My Files':
        return (
          <MyFiles 
            user={user}
            files={files}
            loading={dataLoading}
            error={error}
            onCommitToCompare={handleCommitToCompare}
            breadcrumbs={breadcrumbs}
            setBreadcrumbs={setBreadcrumbs}
            currentFolder={currentFolder}
            setCurrentFolder={setCurrentFolder}
            onRefresh={handleRefresh}
          />
        );
      case 'Compare':
        return <Compare folders={foldersToCompare} setFolders={setFoldersToCompare} />;
      case 'Smart Organiser':
        return <SmartOrganiser />;
      default:
        return <Typography sx={{ p: 3 }}>Select a section</Typography>;
    }
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
            Declutter Cloud
          </Typography>
          {user ? (
            <UserProfile user={user} onLogout={handleLogout} onOpenSettings={handleOpenSettings} />
          ) : (
            <Button color="inherit" onClick={() => setAuthModalOpen(true)}>Login</Button>
          )}
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width: 240,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: 240, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {sections.map((text) => (
              <ListItem key={text} disablePadding>
                <ListItemButton selected={selected === text} onClick={() => setSelected(text)}>
                  <ListItemText primary={text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        {renderContent()}
      </Box>
      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} onSuccess={handleLoginSuccess} />
      {user && <SettingsModal 
            open={settingsModalOpen}
            onClose={() => {
              setSettingsModalOpen(false);
              fetchUserProfile();
            }}
            user={user}
            refreshUser={fetchUserProfile}
          />}
    </Box>
  );
}

export default App; 