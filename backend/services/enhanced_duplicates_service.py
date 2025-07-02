from typing import List, Dict
from backend.models import File

class EnhancedDuplicatesService:
    def find_cross_cloud_duplicates(self, user_id: int, db):
        """Find duplicates across all connected clouds"""
        # Get all files from all clouds (placeholder: implement actual logic)
        all_files = self.get_all_cloud_files(user_id, db)
        # Group by hash
        hash_groups = self.group_by_hash(all_files)
        # Find cross-cloud duplicates
        cross_cloud_duplicates = []
        for hash_value, files in hash_groups.items():
            if len(files) > 1:
                clouds = set(f['cloud_provider'] for f in files)
                if len(clouds) > 1:
                    cross_cloud_duplicates.append({
                        'hash': hash_value,
                        'files': files,
                        'clouds': list(clouds),
                        'total_size': sum(f['size'] for f in files),
                        'potential_savings': self.calculate_duplicate_savings(files)
                    })
        return cross_cloud_duplicates

    def get_all_cloud_files(self, user_id: int, db) -> List[Dict]:
        files = db.query(File).filter(File.user_id == user_id, File.is_deleted == False).all()
        return [
            {
                'id': f.id,
                'name': f.name,
                'size': f.size,
                'cloud_provider': f.cloud_provider if hasattr(f, 'cloud_provider') else f.provider,
                'provider': f.provider,
                'cloud_id': f.cloud_id,
                'hash': f.hash,
                'last_modified': f.last_modified,
            }
            for f in files
        ]

    def group_by_hash(self, files: List[Dict]) -> Dict[str, List[Dict]]:
        hash_groups = {}
        for f in files:
            h = f['hash']
            if h not in hash_groups:
                hash_groups[h] = []
            hash_groups[h].append(f)
        return hash_groups

    def calculate_duplicate_savings(self, files: List[Dict]) -> float:
        # Placeholder: calculate potential savings
        if not files:
            return 0.0
        # Savings = sum of all but one file's size
        return sum(f['size'] for f in files) - min(f['size'] for f in files)

    def merge_duplicates(self, duplicate_group: dict, target_cloud: str, db):
        # Soft-delete: set is_deleted=True for all but one file
        file_ids = [f['id'] for f in duplicate_group['files']]
        if not file_ids:
            return {'status': 'no files'}
        # Keep the first file, soft-delete others
        to_soft_delete = file_ids[1:]
        if to_soft_delete:
            db.query(File).filter(File.id.in_(to_soft_delete)).update({File.is_deleted: True}, synchronize_session=False)
            db.commit()
            # Actually remove from cloud providers
            files = [f for f in duplicate_group['files'] if f['id'] in to_soft_delete]
            for file in files:
                provider = file.get('provider') or file.get('cloud_provider')
                cloud_id = file.get('cloud_id')
                if provider and cloud_id:
                    self.delete_from_cloud(provider, cloud_id)
        return {'status': 'merged', 'kept': file_ids[0], 'soft_deleted': to_soft_delete}

    def delete_from_cloud(self, provider: str, cloud_id: str):
        if provider == 'onedrive':
            self.delete_onedrive_file(cloud_id)
        elif provider == 'googledrive':
            self.delete_google_file(cloud_id)
        elif provider == 'icloud':
            self.delete_icloud_file(cloud_id)
        elif provider == 'dropbox':
            self.delete_dropbox_file(cloud_id)
        # Add more providers as needed
        else:
            # Log or handle unknown provider
            print(f"[WARN] Unknown provider for deletion: {provider}")

    def delete_onedrive_file(self, cloud_id: str):
        # TODO: Implement actual OneDrive API deletion
        print(f"[MOCK] Deleting OneDrive file: {cloud_id}")

    def delete_google_file(self, cloud_id: str):
        # TODO: Implement actual Google Drive API deletion
        print(f"[MOCK] Deleting Google Drive file: {cloud_id}")

    def delete_icloud_file(self, cloud_id: str):
        # TODO: Implement actual iCloud API deletion
        print(f"[MOCK] Deleting iCloud file: {cloud_id}")

    def delete_dropbox_file(self, cloud_id: str):
        # TODO: Implement actual Dropbox API deletion
        print(f"[MOCK] Deleting Dropbox file: {cloud_id}") 