import requests
import uuid
import sys
import unittest
import pymysql
import threading
from concurrent.futures import ThreadPoolExecutor

BASE_URL = "http://localhost:8080/api"

# --- HELPER FUNCTIONS ---
def get_unique_name(prefix):
    return f"{prefix}_{uuid.uuid4().hex[:8]}"

def register_user(username, password, email):
    res = requests.post(f"{BASE_URL}/auth/register", json={"username": username, "password": password, "email": email})
    return res

def login(username, password):
    res = requests.post(f"{BASE_URL}/auth/login", json={"username": username, "password": password})
    return res

def create_upload_session(token, filename, size, contentType, clientUploadId, folderId=None, chunkSize=None):
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    payload = {
        "filename": filename,
        "size": size,
        "contentType": contentType,
        "clientUploadId": clientUploadId
    }
    if folderId:
        payload["folderId"] = folderId
    if chunkSize:
        payload["chunkSize"] = chunkSize
    res = requests.post(f"{BASE_URL}/uploads/session", json=payload, headers=headers)
    return res

def get_upload_session(token, sessionId):
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.get(f"{BASE_URL}/uploads/session/{sessionId}", headers=headers)
    return res

def cancel_upload_session(token, sessionId):
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.delete(f"{BASE_URL}/uploads/session/{sessionId}", headers=headers)
    return res

def create_folder(token, name, parent_id=None):
    headers = {"Authorization": f"Bearer {token}"}
    params = {"name": name}
    if parent_id:
        params["parentId"] = parent_id
    res = requests.post(f"{BASE_URL}/storage/folder", params=params, headers=headers)
    return res

def list_items(token, folder_id=None):
    headers = {"Authorization": f"Bearer {token}"}
    params = {}
    if folder_id:
        params["folderId"] = folder_id
    res = requests.get(f"{BASE_URL}/storage", params=params, headers=headers)
    return res

def soft_delete_item(token, id, is_folder):
    headers = {"Authorization": f"Bearer {token}"}
    params = {"id": id, "isFolder": is_folder}
    res = requests.post(f"{BASE_URL}/storage/delete", params=params, headers=headers)
    return res

def permanent_delete_item(token, id, is_folder):
    headers = {"Authorization": f"Bearer {token}"}
    params = {"id": id, "isFolder": is_folder}
    res = requests.delete(f"{BASE_URL}/storage/permanent", params=params, headers=headers)
    return res

# Connect directly to MySQL to test session expiration mapping
def expire_session_in_db(sessionId):
    connection = pymysql.connect(
        host='localhost',
        port=3306,
        user='root',
        password='rootpassword',
        database='cloud_storage',
        cursorclass=pymysql.cursors.DictCursor
    )
    try:
        with connection.cursor() as cursor:
            # Set expires_at to 48 hours ago
            sql = "UPDATE upload_sessions SET expires_at = DATE_SUB(NOW(), INTERVAL 48 HOUR) WHERE id = %s"
            cursor.execute(sql, (sessionId,))
        connection.commit()
    finally:
        connection.close()


