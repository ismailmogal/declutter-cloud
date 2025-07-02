import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, CircularProgress, Checkbox, FormControlLabel, Grid, Paper, Select, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert } from '@mui/material';
import { getCrossCloudDuplicates, mergeDuplicateGroup } from '../api/duplicates';
import FeatureGate from './FeatureGate';
import LinearProgress from '@mui/material/LinearProgress';
import apiClient from '../api/api';

interface FileItem {
  id: string;
  name: string;
  size: number;
  cloud_provider: string;
  hash: string;
  [key: string]: any;
}

interface DuplicateGroup {
  hash: string;
  files: FileItem[];
  clouds: string[];
  total_size: number;
  potential_savings: number;
}

const mergeStrategies = [
  { value: 'keep_largest', label: 'Keep Largest' },
  { value: 'keep_most_recent', label: 'Keep Most Recent' },
  { value: 'keep_primary_cloud', label: 'Keep Primary Cloud' },
  { value: 'user_choice', label: 'User Choice' },
];

const CrossCloudDuplicates: React.FC = () => {
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [mergeStrategy, setMergeStrategy] = useState<string>('keep_largest');
  const [merging, setMerging] = useState(false);
  const [mergeResult, setMergeResult] = useState<any>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{open: boolean, message: string, severity: 'success' | 'error'}>({open: false, message: '', severity: 'success'});
  const [usage, setUsage] = useState<number | null>(null);
  const [quota, setQuota] = useState<number | null>(null);

  useEffect(() => {
    fetchDuplicates();
    fetchUsage();
  }, []);

  const fetchDuplicates = async () => {
    setLoading(true);
    try {
      const data = await getCrossCloudDuplicates();
      setDuplicates(data);
    } catch (err) {
      setDuplicates([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsage = async () => {
    try {
      const res = await apiClient.get('/api/features/cross_cloud_deduplication/access');
      if (res.data && typeof res.data.usage === 'number' && typeof res.data.limit === 'number') {
        setUsage(res.data.usage);
        setQuota(res.data.limit);
      }
    } catch (err) {
      setUsage(null);
      setQuota(null);
    }
  };

  const handleSelect = (hash: string) => {
    setSelected(prev => prev.includes(hash) ? prev.filter(h => h !== hash) : [...prev, hash]);
  };

  const handleMergeSelected = async () => {
    setConfirmOpen(false);
    setMerging(true);
    try {
      const groups = duplicates.filter(d => selected.includes(d.hash));
      const results = [];
      for (const group of groups) {
        const result = await mergeDuplicateGroup(group, mergeStrategy);
        results.push(result);
      }
      setMergeResult(results);
      setSnackbar({open: true, message: 'Merge completed!', severity: 'success'});
      fetchDuplicates();
      setSelected([]);
    } catch (err) {
      setMergeResult({ error: 'Merge failed' });
      setSnackbar({open: true, message: 'Merge failed', severity: 'error'});
    } finally {
      setMerging(false);
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <FeatureGate feature="cross_cloud_deduplication">
      <Box>
        {usage !== null && quota !== null && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              Usage: {usage} / {quota} merges this month
            </Typography>
            <LinearProgress variant="determinate" value={Math.min(100, (usage / quota) * 100)} />
          </Box>
        )}
        <Typography variant="h4" gutterBottom>Cross-Cloud Duplicates</Typography>
        <Box sx={{ mb: 2 }}>
          <Select value={mergeStrategy} onChange={e => setMergeStrategy(e.target.value)} size="small">
            {mergeStrategies.map(s => (
              <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
            ))}
          </Select>
          <Button variant="contained" sx={{ ml: 2 }} onClick={() => setConfirmOpen(true)} disabled={merging || selected.length === 0}>
            Merge Selected ({selected.length})
          </Button>
        </Box>
        {mergeResult && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color={mergeResult.error ? 'error' : 'success.main'}>
              {mergeResult.error ? mergeResult.error : 'Merge completed!'}
            </Typography>
          </Box>
        )}
        <Grid container spacing={2}>
          {duplicates.map(dup => (
            <Grid item xs={12} md={6} key={dup.hash}>
              <Paper sx={{ p: 2 }}>
                <FormControlLabel
                  control={<Checkbox checked={selected.includes(dup.hash)} onChange={() => handleSelect(dup.hash)} />}
                  label={<b>Duplicate Hash: {dup.hash}</b>}
                />
                <Typography variant="body2">Clouds: {dup.clouds.join(', ')}</Typography>
                <Typography variant="body2">Total Size: {dup.total_size} bytes</Typography>
                <Typography variant="body2">Potential Savings: {dup.potential_savings} bytes</Typography>
                <Box sx={{ mt: 1 }}>
                  {dup.files.map(file => (
                    <Box key={file.id} sx={{ mb: 1, pl: 2, borderLeft: '2px solid #eee' }}>
                      <Typography variant="body2">{file.name} ({file.size} bytes) - {file.cloud_provider}</Typography>
                    </Box>
                  ))}
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
        <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
          <DialogTitle>Confirm Merge</DialogTitle>
          <DialogContent>
            <Typography>Are you sure you want to merge the selected duplicate groups? This will remove all but one copy of each group.</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmOpen(false)} disabled={merging}>Cancel</Button>
            <Button onClick={handleMergeSelected} color="primary" disabled={merging} autoFocus>
              {merging ? 'Merging...' : 'Confirm'}
            </Button>
          </DialogActions>
        </Dialog>
        <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({...snackbar, open: false})}>
          <Alert onClose={() => setSnackbar({...snackbar, open: false})} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </FeatureGate>
  );
};

export default CrossCloudDuplicates; 