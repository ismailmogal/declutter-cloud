import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Checkbox, Tooltip, Stack, Paper, CircularProgress, IconButton } from '@mui/material';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ImageIcon from '@mui/icons-material/Image';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { getImageDownloadUrls } from '../api/images';

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

interface DuplicateImagesGroupProps {
  images: DuplicateImage[];
  onDeleteSelected?: (ids: number[]) => void;
}

const isProtectedUrl = (url: string) => url.startsWith('/api/files/') && url.includes('/download');

const DuplicateImagesGroup: React.FC<DuplicateImagesGroupProps> = ({ images, onDeleteSelected }) => {
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [imageUrls, setImageUrls] = useState<Record<number, string>>({});
  const [loadingUrls, setLoadingUrls] = useState<Record<number, boolean>>({});
  const [showImages, setShowImages] = useState(false);
  const [broken, setBroken] = useState<Record<number, boolean>>({});

  // Always fetch protected images as blobs with auth header
  useEffect(() => {
    if (!showImages) return;
    images.forEach(img => {
      const protectedUrl = `/api/files/${img.id}/download`;
      if (!imageUrls[img.id]) {
        setLoadingUrls(prev => ({ ...prev, [img.id]: true }));
        const fetchImg = async () => {
          try {
            const token = localStorage.getItem('token');
            const res = await fetch(protectedUrl, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch image');
            const blob = await res.blob();
            setImageUrls(prev => ({ ...prev, [img.id]: URL.createObjectURL(blob) }));
          } catch {
            setBroken(prev => ({ ...prev, [img.id]: true }));
          } finally {
            setLoadingUrls(prev => ({ ...prev, [img.id]: false }));
          }
        };
        fetchImg();
      }
    });
    // Cleanup blob URLs on unmount
    return () => {
      Object.values(imageUrls).forEach(url => {
        if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showImages, images]);

  const handleShowImages = async () => {
    setShowImages(v => !v);
    // Optionally, trigger download URL fetch for OneDrive images here if needed
  };

  const handleImgError = (id: number) => {
    setBroken(prev => ({ ...prev, [id]: true }));
  };

  if (!images.length) {
    return <Typography sx={{ mt: 2 }}>No duplicate images in this group.</Typography>;
  }

  const handleSelect = (id: number) => {
    setSelected(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDelete = () => {
    if (onDeleteSelected) {
      const ids = Object.keys(selected).filter(id => selected[Number(id)]).map(Number);
      onDeleteSelected(ids);
      setSelected({});
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Box sx={{ border: '1px solid #f99', borderRadius: 2, m: 1, p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle1">
          Duplicate Images ({images.length} files)
        </Typography>
        <Button
          variant="outlined"
          size="small"
          onClick={handleShowImages}
          startIcon={<ImageIcon />}
        >
          {showImages ? 'Hide Images' : 'Show Images'}
        </Button>
      </Box>
      
      <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ mb: 2, flexWrap: 'wrap' }}>
        {images.map(img => (
          <Paper key={img.id} elevation={2} sx={{ p: 2, minWidth: 200, maxWidth: 300 }}>
            {/* Path above image */}
            {img.path && (
              <Typography variant="caption" sx={{ display: 'block', mb: 1, wordBreak: 'break-all', color: '#888' }}>
                {img.path}
              </Typography>
            )}
            
            {/* Image display when showImages is true */}
            {showImages && (
              <Box sx={{ mb: 2, textAlign: 'center' }}>
                {loadingUrls[img.id] ? (
                  <Box sx={{ width: 140, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CircularProgress size={40} />
                  </Box>
                ) : (
                  <Box sx={{ position: 'relative', width: 140, height: 140, mx: 'auto' }}>
                    {broken[img.id] ? (
                      <Box sx={{ width: '100%', height: '100%', bgcolor: '#eee', border: '2px solid #eee', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: 14 }}>
                        Broken image
                      </Box>
                    ) : (
                      <>
                        <img
                          src={imageUrls[img.id] || ''}
                          alt={img.name || `Duplicate ${img.id}`}
                          style={{ 
                            width: '100%', 
                            height: '100%', 
                            objectFit: 'cover', 
                            border: selected[img.id] ? '2px solid #1976d2' : '2px solid #eee', 
                            borderRadius: 8, 
                            cursor: 'pointer', 
                            transition: 'border 0.2s' 
                          }}
                          onError={() => handleImgError(img.id)}
                        />
                        {imageUrls[img.id] && (
                          <IconButton
                            size="small"
                            sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(255,255,255,0.7)' }}
                            href={imageUrls[img.id] || ''}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                          >
                            <OpenInNewIcon fontSize="small" />
                          </IconButton>
                        )}
                      </>
                    )}
                  </Box>
                )}
              </Box>
            )}
            
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <ImageIcon sx={{ mr: 1, color: '#1976d2' }} />
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                {img.name || `Image ${img.id}`}
              </Typography>
            </Box>
            
            <Box sx={{ mb: 1 }}>
              {img.size && (
                <Typography variant="caption" sx={{ display: 'block', color: '#666' }}>
                  Size: {formatFileSize(img.size)}
                </Typography>
              )}
              {img.last_modified && (
                <Typography variant="caption" sx={{ display: 'block', color: '#666' }}>
                  Modified: {new Date(img.last_modified).toLocaleDateString()}
                </Typography>
              )}
              <Typography variant="caption" sx={{ display: 'block', color: '#666' }}>
                Provider: {img.provider}
              </Typography>
              {img.has_cached_url && (
                <Typography variant="caption" sx={{ display: 'block', color: '#4caf50' }}>
                  ✓ Cached
                </Typography>
              )}
            </Box>
            
            {/* Checkbox */}
            <Checkbox
              checked={!!selected[img.id]}
              onChange={() => handleSelect(img.id)}
              sx={{ color: '#1976d2' }}
            />
          </Paper>
        ))}
      </Stack>
      
      <Button
        variant="contained"
        color="error"
        size="small"
        disabled={Object.values(selected).every(v => !v)}
        onClick={handleDelete}
      >
        Delete Selected ({Object.values(selected).filter(Boolean).length})
      </Button>
    </Box>
  );
};

export default DuplicateImagesGroup; 