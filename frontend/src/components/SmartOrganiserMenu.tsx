import React from 'react';
import { List, ListItem, ListItemButton, ListItemText } from '@mui/material';

interface SmartOrganiserMenuProps {
  selected: string;
  onSelect: (key: string) => void;
}

const menuItems = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'cleanup', label: 'Cleanup Recommendations' },
  { key: 'duplicates', label: 'Duplicates' },
  { key: 'similar', label: 'Similar Files' },
  { key: 'images', label: 'Duplicate Images' },
  { key: 'rules', label: 'Rules' },
];

const SmartOrganiserMenu: React.FC<SmartOrganiserMenuProps> = ({ selected, onSelect }) => (
  <List>
    {menuItems.map(item => (
      <ListItem key={item.key} disablePadding>
        <ListItemButton selected={selected === item.key} onClick={() => onSelect(item.key)}>
          <ListItemText primary={item.label} />
        </ListItemButton>
      </ListItem>
    ))}
  </List>
);

export default SmartOrganiserMenu; 