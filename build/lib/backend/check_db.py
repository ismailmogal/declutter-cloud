from database import SessionLocal
from models import User, CloudConnection, File

def main():
    db = SessionLocal()
    print("Users:")
    for user in db.query(User).all():
        print(f"id={user.id}, email={user.email}, provider={user.provider}, provider_id={user.provider_id}")

    print("\nCloud Connections:")
    for conn in db.query(CloudConnection).all():
        print(f"id={conn.id}, user_id={conn.user_id}, provider={conn.provider}, provider_user_email={conn.provider_user_email}, is_active={conn.is_active}")

    print("\nFiles (sample):")
    for f in db.query(File).limit(10).all():
        print(f"id={f.id}, user_id={f.user_id}, cloud_id={f.cloud_id}, provider={f.provider}, name={f.name}, path={f.path}")

if __name__ == "__main__":
    main() 