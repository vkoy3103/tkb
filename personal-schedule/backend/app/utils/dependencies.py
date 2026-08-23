"""Dependency chung cho auth (OAuth2 bearer)."""
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
