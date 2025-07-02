from backend.models import File, User
from sqlalchemy.orm import Session
from collections import Counter
import os

def get_file_analytics_service(current_user: User, db: Session):
    files = db.query(File).filter_by(user_id=current_user.id).all()
    total_files = len(files)
    by_type = Counter()
    for f in files:
        ext = os.path.splitext(f.name)[1].lower() or 'Other'
        by_type[ext] += 1
    return {"total_files": total_files, "by_type": dict(by_type)} 