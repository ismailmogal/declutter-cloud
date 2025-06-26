import axios from 'axios';

export async function fetchRecursiveFiles(folderIds: string[], maxDepth: number, concurrent = true) {
  const { data } = await axios.post('/api/onedrive/recursive_files', {
    folder_ids: folderIds,
    max_depth: maxDepth,
    concurrent,
  });
  return data.files;
}

export async function startScanJob(folderIds: string[], maxDepth: number) {
  const { data } = await axios.post('/api/onedrive/scan_job', {
    folder_ids: folderIds,
    max_depth: maxDepth,
  });
  return data.job_id;
}

/**
 * Polls scan job status. Returns:
 *   - status: 'pending' | 'running' | 'complete' | 'cancelled' | 'error'
 *   - progress: number (0-100)
 *   - folders_visited: number
 *   - files_found: number
 *   - error: string | null
 *   - result: array (when complete)
 */
export async function pollScanJob(jobId: string) {
  const { data } = await axios.get(`/api/onedrive/scan_job/${jobId}/status`);
  return data;
}

/**
 * Cancels a running scan job.
 */
export async function cancelScanJob(jobId: string) {
  const { data } = await axios.post(`/api/onedrive/scan_job/${jobId}/cancel`);
  return data;
} 