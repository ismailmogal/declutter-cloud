import { useState, useEffect } from 'react';
import { Button, Box, Typography, CircularProgress, Alert, Grid, Snackbar } from '@mui/material';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import CleanupRecommendations from '../components/CleanupRecommendations';
import RuleBuilder from '../components/RuleBuilder';
import SimilarFilesGroup from '../components/SimilarFilesGroup';
import DuplicateImagesGroup from '../components/DuplicateImagesGroup';
import SmartOrganiserMenu from '../components/SmartOrganiserMenu';
import { getFileAnalytics } from '../api/analytics';
import { getCleanupRecommendations, deleteFiles } from '../api/files';
import { getDuplicateFiles, getSimilarFiles } from '../api/duplicates';
import { getDuplicateImages } from '../api/images';
import { createRule } from '../api/rules';
import FileGroupList, { type FileGroupFile } from '../components/SimilarFilesGroup';
import apiClient from '../api/api';

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

interface DuplicateImage {
  id: number;
  cloud_id: string;
  provider: string;
  name?: string;
  size?: number;
  path?: string;
  last_modified?: string;
  has_cached_url?: boolean;
}

interface SimilarFile {
  id: number;
  name: string;
  size?: number;
  path?: string;
  provider?: string;
  last_modified?: string;
}

interface SimilarFilesGroupProps {
  files: SimilarFile[];
  onDeleteSelected?: (ids: number[]) => void;
}

interface Rule {
  field: string;
  condition: string;
  value: string;
}

interface Suggestion {
  id: string;
  name: string;
  reason: string;
}

const menuDescriptions: Record<string, string> = {
  dashboard: "See an overview of your files and storage usage.",
  organise: "Automatically sort your files into folders by type.",
  cleanup: "Get recommendations to clean up unused or large files.",
  duplicates: "Find and manage duplicate files to free up space.",
  similar: "Identify and review similar files for possible cleanup.",
  images: "Detect and manage duplicate images in your storage.",
  rules: "Create custom rules to automate file organisation.",
};

