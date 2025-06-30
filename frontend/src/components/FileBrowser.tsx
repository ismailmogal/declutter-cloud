import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Breadcrumbs,
  Link,
  Grid,
  Chip,
  Skeleton,
  Alert,
  Button,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableCell,
  TableRow,
  Paper,
  Checkbox,
  Toolbar
} from '@mui/material';
import {
  Folder,
  InsertDriveFile,
  MoreVert,
  NavigateNext,
  Refresh,
  Search,
  FilterList,
  Sort,
  ViewList,
  ViewModule,
  PlaylistAdd,
  Close
} from '@mui/icons-material';
import CrossCloudActions from './CrossCloudActions';

interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size?: number;
  last_modified?: string;
  path: string;
  duplicate_count?: number;
  suggestion?: string;
  tags?: string;
}

interface FileBrowserProps {
  files: FileItem[];
  currentPath: string;
  breadcrumbs: { id: string; name: string; path: string }[];
  loading: boolean;
  error: string | null;
  onFileClick: (file: FileItem) => void;
  onFolderClick: (folder: FileItem) => void;
  onBreadcrumbClick: (crumb: { id: string; name: string; path: string }) => void;
  onRefresh: () => void;
  onAddFoldersToCompare: (folders: FileItem[]) => void;
  renderFileTags?: (file: FileItem) => React.ReactNode;
  renderCrossCloudActions?: (file: FileItem) => React.ReactNode;
  searchTerm?: string;
}

