"""
Microsoft SSO Endpoints for FastAPI/Flask
Add these routes to your main.py

These endpoints handle:
1. /api/auth/microsoft/login - Redirect to Microsoft login
2. /api/auth/microsoft/callback - Handle OAuth callback
3. /api/admin/users/sso/sync - Sync user from Azure AD
4. /api/admin/ad-groups - Manage AD group mappings
"""

import os
import json
import secrets
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, Header, HTTPException, Query
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

try:
    from .database import get_db
    from .models import UserProfile, MicrosoftADGroup, SSOToken
    from .auth import create_token, hash_password, decode_token
    from .microsoft_auth import get_microsoft_user_info, MicrosoftOAuthConfig, MicrosoftUserInfo
    from .config import settings
except ImportError:
    from backend.database import get_db
    from backend.models import UserProfile, MicrosoftADGroup, SSOToken
    from backend.auth import create_token, hash_password, decode_token
    from backend.microsoft_auth import get_microsoft_user_info, MicrosoftOAuthConfig, MicrosoftUserInfo
    from backend.config import settings

# Create router for SSO endpoints with v1 prefix
sso_router = APIRouter(prefix="/api/v1/auth", tags=["authentication"])


# ===== PYDANTIC MODELS =====

class MicrosoftLoginResponse(BaseModel):
    """Response for Microsoft login redirect"""
    auth_url: str
    state: str


class UserCreateFromSSO(BaseModel):
    """Create user from SSO data"""
    email: str
    name: str
    role: str = "viewer"
    scope_type: str = "branch"
    scope_value: str = "default"
    microsoft_id: str
    microsoft_upn: Optional[str] = None


class ADGroupMapping(BaseModel):
    """AD Group to App Role mapping"""
    ad_group_id: str
    ad_group_name: str
    app_role: str
    app_scope_type: str
    app_scope_value: str
    description: Optional[str] = None


class UserSyncRequest(BaseModel):
    """Request to sync user from SSO"""
    email: str
    sync_groups: bool = False


class MicrosoftCallbackRequest(BaseModel):
    """Callback payload for JS clients"""
    code: str
    state: Optional[str] = None


# ===== HELPER FUNCTIONS =====

def auth_header(authorization: Optional[str] = Header(default=None)) -> dict:
    """Decode Bearer token from Authorization header"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ", 1)[1]
    try:
        return decode_token(token)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc


def require_admin(payload: dict = Depends(auth_header)) -> dict:
    """Dependency: Require admin role"""
    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return payload


def _sso_flow_from_state(state: Optional[str]) -> str:
    """Return 'admin' or 'dashboard' based on OAuth state prefix."""
    if state and state.startswith("admin"):
        return "admin"
    return "dashboard"


def _sso_success_html(token: str, user_payload: dict, state: Optional[str]) -> HTMLResponse:
    flow = _sso_flow_from_state(state)
    role = user_payload.get("role")

    if flow == "admin" and role != "admin":
        msg = "This Microsoft account is not authorized for admin access."
        return _sso_error_html(msg, "/admin")

    redirect_to = "/admin" if flow == "admin" or role == "admin" else "/dashboard"
    token_json = json.dumps(token)
    user_json = json.dumps(user_payload)

    return HTMLResponse(
        content=f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Processing Login...</title></head>
<body>
  <h1>Processing your login...</h1>
  <script>
    sessionStorage.setItem('sobha_token', {token_json});
    sessionStorage.setItem('sobha_user_v5', JSON.stringify({user_json}));
    sessionStorage.setItem('sobha_user', JSON.stringify({user_json}));
    sessionStorage.removeItem('sobha_identity');
    window.location.href = {json.dumps(redirect_to)};
  </script>
</body>
</html>"""
    )


