import React, { useState } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Checkbox, Button, Dialog, DialogTitle, DialogContent, DialogActions, Tooltip } from '@mui/material';

export interface FileGroupFile {
  id: number;
  name: string;
  size?: number;
  path?: string;
  provider?: string;
  last_modified?: string;
  similarityScore?: number;
}

interface FileGroupListProps {
  groups: FileGroupFile[][];
  groupType: 'duplicates' | 'similar';
  showSimilarityScore?: boolean;
  onDeleteSelected?: (groupIdx: number, ids: number[]) => void;
}

const FileGroupList: React.FC<FileGroupListProps> = ({ groups, groupType, showSimilarityScore, onDeleteSelected }) => {
  const [selected, setSelected] = useState<Record<string, Record<number, boolean>>>({});
  const [confirmOpen, setConfirmOpen] = useState<{ groupIdx: number, ids: number[] } | null>(null);

  if (!groups.length) return <Typography sx={{ mt: 2 }}>No {groupType === 'duplicates' ? 'duplicate' : 'similar'} files found.</Typography>;

  const handleSelect = (groupIdx: number, id: number) => {
    setSelected(prev => ({
      ...prev,
      [groupIdx]: { ...prev[groupIdx], [id]: !prev[groupIdx]?.[id] }
    }));
  };

  const handleDelete = (groupIdx: number) => {
    const ids = Object.keys(selected[groupIdx] || {}).filter(id => selected[groupIdx][Number(id)]).map(Number);
    setConfirmOpen({ groupIdx, ids });
  };

  const handleConfirmDelete = () => {
    if (confirmOpen && onDeleteSelected) {
      onDeleteSelected(confirmOpen.groupIdx, confirmOpen.ids);
      setSelected(prev => ({ ...prev, [confirmOpen.groupIdx]: {} }));
    }
    setConfirmOpen(null);
  };

  const handleCancelDelete = () => setConfirmOpen(null);

  return (
    <Box>
      {groups.map((files, groupIdx) => (
        <Box key={groupIdx} sx={{ border: '1px solid #ccc', borderRadius: 2, m: 1, p: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>{groupType === 'duplicates' ? 'Duplicate Files' : 'Similar Files'}</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell />
                  <TableCell>Name</TableCell>
                  <TableCell>Path</TableCell>
                  <TableCell>Provider</TableCell>
                  <TableCell>Size</TableCell>
                  <TableCell>Last Modified</TableCell>
                  {showSimilarityScore && <TableCell>Similarity</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {files.map(f => (
                  <TableRow key={f.id} hover>
                    <TableCell>
                      <Checkbox checked={!!selected[groupIdx]?.[f.id]} onChange={() => handleSelect(groupIdx, f.id)} color="primary" />
                    </TableCell>
                    <TableCell>
                      <Tooltip title={f.name}>
                        <span style={{ wordBreak: 'break-all' }}>{f.name}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={f.path || ''}>
                        <span style={{ wordBreak: 'break-all', color: '#888' }}>{f.path || '-'}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{f.provider || '-'}</TableCell>
                    <TableCell>{typeof f.size === 'number' ? (f.size/1024).toFixed(1) + ' KB' : '-'}</TableCell>
                    <TableCell>{f.last_modified ? new Date(f.last_modified).toLocaleString() : '-'}</TableCell>
                    {showSimilarityScore && <TableCell>{f.similarityScore !== undefined ? `${f.similarityScore}%` : '-'}</TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              color="error"
              size="small"
              disabled={Object.values(selected[groupIdx] || {}).every(v => !v)}
              onClick={() => handleDelete(groupIdx)}
            >
              Delete Selected
            </Button>
          </Box>
        </Box>
      ))}
      <Dialog open={!!confirmOpen} onClose={handleCancelDelete}>
        <DialogTitle>Delete Files</DialogTitle>
        <DialogContent>
          Are you sure you want to delete the selected files? This action cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FileGroupList; 