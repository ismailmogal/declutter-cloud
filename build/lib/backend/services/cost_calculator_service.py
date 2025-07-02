from typing import Dict, Any

class CostCalculatorService:
    def __init__(self):
        # Storage costs per GB per month for different providers
        self.storage_costs = {
            'onedrive': 0.0069,  # per GB per month
            'google_drive': 0.0199,  # per GB per month
            'dropbox': 0.0059,  # per GB per month
            'icloud': 0.0198,  # per GB per month
            'amazon_drive': 0.0119,  # per GB per month
            'box': 0.0042,  # per GB per month
        }
    
    def calculate_storage_cost(self, size_gb: float, provider: str) -> float:
        """Calculate storage cost for different providers"""
        cost_per_gb = self.storage_costs.get(provider.lower(), 0.01)  # Default to $0.01/GB
        return size_gb * cost_per_gb
    
    def calculate_savings(self, current_cost: float, optimized_cost: float) -> float:
        """Calculate cost savings"""
        return current_cost - optimized_cost
    
    def calculate_monthly_savings(self, duplicate_size_gb: float, provider: str) -> float:
        """Calculate monthly savings from removing duplicates"""
        return self.calculate_storage_cost(duplicate_size_gb, provider)
    
    def calculate_yearly_savings(self, duplicate_size_gb: float, provider: str) -> float:
        """Calculate yearly savings from removing duplicates"""
        monthly_savings = self.calculate_monthly_savings(duplicate_size_gb, provider)
        return monthly_savings * 12
    
    def get_provider_costs(self) -> Dict[str, float]:
        """Get all provider costs for comparison"""
        return self.storage_costs.copy()
    
    def calculate_optimization_potential(self, file_sizes: Dict[str, float], provider: str) -> Dict[str, Any]:
        """Calculate optimization potential for different strategies"""
        total_size_gb = sum(file_sizes.values())
        
        # Different optimization strategies and their savings percentages
        strategies = {
            'compression': 0.3,  # 30% savings
            'deduplication': 0.15,  # 15% savings (typical duplicate rate)
            'archiving': 0.5,  # 50% savings (cold storage)
            'cleanup': 0.2,  # 20% savings (removing unnecessary files)
        }
        
        potential_savings = {}
        for strategy, savings_rate in strategies.items():
            savings_gb = total_size_gb * savings_rate
            monthly_savings = self.calculate_storage_cost(savings_gb, provider)
            yearly_savings = monthly_savings * 12
            
            potential_savings[strategy] = {
                'savings_gb': savings_gb,
                'monthly_savings': monthly_savings,
                'yearly_savings': yearly_savings,
                'savings_percentage': savings_rate * 100
            }
        
        return potential_savings
    
    def calculate_roi(self, optimization_cost: float, yearly_savings: float) -> Dict[str, Any]:
        """Calculate Return on Investment for optimization"""
        if optimization_cost == 0:
            return {
                'roi_percentage': float('inf'),
                'payback_months': 0,
                'net_savings': yearly_savings
            }
        
        roi_percentage = ((yearly_savings - optimization_cost) / optimization_cost) * 100
        payback_months = (optimization_cost / yearly_savings) * 12 if yearly_savings > 0 else float('inf')
        net_savings = yearly_savings - optimization_cost
        
        return {
            'roi_percentage': roi_percentage,
            'payback_months': payback_months,
            'net_savings': net_savings
        } 