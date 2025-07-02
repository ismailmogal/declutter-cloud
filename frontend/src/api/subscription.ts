import apiClient from './api';

export interface SubscriptionPlan {
  name: string;
  price: number;
  billing_cycle: string;
  features: string[];
  limits: {
    storage_limit_gb: number;
    cloud_providers: number;
    files_per_month: number;
    api_calls_per_month: number;
    retention_days: number;
  };
}

export interface SubscriptionAnalytics {
  subscription?: {
    id: number;
    plan_type: string;
    status: string;
    current_period_start: string;
    current_period_end: string;
  };
  current_usage: {
    storage_used_gb: number;
    files_processed: number;
    duplicates_found: number;
    storage_saved_gb: number;
    api_calls: number;
  };
  plan_limits: {
    storage_limit_gb: number;
    cloud_providers: number;
    files_per_month: number;
    api_calls_per_month: number;
    retention_days: number;
    features: string[];
  };
  usage_percentages: {
    storage_used_gb: number;
    files_processed: number;
    api_calls: number;
  };
  storage_savings: number;
  cost_savings: number;
}

export interface UsageHistory {
  storage_used_gb: number;
  files_processed: number;
  duplicates_found: number;
  storage_saved_gb: number;
  api_calls: number;
}

export interface CheckoutSession {
  checkout_url: string;
  session_id: string;
}

export const subscriptionApi = {
  // Get current subscription and usage
  getCurrentSubscription: async (): Promise<SubscriptionAnalytics> => {
    const response = await apiClient.get('/subscription/current');
    return response.data.data;
  },

  // Get available subscription plans
  getAvailablePlans: async (): Promise<Record<string, SubscriptionPlan>> => {
    const response = await apiClient.get('/subscription/plans');
    return response.data.data;
  },

  // Create checkout session for subscription
  createCheckoutSession: async (planType: string): Promise<CheckoutSession> => {
    const response = await apiClient.post('/subscription/create-checkout-session', {
      plan_type: planType,
    });
    return response.data.data;
  },

  // Cancel current subscription
  cancelSubscription: async (): Promise<{ subscription_id: number; status: string }> => {
    const response = await apiClient.post('/subscription/cancel');
    return response.data.data;
  },

  // Get usage history
  getUsageHistory: async (): Promise<UsageHistory> => {
    const response = await apiClient.get('/subscription/usage');
    return response.data.data;
  },
}; 