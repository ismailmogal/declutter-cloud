import apiClient from './api';

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`
});

export interface FileCategorization {
  file_id: number;
  file_name: string;
  categories: {
    type: string;
    category: string;
    tags: string[];
    priority: string;
    lifecycle: string;
  };
}

export interface UsageAnalysis {
  total_files: number;
  total_size_gb: number;
  type_distribution: Record<string, number>;
  category_distribution: Record<string, number>;
  age_distribution: {
    recent: number;
    monthly: number;
    yearly: number;
    old: number;
  };
  growth_prediction: {
    current_gb: number;
    daily_growth_gb: number;
    monthly_growth_gb: number;
    yearly_growth_gb: number;
    predicted_1_month_gb: number;
    predicted_3_months_gb: number;
    predicted_1_year_gb: number;
  };
}

export interface CleanupRecommendation {
  file_id: number;
  file_name: string;
  file_size_gb: number;
  score: number;
  reasons: string[];
  action: 'delete' | 'archive';
}

export interface SmartFolderSuggestion {
  name: string;
  type: 'category' | 'file_type' | 'date';
  file_count: number;
  total_size_gb: number;
  files: number[];
}

export interface StorageForecast {
  current_analysis: UsageAnalysis;
  recommendations: CleanupRecommendation[];
}

export interface BulkOrganizationResult {
  organized_files: {
    file_id: number;
    file_name: string;
    old_path: string;
    new_path: string;
    categories: any;
  }[];
  total_files_processed: number;
  files_to_move: number;
}

export interface AIFeaturesStatus {
  ai_access: boolean;
  subscription_plan: string;
  available_features: string[];
  current_usage: {
    storage_used_gb: number;
    files_processed: number;
    duplicates_found: number;
    storage_saved_gb: number;
    api_calls: number;
  };
  upgrade_required: boolean;
}

export const aiApi = {
  // Analyze usage patterns
  analyzeUsage: async (): Promise<UsageAnalysis> => {
    const response = await apiClient.get('/ai/analyze-usage');
    return response.data.data;
  },

  // Get cleanup recommendations
  getCleanupRecommendations: async (): Promise<CleanupRecommendation[]> => {
    const response = await apiClient.get('/ai/cleanup-recommendations');
    return response.data.data;
  },

  // Get smart folder suggestions
  getSmartFolders: async (): Promise<SmartFolderSuggestion[]> => {
    const response = await apiClient.get('/ai/smart-folders');
    return response.data.data;
  },

  // Categorize files
  categorizeFiles: async (fileIds: number[]): Promise<FileCategorization[]> => {
    const response = await apiClient.post('/ai/categorize-files', {
      file_ids: fileIds,
    });
    return response.data.data;
  },

  // Get storage forecast
  getStorageForecast: async (): Promise<StorageForecast> => {
    const response = await apiClient.get('/ai/storage-forecast');
    return response.data.data;
  },

  // Bulk organize files
  bulkOrganize: async (organizationRules: Record<string, any>): Promise<BulkOrganizationResult> => {
    const response = await apiClient.post('/ai/bulk-organize', organizationRules);
    return response.data.data;
  },

  // Get AI features status
  getAIFeaturesStatus: async (): Promise<AIFeaturesStatus> => {
    const response = await apiClient.get('/ai/ai-features-status');
    return response.data.data;
  },
};

export const getFolderSuggestions = async (fileId: number) => {
  const res = await apiClient.post('/api/ai/folder-suggestions', { file_id: fileId }, { headers: authHeaders() });
  return res.data;
};

export const acceptFolderSuggestion = async (fileId: number, folderId: string) => {
  const res = await apiClient.post('/api/ai/accept-suggestion', { file_id: fileId, folder_id: folderId }, { headers: authHeaders() });
  return res.data;
};

export const ignoreFolderSuggestion = async (fileId: number, folderId: string) => {
  const res = await apiClient.post('/api/ai/ignore-suggestion', { file_id: fileId, folder_id: folderId }, { headers: authHeaders() });
  return res.data;
}; 