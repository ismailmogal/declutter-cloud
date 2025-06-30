import React from 'react';
import { List, ListItem, ListItemButton, ListItemText } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import ImageIcon from '@mui/icons-material/Image';
import RuleIcon from '@mui/icons-material/Rule';

interface SmartOrganiserMenuProps {
  selected: string;
  onSelect: (key: string) => void;
}

const menuItems = [
  { key: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
  { key: 'organise', label: 'Organise My Files', icon: <AutoFixHighIcon /> },
  { key: 'cleanup', label: 'Cleanup Recommendations', icon: <DeleteSweepIcon /> },
  { key: 'duplicates', label: 'Duplicates', icon: <ContentCopyIcon /> },
  { key: 'similar', label: 'Similar Files', icon: <CompareArrowsIcon /> },
  { key: 'images', label: 'Duplicate Images', icon: <ImageIcon /> },
  { key: 'rules', label: 'Rules', icon: <RuleIcon /> },
];

const SmartOrganiserMenu: React.FC<SmartOrganiserMenuProps> = ({ selected, onSelect }) => (
  <List>
    {menuItems.map(item => (
      <ListItem key={item.key} disablePadding>
        <ListItemButton selected={selected === item.key} onClick={() => onSelect(item.key)}>
          {item.icon}
          <ListItemText primary={item.label} sx={{ ml: 2 }} />
        </ListItemButton>
      </ListItem>
    ))}
  </List>
);

export default SmartOrganiserMenu; 