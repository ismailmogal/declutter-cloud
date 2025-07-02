from backend.services.onedrive_service import (
    start_onedrive_login, handle_onedrive_callback
)
from backend.services.google_service import (
    start_google_login, handle_google_callback
)
from backend.services.dropbox_service import (
    start_dropbox_login, handle_dropbox_callback
)
from backend.services.icloud_service import (
    start_icloud_login, handle_icloud_callback
)
# from backend.services.dropbox_service import start_dropbox_login, handle_dropbox_callback
# Add more as needed

CLOUD_PROVIDER_REGISTRY = {
    "onedrive": {
        "start_login": start_onedrive_login,
        "handle_callback": handle_onedrive_callback,
    },
    "googledrive": {
        "start_login": start_google_login,
        "handle_callback": handle_google_callback,
    },
    "dropbox": {
        "start_login": start_dropbox_login,
        "handle_callback": handle_dropbox_callback,
    },
    "icloud": {
        "start_login": start_icloud_login,
        "handle_callback": handle_icloud_callback,
    },
    # Add more providers here
}

def get_provider_service(provider: str):
    return CLOUD_PROVIDER_REGISTRY.get(provider) 