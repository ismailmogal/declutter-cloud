import React, { useEffect, useState, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { 
  Box, CircularProgress, Alert, Toolbar, Modal,
  ThemeProvider, createTheme, CssBaseline 
} from '@mui/material';

import HomePage from './pages/HomePage';
import MyFiles from './pages/MyFiles';
import Compare from './pages/Compare';
import SmartOrganiser from './pages/SmartOrganiser';
import SettingsPage from './pages/Settings';
import Help from './components/Help';
import Footer from './components/Footer';
import Support from './components/Support';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import apiClient from './api/api';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await apiClient.get('/api/user/me');
        setIsAuthenticated(true);
        if (res.data.preferences?.theme) {
          setThemeMode(res.data.preferences.theme);
        }
      } catch (error) {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  const handleLoginSuccess = () => setIsAuthenticated(true);
  const handleLogout = () => setIsAuthenticated(false);

  const theme = useMemo(() =>
    createTheme({
      palette: {
        mode: themeMode,
      },
    }),
    [themeMode]
  );

  if (isAuthenticated === null) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        {isAuthenticated 
          ? <LoggedInApp onLogout={handleLogout} themeMode={themeMode} setThemeMode={setThemeMode} /> 
          : <HomePage onLoginSuccess={handleLoginSuccess} />}
      </Router>
    </ThemeProvider>
  );
};

const LoggedInApp = ({ onLogout, themeMode, setThemeMode }: { onLogout: () => void, themeMode: 'light' | 'dark', setThemeMode: (mode: 'light' | 'dark') => void }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const navigate = useNavigate();

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/user/me');
      setUser(response.data);
      if (response.data.preferences?.theme) {
        setThemeMode(response.data.preferences.theme);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'An error occurred fetching user profile.');
      if (err.response?.status === 401) {
        onLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!user) return <Box>Could not load user profile. Please try logging in again.</Box>;

  const handleHelpClickFromModal = () => {
    setIsSupportModalOpen(false);
    navigate('/help');
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      <Header user={user} onLogout={onLogout} onSettingsClick={() => {}} />
      <Box sx={{ display: 'flex', flex: 1 }}>
        <Sidebar />
        <Box component="main" sx={{ flexGrow: 1, p: 3, bgcolor: 'background.default' }}>
          <Toolbar />
          <Routes>
            <Route path="/files" element={<MyFiles />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/smart-organiser" element={<SmartOrganiser />} />
            <Route path="/settings" element={<SettingsPage themeMode={themeMode} setThemeMode={setThemeMode} />} />
            <Route path="/help" element={<Help />} />
            <Route path="*" element={<Navigate to="/files" />} />
          </Routes>
        </Box>
      </Box>
      <Footer onSupportClick={() => setIsSupportModalOpen(true)} />
      <Modal open={isSupportModalOpen} onClose={() => setIsSupportModalOpen(false)}>
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', bgcolor: 'background.paper', boxShadow: 24, p: 4, borderRadius: 2, maxWidth: 600, width: '90%' }}>
          <Support onHelpClick={handleHelpClickFromModal} />
        </Box>
      </Modal>
    </Box>
  );
};

export default App; 