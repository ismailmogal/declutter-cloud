from models import File, User
from sqlalchemy.orm import Session
from collections import defaultdict

IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.heic'}

def get_duplicate_images_service(current_user: User, db: Session):
    files = db.query(File).filter_by(user_id=current_user.id).all()
    image_files = [f for f in files if any(f.name.lower().endswith(ext) for ext in IMAGE_EXTENSIONS)]
    groups = defaultdict(list)
    for f in image_files:
        key = (f.name, f.size)
        groups[key].append({"id": f.id, "url": getattr(f, 'url', None), "name": f.name})
    duplicates = [group for group in groups.values() if len(group) > 1]
    return {"duplicates": duplicates} 