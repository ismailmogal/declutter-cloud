import { useState, useEffect } from 'react';
import { Button, Box, Typography, CircularProgress, Alert, Grid } from '@mui/material';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import CleanupRecommendations from '../components/CleanupRecommendations';
import RuleBuilder from '../components/RuleBuilder';
import SimilarFilesGroup from '../components/SimilarFilesGroup';
import DuplicateImagesGroup from '../components/DuplicateImagesGroup';
import SmartOrganiserMenu from '../components/SmartOrganiserMenu';
import { getFileAnalytics } from '../api/analytics';
import { getCleanupRecommendations } from '../api/files';
import { getDuplicateFiles, getSimilarFiles } from '../api/duplicates';
import { getDuplicateImages } from '../api/images';
import { createRule } from '../api/rules';

interface CleanupFile {
  id: number;
  name: string;
  last_accessed?: string;
}

interface AnalyticsData {
  total_files: number;
  by_type: Record<string, number>;
}

interface DuplicateFileGroup {
  id: number;
  name: string;
  similarityScore?: number;
}

interface DuplicateImageGroup {
  id: number;
  url: string;
}

const SmartOrganiser = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [cleanupFiles, setCleanupFiles] = useState<CleanupFile[]>([]);
  const [duplicateFiles, setDuplicateFiles] = useState<DuplicateFileGroup[][]>([]);
  const [similarFiles, setSimilarFiles] = useState<DuplicateFileGroup[][]>([]);
  const [duplicateImages, setDuplicateImages] = useState<DuplicateImageGroup[][]>([]);
  const [selectedMenu, setSelectedMenu] = useState('dashboard');

  useEffect(() => {
    getFileAnalytics().then(setAnalytics);
    getCleanupRecommendations().then(setCleanupFiles);
    getDuplicateFiles().then(data => setDuplicateFiles(Array.isArray(data.duplicates) ? data.duplicates : []));
    getSimilarFiles().then(data => setSimilarFiles(Array.isArray(data.similar) ? data.similar : []));
    getDuplicateImages().then(data => setDuplicateImages(Array.isArray(data.duplicates) ? data.duplicates : []));
  }, []);

  const handleOrganise = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    const token = localStorage.getItem('token');

    if (!token) {
      setError("Authentication token not found.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/onedrive/smart_organise', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ strategy: 'by_file_type' })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to organise files.');
      }

      setResult(data.summary);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/files/${id}`, { method: 'DELETE' });
    setCleanupFiles(files => files.filter(f => f.id !== id));
  };

  const handleArchive = async (id: number) => {
    await fetch(`/api/files/${id}/archive`, { method: 'POST' });
    setCleanupFiles(files => files.filter(f => f.id !== id));
  };

  const handleIgnore = async (id: number) => {
    await fetch(`/api/files/${id}/ignore`, { method: 'POST' });
    setCleanupFiles(files => files.filter(f => f.id !== id));
  };

  const handleSaveRule = async (rule: any) => {
    await createRule(rule);
    // Optionally refresh rules list
  };

  return (
    <Grid container>
      <Grid item xs={3}>
        <SmartOrganiserMenu selected={selectedMenu} onSelect={setSelectedMenu} />
      </Grid>
      <Grid item xs={9}>
        <Box sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>Smart Organiser</Typography>
          <Typography paragraph>
            Automatically organise your files into folders based on their type (e.g., Documents, Images, Videos).
          </Typography>
          <Button variant="contained" onClick={handleOrganise} disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Organise My Files'}
          </Button>
          {result && (
            <Alert severity="success" sx={{ mt: 2 }}>
              Organisation complete! Moved: {result.moved}, Errors: {result.errors}.
            </Alert>
          )}
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
          {selectedMenu === 'dashboard' && <AnalyticsDashboard data={analytics} />}
          {selectedMenu === 'cleanup' && <CleanupRecommendations files={cleanupFiles} onDelete={handleDelete} onArchive={handleArchive} onIgnore={handleIgnore} />}
          {selectedMenu === 'duplicates' && Array.isArray(duplicateFiles) && duplicateFiles.map((group, i) => <SimilarFilesGroup key={i} files={group} />)}
          {selectedMenu === 'similar' && Array.isArray(similarFiles) && similarFiles.map((group, i) => <SimilarFilesGroup key={i} files={group} />)}
          {selectedMenu === 'images' && Array.isArray(duplicateImages) && duplicateImages.map((group, i) => <DuplicateImagesGroup key={i} images={group} />)}
          {selectedMenu === 'rules' && <RuleBuilder onSave={handleSaveRule} />}
        </Box>
      </Grid>
    </Grid>
  );
};

export default SmartOrganiser; 