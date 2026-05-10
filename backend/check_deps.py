import sys
import os

try:
    from jose import JWTError, jwt
    print("jose imported successfully")
except ImportError as e:
    print(f"jose import failed: {e}")

try:
    from passlib.context import CryptContext
    print("passlib imported successfully")
except ImportError as e:
    print(f"passlib import failed: {e}")

print(f"Python path: {sys.path}")
print(f"Executable: {sys.executable}")
