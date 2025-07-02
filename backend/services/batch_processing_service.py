class BatchProcessingService:
    def __init__(self, merge_strategy_service):
        self.merge_strategy_service = merge_strategy_service

    def process_duplicates_batch(self, user_id: int, duplicate_groups: list, db):
        """Process multiple duplicate groups in batch"""
        results = []
        for group in duplicate_groups:
            try:
                result = self.process_single_group(group, db)
                results.append(result)
            except Exception as e:
                results.append({
                    'group_id': group['hash'],
                    'status': 'failed',
                    'error': str(e)
                })
        return results

    def process_single_group(self, group: dict, db):
        strategy = self.merge_strategy_service.determine_optimal_merge(group)
        result = strategy(group)
        self.update_file_records(result, db)
        return result

    def update_file_records(self, result, db):
        # Placeholder: update file records in DB after merge
        pass 