import os

def debug_log(*args):
    DEBUG = os.getenv("DEBUG", "false").lower() == "true"
    if DEBUG:
        print("[DEBUG]", *args) 