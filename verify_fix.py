import requests
import sys
import time

BASE_URL = "http://localhost:8080"
USERNAME = "verify_user_final"
PASSWORD = "password123"
EMAIL = "verify_final@example.com"

def log(msg, status="INFO"):
    print(f"[{status}] {msg}")

def check_health():
    url = f"{BASE_URL}/actuator/health"
    try:
        res = requests.get(url)
        if res.status_code == 200:
            log(f"Health check PASSED: {res.json()}", "SUCCESS")
        else:
            log(f"Health check FAILED: {res.status_code}", "ERROR")
            sys.exit(1)
    except Exception as e:
        log(f"Health check EXCEPTION: {e}", "ERROR")
        sys.exit(1)

def check_unauthorized_access():
    url = f"{BASE_URL}/api/storage"
    try:
        res = requests.get(url)
        if res.status_code == 401:
            log(f"Unauthorized access check PASSED (Got 401 as expected)", "SUCCESS")
        else:
            log(f"Unauthorized access check FAILED: Got {res.status_code} but expected 401", "ERROR")
            sys.exit(1)
    except Exception as e:
        log(f"check_unauthorized_access EXCEPTION: {e}", "ERROR")
        sys.exit(1)

def register_and_login():
    # Register
    reg_url = f"{BASE_URL}/api/auth/register"
    try:
        requests.post(reg_url, json={"username": USERNAME, "password": PASSWORD, "email": EMAIL})
        # Ignore error if user already exists
    except:
        pass

    # Login
    auth_url = f"{BASE_URL}/api/auth/login"
    try:
        res = requests.post(auth_url, json={"username": USERNAME, "password": PASSWORD})
        if res.status_code == 200:
            token = res.json().get("token")
            log("Login PASSED, got token", "SUCCESS")
            return token
        else:
            log(f"Login FAILED: {res.status_code} - {res.text}", "ERROR")
            sys.exit(1)
    except Exception as e:
        log(f"Login EXCEPTION: {e}", "ERROR")
        sys.exit(1)

def check_authorized_access(token):
    url = f"{BASE_URL}/api/storage"
    headers = {"Authorization": f"Bearer {token}"}
    try:
        res = requests.get(url, headers=headers)
        if res.status_code == 200:
            log("Authorized access PASSED", "SUCCESS")
        else:
            log(f"Authorized access FAILED: {res.status_code}", "ERROR")
            sys.exit(1)
    except Exception as e:
        log(f"check_authorized_access EXCEPTION: {e}", "ERROR")
        sys.exit(1)

if __name__ == "__main__":
    print("Waiting for services to be ready...")
    # Retrying health check loop could be added here, but manual run assumes it's up.
    check_health()
    check_unauthorized_access()
    token = register_and_login()
    if token:
        check_authorized_access(token)