const FileBrowser: React.FC<FileBrowserProps> = ({
  files,
  breadcrumbs,
  loading,
  error,
  onFileClick,
  onFolderClick,
  onBreadcrumbClick,
  onRefresh,
  onAddFoldersToCompare,
  renderFileTags,
  renderCrossCloudActions,
  searchTerm = '',
}) => {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'last_modified'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSort = (field: 'name' | 'size' | 'last_modified') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const filteredAndSortedFiles = files
    .filter(file =>
      file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (file.tags && file.tags.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'size':
          aValue = a.size || 0;
          bValue = b.size || 0;
          break;
        case 'last_modified':
          aValue = new Date(a.last_modified || 0);
          bValue = new Date(b.last_modified || 0);
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  };

  const numSelected = Object.keys(selected).length;
  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelected = files
        .filter(f => f.type === 'folder')
        .reduce((acc, file) => ({ ...acc, [file.id]: true }), {});
      setSelected(newSelected);
      return;
    }
    setSelected({});
  };

  const handleClick = (id: string, isFolder: boolean) => {
    if (!isFolder) return; // Or handle file selection differently
    const newSelected = { ...selected };
    if (newSelected[id]) {
      delete newSelected[id];
    } else {
      newSelected[id] = true;
    }
    setSelected(newSelected);
  };
  
  const handleAddToCompareClick = () => {
    const foldersToAdd = files.filter(f => selected[f.id]);
    onAddFoldersToCompare(foldersToAdd);
    setSelected({}); // Clear selection after adding
  };

  const isSelected = (id: string) => !!selected[id];

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Breadcrumbs separator={<NavigateNext fontSize="small" />}>
          {breadcrumbs.map((crumb, index) => (
            <Link
              key={crumb.id}
              color={index === breadcrumbs.length - 1 ? 'text.primary' : 'inherit'}
              onClick={() => onBreadcrumbClick(crumb)}
              sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
            >
              {crumb.name}
            </Link>
          ))}
        </Breadcrumbs>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Refresh">
            <IconButton onClick={onRefresh} disabled={loading}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* File List */}
      {loading ? (
        <Grid container spacing={2}>
          {[...Array(6)].map((_, index) => (
            <Box key={index} sx={{ width: '100%' }}>
              <Card>
                <CardContent>
                  <Skeleton variant="rectangular" height={60} sx={{ mb: 1 }} data-testid="skeleton" />
                  <Skeleton variant="text" width="60%" data-testid="skeleton" />
                  <Skeleton variant="text" width="40%" data-testid="skeleton" />
                </CardContent>
              </Card>
            </Box>
          ))}
        </Grid>
      ) : filteredAndSortedFiles.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No files found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {searchTerm ? 'Try adjusting your search terms' : 'This folder is empty'}
          </Typography>
        </Box>
      ) : (
        <Paper sx={{ width: '100%' }}>
          {numSelected > 0 && (
            <>
              <Box sx={{ mb: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {files.filter(f => selected[f.id]).map(f => (
                  <Chip key={f.id} label={f.name} color="primary" />
                ))}
              </Box>
              <Toolbar sx={{ bgcolor: 'primary.lighter', color: 'primary.darker' }}>
                <Typography sx={{ flex: '1 1 100%' }} color="inherit" variant="subtitle1" component="div">
                  {numSelected} selected
                </Typography>
                <Tooltip title="Add to Compare">
                  <Button
                    variant="contained"
                    startIcon={<PlaylistAdd />}
                    onClick={handleAddToCompareClick}
                  >
                    Add to Compare
                  </Button>
                </Tooltip>
              </Toolbar>
            </>
          )}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={numSelected > 0 && numSelected < files.filter(f=>f.type==='folder').length}
                      checked={files.length > 0 && numSelected === files.filter(f=>f.type==='folder').length}
                      onChange={handleSelectAllClick}
                    />
                  </TableCell>
                  <TableCell sortDirection={sortBy === 'name' ? sortOrder : false}>
                    <Button fullWidth onClick={() => handleSort('name')}>
                      Name 
                      <Sort sx={{ ml: 1, opacity: sortBy === 'name' ? 1 : 0.3 }} />
                    </Button>
                  </TableCell>
                  <TableCell align="left" sortDirection={sortBy === 'last_modified' ? sortOrder : false}>
                    <Button fullWidth onClick={() => handleSort('last_modified')} sx={{ justifyContent: 'flex-start' }}>
                      Modified 
                      <Sort sx={{ ml: 1, opacity: sortBy === 'last_modified' ? 1 : 0.3 }} />
                    </Button>
                  </TableCell>
                  <TableCell align="left" sortDirection={sortBy === 'size' ? sortOrder : false}>
                    <Button fullWidth onClick={() => handleSort('size')} sx={{ justifyContent: 'flex-start' }}>
                      File size 
                      <Sort sx={{ ml: 1, opacity: sortBy === 'size' ? 1 : 0.3 }} />
                    </Button>
                  </TableCell>
                  <TableCell>
                    {/* Actions column if needed */}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredAndSortedFiles.map((file: FileItem) => {
                  const isItemSelected = isSelected(file.id);
                  return (
                    <TableRow
                      hover
                      onClick={() => {
                        if (file.type === 'folder') {
                          onFolderClick(file);
                        } else {
                          onFileClick(file);
                        }
                      }}
                      role="checkbox"
                      aria-checked={isItemSelected}
                      tabIndex={-1}
                      key={file.id}
                      selected={isItemSelected}
                      sx={{
                        cursor: 'pointer',
                        backgroundColor: isItemSelected ? 'rgba(25, 118, 210, 0.08)' : undefined,
                        transition: 'background 0.2s',
                      }}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox
                          color="primary"
                          checked={isItemSelected}
                          onClick={(event) => {
                            event.stopPropagation(); // Prevent row click
                            handleClick(file.id, file.type === 'folder');
                          }}
                        />
                      </TableCell>
                      <TableCell component="th" scope="row" padding="none">
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                           {file.type === 'folder' ? <Folder sx={{ mr: 1, color: 'primary.main' }} /> : <InsertDriveFile sx={{ mr: 1, color: 'text.secondary' }} />}
                           {file.name}
                        </Box>
                      </TableCell>
                      <TableCell>{formatDate(file.last_modified)}</TableCell>
                      <TableCell>{formatFileSize(file.size)}</TableCell>
                      <TableCell>
                        {renderFileTags && renderFileTags(file)}
                      </TableCell>
                      <TableCell>
                        {renderCrossCloudActions && renderCrossCloudActions(file)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <Search fontSize="small" />
          </ListItemIcon>
          <ListItemText>Find duplicates</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <FilterList fontSize="small" />
          </ListItemIcon>
          <ListItemText>Get suggestions</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default FileBrowser;