from fastapi.responses import JSONResponse
from config import sessions

def get_me_service(request):
    session_id = request.query_params.get("session_id")
    if not session_id or session_id not in sessions:
        return JSONResponse(status_code=401, content={"error": "Not authenticated"})
    return sessions[session_id] 