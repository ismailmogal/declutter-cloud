from database import SessionLocal
from models import CloudConnection, User

db = SessionLocal()
# Deactivate or delete the connection for user_id=1
conn = db.query(User).filter_by(id=2).first()
if conn:
    db.delete(conn) 
    db.commit()
    print("Deleted OneDrive connection for user_id=1")
else:
    print("No OneDrive connection for user_id=1")