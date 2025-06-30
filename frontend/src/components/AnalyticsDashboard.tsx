import React from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, LinearProgress, Tooltip, Stack, Avatar } from '@mui/material';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ImageIcon from '@mui/icons-material/Image';
import DescriptionIcon from '@mui/icons-material/Description';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import ArchiveIcon from '@mui/icons-material/Archive';
import MovieIcon from '@mui/icons-material/Movie';

interface AnalyticsDashboardProps {
  data: {
    total_files: number;
    by_type: Record<string, number>;
  } | null;
}

const COLORS = [
  '#1976d2', '#388e3c', '#fbc02d', '#d32f2f', '#7b1fa2', '#0288d1', '#c2185b', '#ffa000', '#388e3c', '#455a64',
];

const FILE_TYPE_ICONS: Record<string, React.ReactNode> = {
  '.pdf': <PictureAsPdfIcon color="error" />,
  '.jpg': <ImageIcon color="primary" />,
  '.jpeg': <ImageIcon color="primary" />,
  '.png': <ImageIcon color="primary" />,
  '.docx': <DescriptionIcon color="action" />,
  '.doc': <DescriptionIcon color="action" />,
  '.txt': <InsertDriveFileIcon color="action" />,
  '.csv': <InsertDriveFileIcon color="action" />,
  '.xlsx': <InsertDriveFileIcon color="success" />,
  '.pptx': <InsertDriveFileIcon color="secondary" />,
  '.zip': <ArchiveIcon color="warning" />,
  '.rar': <ArchiveIcon color="warning" />,
  '.mp3': <MusicNoteIcon color="secondary" />,
  '.m4a': <MusicNoteIcon color="secondary" />,
  '.key': <InsertDriveFileIcon color="info" />,
  '.pages': <InsertDriveFileIcon color="info" />,
  '.other': <InsertDriveFileIcon color="disabled" />,
};

function getFileTypeIcon(type: string) {
  return FILE_TYPE_ICONS[type] || <InsertDriveFileIcon color="disabled" />;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ data }) => {
  if (!data) return <Typography>Loading analytics...</Typography>;
  const { total_files, by_type } = data;
  const sortedTypes = Object.entries(by_type || {}).sort((a, b) => b[1] - a[1]);
  const topTypes = sortedTypes.slice(0, 5);
  const otherCount = sortedTypes.slice(5).reduce((sum, [, count]) => sum + count, 0);
  const displayTypes = [...topTypes, ...(otherCount > 0 ? [['Other', otherCount]] : [])];
  const maxCount = Math.max(...displayTypes.map(([, count]) => count as number));

  // Pie chart-like summary (colored circles)
  const totalForPie = displayTypes.reduce((sum, [, count]) => sum + (count as number), 0);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>File Analytics</Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>Total Files: <b>{total_files}</b></Typography>
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>File Type Distribution</Typography>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          {displayTypes.map(([type, count], idx) => (
            <Tooltip key={type === 'Other' ? `Other-${idx}` : type} title={`${type}: ${count} files`}>
              <Avatar
                sx={{ bgcolor: COLORS[idx % COLORS.length], width: 32, height: 32, fontSize: 18 }}
                variant="circular"
              >
                {getFileTypeIcon(String(type).toLowerCase())}
              </Avatar>
            </Tooltip>
          ))}
        </Stack>
        <Box sx={{ mb: 3 }}>
          {displayTypes.map(([type, count], idx) => (
            <Box key={type === 'Other' ? `Other-${idx}` : type} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Box sx={{ minWidth: 60, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 1 }}>
                {getFileTypeIcon(String(type).toLowerCase())} {type}
              </Box>
              <Box sx={{ flex: 1, mx: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={((count as number) / maxCount) * 100 || 0}
                  sx={{ height: 14, borderRadius: 2, background: '#eee', '& .MuiLinearProgress-bar': { backgroundColor: COLORS[idx % COLORS.length] } }}
                />
              </Box>
              <Box sx={{ minWidth: 40, textAlign: 'right' }}>{count}</Box>
            </Box>
          ))}
        </Box>
      </Box>
      <TableContainer component={Paper} sx={{ maxWidth: 500 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Type</TableCell>
              <TableCell align="right">Count</TableCell>
              <TableCell align="right">% of Total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {displayTypes.map(([type, count], idx) => (
              <TableRow key={type === 'Other' ? `Other-${idx}` : type}>
                <TableCell>{type}</TableCell>
                <TableCell align="right">{count}</TableCell>
                <TableCell align="right">{((count as number / total_files) * 100).toFixed(1)}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default AnalyticsDashboard; 