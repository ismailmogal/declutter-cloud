import React, { useState } from 'react';
import {
  Box,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  IconButton,
  Divider,
  ListItemIcon
} from '@mui/material';
import { Logout, Settings } from '@mui/icons-material';

interface UserProfileProps {
  user: {
    name: string;
    email: string;
    avatar_url?: string;
  };
  onLogout: () => void;
  onSettingsClick: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, onLogout, onSettingsClick }) => {
  if (!user) return null;
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    handleClose();
    onLogout();
  };

  const handleSettings = () => {
    handleClose();
    onSettingsClick();
  };

  const getInitials = (name?: string, email?: string) => {
    const target = name || email || '';
    return target
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <IconButton onClick={handleMenu} size="small" sx={{ ml: 2 }}>
        <Avatar src={user.avatar_url} sx={{ width: 32, height: 32 }}>{user.name?.[0]}</Avatar>
      </IconButton>
      
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleSettings}>
          <ListItemIcon>
            <Settings fontSize="small" />
          </ListItemIcon>
          Settings
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <Logout fontSize="small" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default UserProfile; 