import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Box } from '@mui/material';

interface CleanupFile {
  id: number;
  name: string;
  path?: string;
  size?: number;
  last_accessed?: string;
  reason?: string;
}

interface CleanupRecommendationsProps {
  files: CleanupFile[];
  onDelete: (id: number) => void;
  onArchive: (id: number) => void;
  onIgnore: (id: number) => void;
}

const CleanupRecommendations: React.FC<CleanupRecommendationsProps> = ({ files, onDelete, onArchive, onIgnore }) => {
  const [confirm, setConfirm] = useState<{ action: 'delete' | 'archive' | null, file: CleanupFile | null }>({ action: null, file: null });

  const handleConfirm = (action: 'delete' | 'archive', file: CleanupFile) => setConfirm({ action, file });
  const handleClose = () => setConfirm({ action: null, file: null });
  const handleProceed = () => {
    if (confirm.action && confirm.file) {
      if (confirm.action === 'delete') onDelete(confirm.file.id);
      if (confirm.action === 'archive') onArchive(confirm.file.id);
    }
    handleClose();
  };

  if (!files.length) {
    return <Typography sx={{ mt: 2 }}>No files recommended for cleanup. Your storage looks tidy!</Typography>;
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Recommended for Cleanup</Typography>
      <TableContainer component={Paper} sx={{ maxWidth: 900 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Path</TableCell>
              <TableCell align="right">Size</TableCell>
              <TableCell>Last Accessed</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {files.map(file => (
              <TableRow key={file.id}>
                <TableCell>{file.name}</TableCell>
                <TableCell>{file.path || '-'}</TableCell>
                <TableCell align="right">{file.size ? `${(file.size/1024/1024).toFixed(2)} MB` : '-'}</TableCell>
                <TableCell>{file.last_accessed ? new Date(file.last_accessed).toLocaleDateString() : '-'}</TableCell>
                <TableCell>{file.reason || '-'}</TableCell>
                <TableCell>
                  <Button color="error" size="small" onClick={() => handleConfirm('delete', file)}>Delete</Button>
                  <Button color="primary" size="small" onClick={() => handleConfirm('archive', file)}>Archive</Button>
                  <Button color="inherit" size="small" onClick={() => onIgnore(file.id)}>Ignore</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog open={!!confirm.action} onClose={handleClose}>
        <DialogTitle>{confirm.action === 'delete' ? 'Delete File?' : 'Archive File?'}</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to {confirm.action} <b>{confirm.file?.name}</b>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button color={confirm.action === 'delete' ? 'error' : 'primary'} onClick={handleProceed} autoFocus>
            {confirm.action === 'delete' ? 'Delete' : 'Archive'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CleanupRecommendations; 