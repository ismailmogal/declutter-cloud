import React from 'react';
import { NavLink } from 'react-router-dom';
import { Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Toolbar } from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import SettingsIcon from '@mui/icons-material/Settings';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

const drawerWidth = 240;

const sections = [
  { name: 'My Files', path: '/files', icon: <FolderIcon /> },
  { name: 'Compare', path: '/compare', icon: <CompareArrowsIcon /> },
  { name: 'Smart Organiser', path: '/smart-organiser', icon: <AutoFixHighIcon /> },
  { name: 'Settings', path: '/settings', icon: <SettingsIcon /> },
  { name: 'Help', path: '/help', icon: <HelpOutlineIcon /> },
];

const Sidebar: React.FC = () => {
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
      }}
    >
      <Toolbar />
      <Box sx={{ overflow: 'auto' }}>
        <List>
          {sections.map((section) => (
            <ListItem key={section.name} disablePadding>
              <ListItemButton
                component={NavLink}
                to={section.path}
                sx={{
                  '&.active': {
                    backgroundColor: 'action.selected',
                    fontWeight: 'fontWeightBold',
                  },
                }}
              >
                <ListItemIcon>{section.icon}</ListItemIcon>
                <ListItemText primary={section.name} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
    </Drawer>
  );
};

export default Sidebar; 