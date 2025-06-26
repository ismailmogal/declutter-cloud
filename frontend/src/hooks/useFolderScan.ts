import { useState, useCallback, useRef } from 'react';
import { fetchRecursiveFiles, startScanJob, pollScanJob, cancelScanJob } from '../api/onedriveScan';
import { getCachedFiles, setCachedFiles, clearCacheForFolder } from '../utils/onedriveCache';

export function useFolderScan(userId: string) {
  const [progress, setProgress] = useState<number | null>(null);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'job' | 'done' | 'error' | 'cancelled'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [foldersVisited, setFoldersVisited] = useState<number>(0);
  const [filesFound, setFilesFound] = useState<number>(0);
  const jobIdRef = useRef<string | null>(null);

  // Main scan function
  const scanFolder = useCallback(async (folderId: string, depth: number, forceRefresh = false) => {
    setStatus('scanning');
    setProgress(null);
    setError(null);
    setIsCancelling(false);
    setFoldersVisited(0);
    setFilesFound(0);
    jobIdRef.current = null;

    // 1. Check cache
    if (!forceRefresh) {
      const cached = await getCachedFiles(userId, folderId, depth);
      if (cached && Date.now() - cached.timestamp < 1000 * 60 * 60) { // 1 hour freshness
        setStatus('done');
        return cached.files;
      }
    }

    // 2. Try backend recursive API first
    try {
      const files = await fetchRecursiveFiles([folderId], depth);
      await setCachedFiles(userId, folderId, depth, files, { source: 'backend-recursive' });
      setStatus('done');
      return files;
    } catch (err: any) {
      // If too large, backend may suggest using job API
      if (err.response && err.response.status === 413) {
        setStatus('job');
        // 3. Start job-based scan
        const jobId = await startScanJob([folderId], depth);
        jobIdRef.current = jobId;
        let jobStatus;
        do {
          await new Promise(res => setTimeout(res, 1000));
          jobStatus = await pollScanJob(jobId);
          setProgress(jobStatus.progress);
          setFoldersVisited(jobStatus.folders_visited || 0);
          setFilesFound(jobStatus.files_found || 0);
          if (jobStatus.status === 'cancelled') {
            setStatus('cancelled');
            setError(jobStatus.error || 'Scan job cancelled');
            throw new Error(jobStatus.error || 'Scan job cancelled');
          }
          if (jobStatus.status === 'error') {
            setStatus('error');
            setError(jobStatus.error || 'Scan job failed');
            throw new Error(jobStatus.error || 'Scan job failed');
          }
        } while (jobStatus.status !== 'complete');
        if (jobStatus.status === 'complete') {
          await setCachedFiles(userId, folderId, depth, jobStatus.result, { source: 'backend-job' });
          setStatus('done');
          return jobStatus.result;
        }
      } else {
        setStatus('error');
        setError('Scan failed: ' + (err.message || 'Unknown error'));
        throw err;
      }
    }
  }, [userId]);

  // Cancel scan job
  const cancelScan = useCallback(async () => {
    if (!jobIdRef.current) return;
    setIsCancelling(true);
    try {
      await cancelScanJob(jobIdRef.current);
    } catch (e) {
      // Ignore error, job may already be finished
    }
  }, []);

  return {
    scanFolder,
    progress,
    status,
    error,
    isCancelling,
    foldersVisited,
    filesFound,
    cancelScan,
    clearCache: clearCacheForFolder
  };
} 