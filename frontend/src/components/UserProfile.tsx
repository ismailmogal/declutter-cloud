import React, { useState } from 'react';
import {
  Box,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  IconButton,
  Divider,
  Chip
} from '@mui/material';
import { Logout, Settings } from '@mui/icons-material';

interface UserProfileProps {
  user: any;
  onLogout: () => void;
  onOpenSettings: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, onLogout, onOpenSettings }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    onLogout();
    handleClose();
  };

  const handleSettings = () => {
    onOpenSettings();
    handleClose();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
        <Typography variant="body2" sx={{ mr: 1 }}>
          {user.name || user.email}
        </Typography>
        {user.provider && (
          <Chip
            label={user.provider}
            size="small"
            color="primary"
            variant="outlined"
          />
        )}
      </Box>
      
      <IconButton
        size="large"
        onClick={handleMenu}
        color="inherit"
      >
        {user.avatar_url ? (
          <Avatar src={user.avatar_url} sx={{ width: 32, height: 32 }}>
            {getInitials(user.name || user.email)}
          </Avatar>
        ) : (
          <Avatar sx={{ width: 32, height: 32 }}>
            {getInitials(user.name || user.email)}
          </Avatar>
        )}
      </IconButton>
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
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
          <Settings sx={{ mr: 1 }} />
          Settings
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <Logout sx={{ mr: 1 }} />
          Logout
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default UserProfile; 