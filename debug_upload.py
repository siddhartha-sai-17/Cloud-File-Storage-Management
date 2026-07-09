import requests
import uuid
import hashlib

BASE_URL = "http://localhost:8080/api"

# Login/Register
username = "debug_user_" + uuid.uuid4().hex[:6]
password = "Password123!"
email = username + "@test.com"

requests.post(f"{BASE_URL}/auth/register", json={"username": username, "password": password, "email": email})
res = requests.post(f"{BASE_URL}/auth/login", json={"username": username, "password": password})
token = res.json()["token"]

# Create session
client_uid = str(uuid.uuid4())
chunk_size = 1024 * 1024
total_size = chunk_size * 3

res_sess = requests.post(
    f"{BASE_URL}/uploads/session",
    json={"filename": "test.mp4", "size": total_size, "contentType": "video/mp4", "clientUploadId": client_uid, "chunkSize": chunk_size},
    headers={"Authorization": f"Bearer {token}"}
)
print("Create session status:", res_sess.status_code)
print("Create session body:", res_sess.text)

session = res_sess.json()
sid = session["sessionId"]

# Upload chunk
chunk_data = b"A" * chunk_size
checksum = hashlib.sha256(chunk_data).hexdigest()

headers = {"Authorization": f"Bearer {token}"}
files = {"file": ("chunk.bin", chunk_data, "application/octet-stream")}
params = {"chunkNumber": 1, "checksum": checksum, "size": chunk_size}

res_up = requests.post(f"{BASE_URL}/uploads/session/{sid}/chunk", headers=headers, files=files, params=params)

print("Upload status:", res_up.status_code)
print("Upload response body:", res_up.text)
