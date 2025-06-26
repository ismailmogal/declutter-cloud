from database import SessionLocal
from models import User, CloudConnection

def main():
    db = SessionLocal()
    print("Users:")
    for user in db.query(User).all():
        print(f"id={user.id}, email={user.email}, provider={user.provider}, provider_id={user.provider_id}")

    print("\nCloud Connections:")
    for conn in db.query(CloudConnection).all():
        print(f"id={conn.id}, user_id={conn.user_id}, provider={conn.provider}, provider_user_email={conn.provider_user_email}, is_active={conn.is_active}")

if __name__ == "__main__":
    main() 