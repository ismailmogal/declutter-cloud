import { useEffect, useState } from 'react';
import { AppBar, Toolbar, Typography, Box, Drawer, List, ListItem, ListItemText, CircularProgress, ListItemButton, Button, Alert, AlertTitle, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, ListItemIcon, Divider, InputBase, Avatar, LinearProgress } from '@mui/material';
import AuthModal from './components/AuthModal';
import UserProfile from './components/UserProfile';
import DeleteIcon from '@mui/icons-material/Delete';
import Search from '@mui/icons-material/Search';
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
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import Footer from './components/Footer';
import Support from './components/Support';
import Help from './components/Help';
import Modal from '@mui/material/Modal';
import SettingsIcon from '@mui/icons-material/Settings';
import Logo from './components/Logo';
import apiClient from './api/api';

// Page Components
import MyFiles from './pages/MyFiles';
import Compare from './pages/Compare';
import SmartOrganiser from './pages/SmartOrganiser';
import HomePage from './pages/HomePage';

const sections = [
  'My Files',
  'Compare',
  'Smart Organiser',
  'Settings',
];

const sectionIcons: Record<string, JSX.Element> = {
  'My Files': <FolderIcon sx={{ mr: 2 }} />,
  'Compare': <CompareArrowsIcon sx={{ mr: 2 }} />,
  'Smart Organiser': <AutoFixHighIcon sx={{ mr: 2 }} />,
  'Settings': <SettingsIcon sx={{ mr: 2 }} />,
};

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
  const [supportOpen, setSupportOpen] = useState(false);

  const fetchUserProfile = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const userResponse = await apiClient.get('/auth/me');
      if (userResponse.status !== 200) throw new Error('Failed to fetch user profile.');
      
      const connectionsResponse = await apiClient.get('/api/cloud/connections');
      
      setUser({ ...userResponse.data, connections: connectionsResponse.data || [] });
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'An error occurred.');
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
      if (!user?.connections?.some((conn: any) => conn.provider === 'onedrive' && conn.is_active)) {
        return;
      }
      setDataLoading(true);
      setError(null);
      
      try {
        const folderId = currentFolder?.id || 'root';
        let filesData: any[] = [];
        if (!forceRefresh) {
          filesData = await getCachedFiles(folderId);
        }
        if (forceRefresh || !filesData || filesData.length === 0) {
          const filesResponse = await apiClient.get(`/api/onedrive/files?folder_id=${folderId}`);
          if (filesResponse.status !== 200) throw new Error((filesResponse.data).detail || 'Failed to fetch files');
          const apiData = filesResponse.data;
          filesData = apiData.files || [];
          await cacheFiles(folderId, filesData);
        }
        setFiles(filesData);
        setForceRefresh(false);
      } catch (err: any) {
        setError(err.response?.data?.detail || err.message);
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
      case 'Settings':
        return <SettingsModal open={true} onClose={() => setSelected('My Files')} user={user} refreshUser={fetchUserProfile} />;
      default:
        return <Typography sx={{ p: 3 }}>Select a section</Typography>;
    }
  };

  const Sidebar = () => (
    <Drawer
      variant="permanent"
      sx={{
        width: 240,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: 240, boxSizing: 'border-box', background: '#f5f6fa', borderRight: '1px solid #e0e0e0' },
      }}
    >
      <Toolbar />
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', flexDirection: 'column' }}>
        <Avatar sx={{ width: 56, height: 56, mb: 1 }}>{user?.name?.[0] || '?'}</Avatar>
        <Typography variant="subtitle1" fontWeight={600}>{user?.name || 'User'}</Typography>
        <Typography variant="caption" color="text.secondary">{user?.email || ''}</Typography>
      </Box>
      <Divider />
      <List>
        {sections.map((text) => (
          <ListItem key={text} disablePadding>
            <ListItemButton selected={selected === text} onClick={() => setSelected(text)}>
              <ListItemIcon>{sectionIcons[text]}</ListItemIcon>
              <ListItemText primary={text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Box sx={{ flex: 1 }} />
      <Divider />
      <Box sx={{ p: 2 }}>
        <Typography variant="caption" color="text.secondary">Storage</Typography>
        <LinearProgress variant="determinate" value={57} sx={{ height: 8, borderRadius: 4, my: 1 }} />
        <Typography variant="caption" color="text.secondary">118.7 GB used of 205 GB</Typography>
      </Box>
    </Drawer>
  );

  const TopBar = () => (
    <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar>
        <Logo size={32} />
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, ml: 1.5 }}>
          Declutter Cloud
        </Typography>
        {user ? (
          <UserProfile user={user} onLogout={handleLogout} />
        ) : (
          <Button color="inherit" onClick={() => setAuthModalOpen(true)}>Login</Button>
        )}
      </Toolbar>
    </AppBar>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return (
      <>
        <HomePage onLoginClick={() => setAuthModalOpen(true)} />
        <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} onSuccess={handleLoginSuccess} />
      </>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      <TopBar />
      <Box sx={{ display: 'flex', flex: 1 }}>
        <Sidebar />
        <Box component="main" sx={{ flexGrow: 1, p: 3, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <Toolbar />
          <Box sx={{ flex: 1 }}>
            {selected === 'Help' ? <Help /> : renderContent()}
          </Box>
          <Footer onSupportClick={() => setSupportOpen(true)} />
        </Box>
        <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} onSuccess={handleLoginSuccess} />
        <Modal open={supportOpen} onClose={() => setSupportOpen(false)}>
          <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', bgcolor: 'background.paper', boxShadow: 24, p: 4, maxWidth: 600, width: '90%', borderRadius: 2 }}>
            <Support onHelpClick={() => { setSupportOpen(false); setSelected('Help'); }} />
          </Box>
        </Modal>
      </Box>
    </Box>
  );
}

export default App; 