def _sso_error_html(message: str, back_url: str = "/") -> HTMLResponse:
    msg_json = json.dumps(message)
    back_json = json.dumps(back_url)
    return HTMLResponse(
        content=f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Authentication Error</title></head>
<body>
  <h1>Authentication Error</h1>
  <script>
    var dest = {back_json};
    if (dest.indexOf('/admin') === 0) {{
      window.location.replace(dest + (dest.indexOf('?') >= 0 ? '&' : '?') + 'login_error=' + encodeURIComponent({msg_json}));
    }} else {{
      window.location.replace(dest);
    }}
  </script>
  <p>{message}</p>
  <a href="{back_url}">Back</a>
</body>
</html>""",
        status_code=401,
    )


def get_or_create_user_from_sso(
    microsoft_user: MicrosoftUserInfo,
    db: Session,
    auto_create: bool = True
) -> Optional[UserProfile]:
    """
    Get or create user from Microsoft SSO data
    
    Strategy:
    1. Try to find by microsoft_id (most reliable)
    2. Try to find by email
    3. Create new user if auto_create=True
    """
    
    # Try to find by microsoft_id first (most reliable)
    if microsoft_user.id:
        user = db.query(UserProfile).filter(
            UserProfile.microsoft_id == microsoft_user.id
        ).first()
        if user:
            return user
    
    # Try to find by email
    if microsoft_user.email:
        user = db.query(UserProfile).filter(
            UserProfile.email == microsoft_user.email
        ).first()
        if user:
            # Update microsoft_id if not already set
            if not user.microsoft_id:
                user.microsoft_id = microsoft_user.id
            return user
    
    # Create new user if auto_create is enabled
    if auto_create:
        username = microsoft_user.email.split("@")[0]  # Use email prefix as username
        
        # Ensure unique username
        base_username = username
        counter = 1
        while db.query(UserProfile).filter(UserProfile.username == username).first():
            username = f"{base_username}{counter}"
            counter += 1
        
        user = UserProfile(
            username=username,
            email=microsoft_user.email,
            name=microsoft_user.display_name or username,
            password_hash="",  # No password for SSO users
            auth_provider="microsoft",
            microsoft_id=microsoft_user.id,
            microsoft_upn=microsoft_user.email,
            sso_enabled=True,
            role=settings.sso_default_role,
            scope_type=settings.sso_default_scope_type,
            scope_value=settings.sso_default_scope_value,
            # Explicitly set timestamps (SQLite compatibility)
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            last_login_at=datetime.utcnow(),
            last_login_method="microsoft",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    
    return None


# ===== SSO ENDPOINTS =====

@sso_router.get("/microsoft/login")
async def microsoft_login(state: Optional[str] = None) -> MicrosoftLoginResponse:
    """
    Step 1: Redirect user to Microsoft login page
    
    Returns: { auth_url, state }
    Client should redirect to auth_url and capture the auth code
    """
    # Generate state for CSRF protection (prefix identifies return flow)
    if not state:
        state = f"dashboard:{secrets.token_urlsafe(24)}"
    
    config = MicrosoftOAuthConfig()
    auth_url = config.get_auth_url(state)
    
    return MicrosoftLoginResponse(auth_url=auth_url, state=state)


@sso_router.get("/microsoft/callback")
async def microsoft_callback_get(
    code: str = Query(..., description="Authorization code from Microsoft"),
    state: str = Query(..., description="State parameter for CSRF validation"),
    db: Session = Depends(get_db)
):
    """
    Step 2: Handle Microsoft OAuth callback (GET from browser redirect)
    
    This endpoint handles the browser redirect from Microsoft.
    Returns an HTML page that stores the token in sessionStorage and redirects to dashboard.
    
    Flow:
    1. Exchange code for access token
    2. Fetch user info from Microsoft Graph API
    3. Find or create user in database
    4. Update last login
    5. Issue JWT token
    6. Return HTML with redirect to dashboard
    """
    try:
        # Get user info from Microsoft
        microsoft_user = await get_microsoft_user_info(code)
        
        # Get or create user
        user = get_or_create_user_from_sso(
            microsoft_user,
            db,
            auto_create=settings.sso_auto_create_users
        )
        
        if not user:
            return _sso_error_html("User not found and auto-creation is disabled", "/admin" if _sso_flow_from_state(state) == "admin" else "/")
        
        # Check if SSO is enabled for this user
        if not user.sso_enabled:
            back = "/admin" if _sso_flow_from_state(state) == "admin" else "/"
            return _sso_error_html(
                "SSO is not enabled for this user. Please contact administrator.",
                back,
            )
        
        # Update user info if sync is enabled
        if settings.sso_sync_user_info_on_login:
            user.name = microsoft_user.display_name or user.name
            user.email = microsoft_user.email or user.email
            user.microsoft_upn = microsoft_user.email
            user.sso_synced_at = datetime.utcnow()
            user.updated_at = datetime.utcnow()  # Explicit for SQLite
        
        # Update last login
        user.last_login_at = datetime.utcnow()
        user.last_login_method = "microsoft"
        user.updated_at = datetime.utcnow()  # Always update timestamp on login
        
        db.commit()
        db.refresh(user)
        
        # Issue JWT token
        token = create_token(user.username, user.role)
        user_payload = {
            "username": user.username,
            "name": user.name,
            "role": user.role,
            "scope_type": user.scope_type,
            "scope_value": user.scope_value,
            "email": user.email,
        }

        return _sso_success_html(token, user_payload, state)

    except Exception as e:
        back = "/admin" if _sso_flow_from_state(state) == "admin" else "/"
        return _sso_error_html(f"Microsoft authentication failed: {str(e)}", back)


@sso_router.post("/microsoft/callback")
async def microsoft_callback_post(
    body: Optional[MicrosoftCallbackRequest] = None,
    code: Optional[str] = Query(None, description="Authorization code from Microsoft"),
    state: Optional[str] = Query(None, description="State parameter for CSRF validation"),
    db: Session = Depends(get_db)
):
    """
    Step 2: Handle Microsoft OAuth callback (POST from JavaScript client)
    
    Alternative endpoint for client-side callback handling.
    Returns JSON response with token.
    
    Flow:
    1. Exchange code for access token
    2. Fetch user info from Microsoft Graph API
    3. Find or create user in database
    4. Update last login
    5. Issue JWT token
    """
    try:
        auth_code = body.code if body else code
        if not auth_code:
            raise HTTPException(status_code=400, detail="Missing authorization code")

        # Get user info from Microsoft
        microsoft_user = await get_microsoft_user_info(auth_code)
        
        # Get or create user
        user = get_or_create_user_from_sso(
            microsoft_user,
            db,
            auto_create=settings.sso_auto_create_users
        )
        
        if not user:
            raise HTTPException(
                status_code=401,
                detail="User not found and auto-creation is disabled"
            )
        
        # Check if SSO is enabled for this user
        if not user.sso_enabled:
            raise HTTPException(
                status_code=403,
                detail="SSO is not enabled for this user. Please contact administrator."
            )
        
        # Update user info if sync is enabled
        if settings.sso_sync_user_info_on_login:
            user.name = microsoft_user.display_name or user.name
            user.email = microsoft_user.email or user.email
            user.microsoft_upn = microsoft_user.email
            user.sso_synced_at = datetime.utcnow()
            user.updated_at = datetime.utcnow()  # Explicit for SQLite
        
        # Update last login
        user.last_login_at = datetime.utcnow()
        user.last_login_method = "microsoft"
        user.updated_at = datetime.utcnow()  # Always update timestamp on login
        
        db.commit()
        db.refresh(user)
        
        # Issue JWT token
        token = create_token(user.username, user.role)

        flow = _sso_flow_from_state(body.state if body else state)
        if flow == "admin" and user.role != "admin":
            raise HTTPException(
                status_code=403,
                detail="This Microsoft account is not authorized for admin access.",
            )

        return {
            "token": token,
            "username": user.username,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "scope_type": user.scope_type,
            "scope_value": user.scope_value,
            "auth_provider": "microsoft",
            "message": "Successfully authenticated with Microsoft"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Microsoft authentication failed: {str(e)}")


@sso_router.post("/microsoft/user/sync")
async def sync_user_from_sso(
    email: str = Query(..., description="User email to sync"),
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin)
):
    """
    Admin endpoint: Manually sync user from SSO
    Updates user info from Microsoft Graph API
    """
    try:
        # Find user by email
        user = db.query(UserProfile).filter(UserProfile.email == email).first()
        if not user:
            raise HTTPException(status_code=404, detail=f"User not found: {email}")
        
        # If user doesn't have microsoft_id, we can't sync
        if not user.microsoft_id:
            raise HTTPException(
                status_code=400,
                detail=f"User {email} is not an SSO user (no microsoft_id)"
            )
        
        # Here you would fetch updated info from Microsoft Graph API
        # For now, just update the sync timestamp
        user.sso_synced_at = datetime.utcnow()
        db.commit()
        
        return {
            "message": f"User {email} synced successfully",
            "user": user.to_dict()
        }
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ===== AD GROUP MANAGEMENT =====

@sso_router.post("/admin/ad-groups", dependencies=[Depends(require_admin)])
async def create_ad_group_mapping(
    mapping: ADGroupMapping,
    db: Session = Depends(get_db)
):
    """Admin: Create mapping between Azure AD group and app role"""
    
    # Check if already exists
    existing = db.query(MicrosoftADGroup).filter(
        MicrosoftADGroup.ad_group_id == mapping.ad_group_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="AD group mapping already exists")
    
    ad_group = MicrosoftADGroup(
        ad_group_id=mapping.ad_group_id,
        ad_group_name=mapping.ad_group_name,
        app_role=mapping.app_role,
        app_scope_type=mapping.app_scope_type,
        app_scope_value=mapping.app_scope_value,
        description=mapping.description
    )
    
    db.add(ad_group)
    db.commit()
    db.refresh(ad_group)
    
    return {"message": "AD group mapping created", "data": ad_group.to_dict()}


@sso_router.get("/admin/ad-groups", dependencies=[Depends(require_admin)])
async def list_ad_groups(db: Session = Depends(get_db)):
    """Admin: List all AD group mappings"""
    groups = db.query(MicrosoftADGroup).filter(
        MicrosoftADGroup.is_active == True
    ).all()
    
    return {
        "count": len(groups),
        "groups": [g.to_dict() for g in groups]
    }


@sso_router.delete("/admin/ad-groups/{group_id}", dependencies=[Depends(require_admin)])
async def delete_ad_group_mapping(
    group_id: int,
    db: Session = Depends(get_db)
):
    """Admin: Delete AD group mapping"""
    group = db.query(MicrosoftADGroup).filter(
        MicrosoftADGroup.id == group_id
    ).first()
    
    if not group:
        raise HTTPException(status_code=404, detail="AD group mapping not found")
    
    group.is_active = False
    db.commit()
    
    return {"message": "AD group mapping deleted"}


# ===== USER MANAGEMENT WITH SSO =====

@sso_router.post("/admin/users/sso/enable")
async def enable_sso_for_user(
    username: str = Query(...),
    microsoft_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin)
):
    """Admin: Enable SSO for existing local user"""
    
    user = db.query(UserProfile).filter(UserProfile.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.sso_enabled = True
    if microsoft_id:
        user.microsoft_id = microsoft_id
    user.auth_provider = "both"  # Can use both local and SSO
    
    db.commit()
    db.refresh(user)
    
    return {
        "message": f"SSO enabled for user {username}",
        "user": user.to_dict()
    }


@sso_router.post("/admin/users/sso/disable")
async def disable_sso_for_user(
    username: str = Query(...),
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin)
):
    """Admin: Disable SSO for user (fall back to local auth)"""
    
    user = db.query(UserProfile).filter(UserProfile.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.sso_enabled = False
    if not user.password_hash:
        raise HTTPException(
            status_code=400,
            detail="Cannot disable SSO: user has no local password"
        )
    
    user.auth_provider = "local"
    db.commit()
    db.refresh(user)
    
    return {
        "message": f"SSO disabled for user {username}",
        "user": user.to_dict()
    }