const SmartOrganiser = () => {
  const [rules, setRules] = useState<Rule[]>([{ field: 'file_type', condition: 'equals', value: 'jpg' }]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [cleanupFiles, setCleanupFiles] = useState<CleanupFile[]>([]);
  const [duplicateFiles, setDuplicateFiles] = useState<FileGroupFile[][]>([]);
  const [similarFiles, setSimilarFiles] = useState<FileGroupFile[][]>([]);
  const [duplicateImages, setDuplicateImages] = useState<DuplicateImage[][]>([]);
  const [selectedMenu, setSelectedMenu] = useState('dashboard');
  const [snackbar, setSnackbar] = useState<{ open: boolean, message: string }>({ open: false, message: '' });

  useEffect(() => {
    getFileAnalytics().then(setAnalytics);
  }, []);

  useEffect(() => {
    if (selectedMenu === 'cleanup') {
      getCleanupRecommendations().then(setCleanupFiles);
    } else if (selectedMenu === 'duplicates') {
      getDuplicateFiles().then(data => setDuplicateFiles(Array.isArray(data.duplicates) ? data.duplicates : []));
    } else if (selectedMenu === 'similar') {
      getSimilarFiles().then(data => setSimilarFiles(Array.isArray(data.similar) ? data.similar : []));
    } else if (selectedMenu === 'images') {
      getDuplicateImages().then(data => setDuplicateImages(Array.isArray(data.duplicates) ? data.duplicates : []));
    }
  }, [selectedMenu]);

  const handleOrganise = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post('/api/onedrive/smart_organise', {
        rules: rules.map(({ field, condition, value }) => ({ field, condition, value }))
      });
      setSuggestions(response.data.suggestions || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to get suggestions.');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, action: 'delete' | 'archive' | 'ignore') => {
    try {
      switch (action) {
        case 'delete':
          await apiClient.delete(`/api/files/${id}`);
          break;
        case 'archive':
          await apiClient.post(`/api/files/${id}/archive`);
          break;
        case 'ignore':
          await apiClient.post(`/api/files/${id}/ignore`);
          break;
      }
      setSuggestions(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error(`Failed to ${action} file`, err);
    }
  };

  const handleBulkAction = async (action: 'delete' | 'archive' | 'ignore') => {
    setLoading(true);
    try {
      const ids = suggestions.map(s => s.id);
      await apiClient.post(`/api/files/${action}`, { file_ids: ids });
      setSuggestions([]);
    } catch (err) {
      console.error(`Failed to ${action} files`, err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    await apiClient.delete(`/api/files/${id}`);
    setCleanupFiles(files => files.filter(f => f.id !== id));
    setSnackbar({ open: true, message: 'File deleted!' });
  };

  const handleArchive = async (id: number) => {
    await apiClient.post(`/api/files/${id}/archive`);
    setCleanupFiles(files => files.filter(f => f.id !== id));
    setSnackbar({ open: true, message: 'File archived!' });
  };

  const handleIgnore = async (id: number) => {
    await apiClient.post(`/api/files/${id}/ignore`);
    setCleanupFiles(files => files.filter(f => f.id !== id));
    // No snackbar for ignore
  };

  const handleSaveRule = async (rule: any) => {
    await createRule(rule);
    // Optionally refresh rules list
  };

  const handleDeleteSimilarFiles = async (groupIdx: number, ids: number[]) => {
    await apiClient.post('/api/files/delete', {
      ids
    });
    setSimilarFiles(prev => prev.map((group, idx) =>
      idx === groupIdx ? group.filter(f => !ids.includes(f.id)) : group
    ));
    setSnackbar({ open: true, message: 'Files deleted successfully!' });
  };

  const handleDeleteDuplicateImages = async (groupIdx: number, ids: number[]) => {
    await deleteFiles(ids);
    setDuplicateImages(prev => prev.map((group, idx) =>
      idx === groupIdx ? group.filter(img => !ids.includes(img.id)) : group
    ));
    setSnackbar({ open: true, message: 'Images deleted successfully!' });
  };

  return (
    <Grid container>
      <Snackbar
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ open: false, message: '' })}
        message={snackbar.message}
      />
      <Grid item xs={3}>
        <SmartOrganiserMenu selected={selectedMenu} onSelect={setSelectedMenu} />
      </Grid>
      <Grid item xs={9}>
        <Box sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>Smart Organiser</Typography>
          <Typography paragraph>
            {menuDescriptions[selectedMenu] || "Smart Organiser helps you manage your files efficiently."}
          </Typography>
          {selectedMenu === 'dashboard' && <AnalyticsDashboard data={analytics} />}
          {selectedMenu === 'organise' && (
            <Box>
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
            </Box>
          )}
          {selectedMenu === 'cleanup' && <CleanupRecommendations files={cleanupFiles} onDelete={handleDelete} onArchive={handleArchive} onIgnore={handleIgnore} />}
          {selectedMenu === 'duplicates' && Array.isArray(duplicateFiles) && (
            <FileGroupList
              groups={duplicateFiles}
              groupType="duplicates"
              onDeleteSelected={undefined}
            />
          )}
          {selectedMenu === 'similar' && Array.isArray(similarFiles) && (
            <FileGroupList
              groups={similarFiles}
              groupType="similar"
              showSimilarityScore
              onDeleteSelected={handleDeleteSimilarFiles}
            />
          )}
          {selectedMenu === 'images' && Array.isArray(duplicateImages) && duplicateImages.map((group, i) => 
            <DuplicateImagesGroup
              key={i}
              images={group}
              onDeleteSelected={ids => handleDeleteDuplicateImages(i, ids)}
            />
          )}
          {selectedMenu === 'rules' && <RuleBuilder onSave={handleSaveRule} />}
        </Box>
      </Grid>
    </Grid>
  );
};

export default SmartOrganiser; 