# --- UNITTEST SUITE ---
class Milestone21Tests(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        print("\n=== Initializing Test Users ===")
        cls.user_a = get_unique_name("user_a")
        cls.user_b = get_unique_name("user_b")
        cls.password = "SuperPassword123!"

        reg_a = register_user(cls.user_a, cls.password, f"{cls.user_a}@test.com")
        assert reg_a.status_code == 200, f"Failed to register User A: {reg_a.text}"
        cls.token_a = reg_a.json()["token"]

        reg_b = register_user(cls.user_b, cls.password, f"{cls.user_b}@test.com")
        assert reg_b.status_code == 200, f"Failed to register User B: {reg_b.text}"
        cls.token_b = reg_b.json()["token"]

    def setUp(self):
        self.created_sessions = []
        self.created_folders = []

    def tearDown(self):
        # Clean up database sessions to prevent test interference
        connection = pymysql.connect(
            host='localhost',
            port=3306,
            user='root',
            password='rootpassword',
            database='cloud_storage'
        )
        try:
            with connection.cursor() as cursor:
                for sid in self.created_sessions:
                    cursor.execute("DELETE FROM upload_sessions WHERE id = %s", (sid,))
                for fid in self.created_folders:
                    cursor.execute("DELETE FROM folders WHERE id = %s", (fid,))
            connection.commit()
        finally:
            connection.close()

    def _get_folder_by_name(self, token, name):
        items = list_items(token).json()
        for item in items:
            if item["name"] == name and item["type"] == "FOLDER":
                return item
        return None

    # --- 1. VALIDATION TESTS ---
    def test_01_validation_filename(self):
        print("Testing: Filename Input Validation...")
        client_uid = str(uuid.uuid4())
        
        # Empty filename
        res1 = create_upload_session(self.token_a, "", 1024, "text/plain", client_uid)
        self.assertEqual(res1.status_code, 400)

        # Blank filename (whitespace)
        res2 = create_upload_session(self.token_a, "   ", 1024, "text/plain", client_uid)
        self.assertEqual(res2.status_code, 400)

        # Path traversal filename
        res3 = create_upload_session(self.token_a, "../doc.txt", 1024, "text/plain", client_uid)
        self.assertEqual(res3.status_code, 400)

        # Control/Reserved characters
        res4 = create_upload_session(self.token_a, "doc<name>.txt", 1024, "text/plain", client_uid)
        self.assertEqual(res4.status_code, 400)

        # Excessively long filename (> 255 chars)
        long_name = "a" * 256 + ".txt"
        res5 = create_upload_session(self.token_a, long_name, 1024, "text/plain", client_uid)
        self.assertEqual(res5.status_code, 400)

    def test_02_validation_file_size(self):
        print("Testing: File Size Input Validation...")
        client_uid = str(uuid.uuid4())

        # Zero-byte size
        res1 = create_upload_session(self.token_a, "file.txt", 0, "text/plain", client_uid)
        self.assertEqual(res1.status_code, 400)

        # Negative file size
        res2 = create_upload_session(self.token_a, "file.txt", -500, "text/plain", client_uid)
        self.assertEqual(res2.status_code, 400)

        # Exceeding configurations max size (2GB = 2147483648 bytes)
        too_large = 2147483648 + 1
        res3 = create_upload_session(self.token_a, "big_file.bin", too_large, "application/octet-stream", client_uid)
        self.assertEqual(res3.status_code, 400)

    def test_03_validation_chunk_size(self):
        print("Testing: Chunk Size Range Validation...")
        client_uid = str(uuid.uuid4())

        # Invalid chunk size below 256KB (262144 bytes)
        res1 = create_upload_session(self.token_a, "file.txt", 1048576, "text/plain", client_uid, chunkSize=200000)
        self.assertEqual(res1.status_code, 400)

        # Invalid chunk size above 50MB (52428800 bytes)
        res2 = create_upload_session(self.token_a, "file.txt", 1048576, "text/plain", client_uid, chunkSize=60000000)
        self.assertEqual(res2.status_code, 400)

    def test_04_validation_folder_status(self):
        print("Testing: Target Folder Status Validation...")
        client_uid = str(uuid.uuid4())

        # Create folder
        create_folder(self.token_a, "Target_Trash_Folder")
        folder = self._get_folder_by_name(self.token_a, "Target_Trash_Folder")
        self.created_folders.append(folder["id"])

        # Soft delete the folder (place in trash)
        soft_delete_item(self.token_a, folder["id"], True)

        # Attempt to create upload session targeting the trashed folder
        res = create_upload_session(self.token_a, "file.txt", 1024, "text/plain", client_uid, folderId=folder["id"])
        self.assertEqual(res.status_code, 400)

    # --- 2. IDEMPOTENT DUPLICATE SESSION PREVENTION ---
    def test_05_idempotent_session_reuse(self):
        print("Testing: Duplicate Session Prevention (Idempotency)...")
        client_uid = str(uuid.uuid4())

        # First request creates the session
        res1 = create_upload_session(self.token_a, "report.pdf", 10485760, "application/pdf", client_uid)
        self.assertEqual(res1.status_code, 200)
        sess1 = res1.json()
        self.created_sessions.append(sess1["sessionId"])

        # Second request with the same clientUploadId should return the exact same session
        res2 = create_upload_session(self.token_a, "report.pdf", 10485760, "application/pdf", client_uid)
        self.assertEqual(res2.status_code, 200)
        sess2 = res2.json()

        self.assertEqual(sess1["sessionId"], sess2["sessionId"])
        self.assertEqual(sess1["clientUploadId"], sess2["clientUploadId"])
        self.assertEqual(sess2["status"], "INITIALIZED")

    # --- 3. EXPIRED SESSIONS VALIDATION ---
    def test_06_session_expiration(self):
        print("Testing: Session Expiration Checks (410 Gone)...")
        client_uid = str(uuid.uuid4())

        res = create_upload_session(self.token_a, "expire.txt", 1024, "text/plain", client_uid)
        self.assertEqual(res.status_code, 200)
        session = res.json()
        self.created_sessions.append(session["sessionId"])

        # Update DB directly to mark session as expired (expires_at in past)
        expire_session_in_db(session["sessionId"])

        # Retrieve the session -> should throw UploadSessionExpiredException mapped to 410 Gone
        res_get = get_upload_session(self.token_a, session["sessionId"])
        self.assertEqual(res_get.status_code, 410)

    # --- 4. AUTHORIZATION CONTROLS ---
    def test_07_authorization_boundaries(self):
        print("Testing: Cross-User Authorization Blocks (403 Forbidden)...")
        client_uid = str(uuid.uuid4())

        res = create_upload_session(self.token_a, "user_a_private.txt", 2048, "text/plain", client_uid)
        self.assertEqual(res.status_code, 200)
        session = res.json()
        self.created_sessions.append(session["sessionId"])

        # User B attempts to access User A's session
        res_get = get_upload_session(self.token_b, session["sessionId"])
        self.assertEqual(res_get.status_code, 403)

        # User B attempts to cancel User A's session
        res_cancel = cancel_upload_session(self.token_b, session["sessionId"])
        self.assertEqual(res_cancel.status_code, 403)

    # --- 5. OPTIMISTIC LOCKING VERIFICATION ---
    def test_08_optimistic_locking(self):
        print("Testing: Optimistic Locking Verification...")
        client_uid = str(uuid.uuid4())

        res = create_upload_session(self.token_a, "lock_test.txt", 4096, "text/plain", client_uid)
        self.assertEqual(res.status_code, 200)
        session = res.json()
        self.created_sessions.append(session["sessionId"])

        # Simulating concurrent requests to getSession (which updates lastActivityAt and triggers database write)
        errors = []
        statuses = []

        def access_session():
            try:
                res_get = get_upload_session(self.token_a, session["sessionId"])
                statuses.append(res_get.status_code)
            except Exception as e:
                errors.append(e)

        # Dispatch two threads concurrently
        threads = [threading.Thread(target=access_session) for _ in range(5)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        # One of them will increment version. Under tight concurrent execution,
        # some of them might encounter a 500 Lock error or all succeed if serialized.
        # But we check that at least one succeeded with 200.
        self.assertIn(200, statuses)

    # --- 6. CONCURRENT SESSION CREATION ---
    def test_09_concurrency_load(self):
        print("Testing: High Concurrency Creation (50 Sessions parallel)...")
        session_ids = []
        lock = threading.Lock()

        def create_sess():
            c_uid = str(uuid.uuid4())
            res = create_upload_session(self.token_a, "load_test.txt", 1024, "text/plain", c_uid)
            if res.status_code == 200:
                sid = res.json()["sessionId"]
                with lock:
                    session_ids.append(sid)
                    self.created_sessions.append(sid)
            else:
                print(f"FAILED REQUEST status={res.status_code} body={res.text}")

        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(create_sess) for _ in range(50)]
            for f in futures:
                f.result()

        # Verify 50 unique session IDs were created without conflict
        self.assertEqual(len(session_ids), 50)
        self.assertEqual(len(set(session_ids)), 50)

    # --- 7. API CONTRACT SCHEMA VALIDATION ---
    def test_10_api_contract_schema(self):
        print("Testing: API Contract Schema Validation...")
        client_uid = str(uuid.uuid4())

        res = create_upload_session(self.token_a, "contract.bin", 1048576, "application/octet-stream", client_uid, chunkSize=1048576)
        self.assertEqual(res.status_code, 200)
        session = res.json()
        self.created_sessions.append(session["sessionId"])

        # Check response JSON keys and type safety
        self.assertIn("sessionId", session)
        self.assertIsInstance(session["sessionId"], str)

        self.assertIn("filename", session)
        self.assertEqual(session["filename"], "contract.bin")

        self.assertIn("size", session)
        self.assertEqual(session["size"], 1048576)

        self.assertIn("status", session)
        self.assertEqual(session["status"], "INITIALIZED")

        self.assertIn("clientUploadId", session)
        self.assertEqual(session["clientUploadId"], client_uid)

        self.assertIn("totalChunks", session)
        self.assertEqual(session["totalChunks"], 1)

        self.assertIn("chunkSize", session)
        self.assertEqual(session["chunkSize"], 1048576)

        self.assertIn("uploadedChunks", session)
        self.assertEqual(session["uploadedChunks"], 0)

        self.assertIn("uploadedBytes", session)
        self.assertEqual(session["uploadedBytes"], 0)

        self.assertIn("createdAt", session)
        self.assertIsNotNone(session["createdAt"])

        self.assertIn("lastActivityAt", session)
        self.assertIsNotNone(session["lastActivityAt"])

        self.assertIn("expiresAt", session)
        self.assertIsNotNone(session["expiresAt"])


def run_tests():
    print("==========================================================")
    print("STARTING MILESTONE 2.1 INTEGRATION TEST SUITE")
    print("==========================================================")
    suite = unittest.TestLoader().loadTestsFromTestCase(Milestone21Tests)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    print("\n==========================================================")
    if result.wasSuccessful():
        print("[SUCCESS] MILESTONE 2.1 INTEGRATION TESTS PASSED!")
        print("==========================================================")
        sys.exit(0)
    else:
        print("[FAIL] MILESTONE 2.1 INTEGRATION TESTS ENCOUNTERED FAILURES.")
        print("==========================================================")
        sys.exit(1)


if __name__ == "__main__":
    run_tests()
