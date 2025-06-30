import React from 'react';
import { AppBar, Toolbar, Typography, Box } from '@mui/material';
import UserProfile from './UserProfile';
import Logo from './Logo';

interface HeaderProps {
  user: any;
  onLogout: () => void;
  onSettingsClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout, onSettingsClick }) => {
  return (
    <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar>
        <Logo size={32} />
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, ml: 2 }}>
          Declutter Cloud
        </Typography>
        <UserProfile user={user} onLogout={onLogout} onSettingsClick={onSettingsClick} />
      </Toolbar>
    </AppBar>
  );
};

export default Header; 