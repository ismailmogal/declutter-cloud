class MergeStrategyService:
    def determine_optimal_merge(self, duplicate_group: dict):
        """Determine optimal merge strategy"""
        strategies = {
            'keep_largest': self.keep_largest_file,
            'keep_most_recent': self.keep_most_recent,
            'keep_primary_cloud': self.keep_primary_cloud,
            'user_choice': self.user_choice
        }
        factors = self.analyze_merge_factors(duplicate_group)
        return strategies[factors['recommended_strategy']]

    def analyze_merge_factors(self, duplicate_group: dict):
        files = duplicate_group['files']
        return {
            'file_sizes': [f['size'] for f in files],
            'modification_dates': [f['last_modified'] for f in files],
            'cloud_providers': [f['cloud_provider'] for f in files],
            'access_patterns': [f.get('access_count', 0) for f in files],
            'recommended_strategy': self.calculate_best_strategy(files)
        }

    def calculate_best_strategy(self, files):
        # Placeholder: always keep largest for now
        return 'keep_largest'

    def keep_largest_file(self, group):
        # Placeholder logic
        return {'action': 'keep_largest', 'result': group}

    def keep_most_recent(self, group):
        return {'action': 'keep_most_recent', 'result': group}

    def keep_primary_cloud(self, group):
        return {'action': 'keep_primary_cloud', 'result': group}

    def user_choice(self, group):
        return {'action': 'user_choice', 'result': group} 