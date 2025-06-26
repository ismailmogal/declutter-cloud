from models import File, User
from sqlalchemy.orm import Session
from collections import defaultdict

def get_duplicate_files_service(current_user: User, db: Session):
    files = db.query(File).filter_by(user_id=current_user.id).all()
    groups = defaultdict(list)
    for f in files:
        key = (f.name, f.size)
        groups[key].append({"id": f.id, "name": f.name, "size": f.size})
    duplicates = [group for group in groups.values() if len(group) > 1]
    return {"duplicates": duplicates}

def get_similar_files_service(current_user: User, db: Session):
    files = db.query(File).filter_by(user_id=current_user.id).all()
    similar_groups = []
    used = set()
    for i, f1 in enumerate(files):
        if f1.id in used:
            continue
        group = [{"id": f1.id, "name": f1.name, "size": f1.size}]
        for f2 in files[i+1:]:
            if f2.id in used:
                continue
            # Simple similarity: substring in name
            if f1.name != f2.name and (f1.name in f2.name or f2.name in f1.name):
                group.append({"id": f2.id, "name": f2.name, "size": f2.size})
                used.add(f2.id)
        if len(group) > 1:
            similar_groups.append(group)
            for f in group:
                used.add(f["id"])
    return {"similar": similar_groups} 