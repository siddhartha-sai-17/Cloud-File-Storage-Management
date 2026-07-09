import requests
import uuid
import sys
import unittest
import pymysql
import threading
import time
import hashlib
from concurrent.futures import ThreadPoolExecutor

BASE_URL = "http://localhost:8080/api"
CHUNK_SIZE = 262144  # 256 KB

# --- HELPER FUNCTIONS ---
def get_unique_name(prefix):
    return f"{prefix}_{uuid.uuid4().hex[:8]}"

def register_user(username, password, email):
    try:
        requests.post(f"{BASE_URL}/auth/register", json={"username": username, "password": password, "email": email})
    except:
        pass
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
    if res.status_code != 200:
        print(f"\n[DEBUG] create_upload_session failed: {res.status_code} - {res.text}\n")
    return res

def upload_chunk(token, sessionId, chunkNumber, data, checksum=None, size=None):
    headers = {"Authorization": f"Bearer {token}"}
    params = {"chunkNumber": chunkNumber}
    if size:
        params["size"] = size
    if checksum:
        params["checksum"] = checksum
    files = {"file": ("chunk.bin", data, "application/octet-stream")}
    res = requests.post(f"{BASE_URL}/uploads/session/{sessionId}/chunk", headers=headers, files=files, params=params)
    return res

def complete_upload(token, sessionId, checksum):
    headers = {"Authorization": f"Bearer {token}"}
    params = {"checksum": checksum}
    res = requests.post(f"{BASE_URL}/uploads/session/{sessionId}/complete", headers=headers, params=params)
    return res

def get_parallel_stats(token):
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.get(f"{BASE_URL}/uploads/session/parallel/stats", headers=headers)
    return res

def execute_mysql_query_fetch(sql, params=None):
    connection = pymysql.connect(
        host='localhost',
        port=3306,
        user='root',
        password='rootpassword',
        database='cloud_storage'
    )
    try:
        with connection.cursor(pymysql.cursors.DictCursor) as cursor:
            cursor.execute(sql, params or ())
            return cursor.fetchall()
    finally:
        connection.close()

def get_sha256(data):
    return hashlib.sha256(data).hexdigest()

# --- LIFECYCLE TESTS ---
class Milestone27Tests(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        print("\n==========================================================")
        print("STARTING MILESTONE 2.7 INTEGRATION & STRESS TESTS")
        print("==========================================================")
        cls.username = get_unique_name("parallel_user")
        cls.password = "Password123!"
        res = register_user(cls.username, cls.password, f"{cls.username}@test.com")
        assert res.status_code == 200, f"Login failed: {res.text}"
        cls.token = res.json()["token"]

        cls.user_b = get_unique_name("parallel_user_b")
        res_b = register_user(cls.user_b, cls.password, f"{cls.user_b}@test.com")
        cls.token_b = res_b.json()["token"]

    def setUp(self):
        self.created_sessions = []

    def tearDown(self):
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
                    cursor.execute("DELETE FROM uploaded_chunks WHERE session_id = %s", (sid,))
                    cursor.execute("DELETE FROM upload_sessions WHERE id = %s", (sid,))
            connection.commit()
        finally:
            connection.close()

    def test_01_single_thread_upload(self):
        print("Testing: Single-thread upload...")
        client_uid = str(uuid.uuid4())
        res = create_upload_session(self.token, "single.txt", CHUNK_SIZE, "text/plain", client_uid, chunkSize=CHUNK_SIZE)
        self.assertEqual(res.status_code, 200)
        session_id = res.json()["sessionId"]
        self.created_sessions.append(session_id)

        data = b"S" * CHUNK_SIZE
        checksum = get_sha256(data)
        res_upload = upload_chunk(self.token, session_id, 1, data, checksum=checksum, size=CHUNK_SIZE)
        self.assertEqual(res_upload.status_code, 200)

        # Check DB
        db_rows = execute_mysql_query_fetch("SELECT status FROM uploaded_chunks WHERE session_id = %s AND chunk_number = 1", (session_id,))
        self.assertEqual(len(db_rows), 1)
        self.assertEqual(db_rows[0]["status"], "UPLOADED")

    def test_02_parallel_and_out_of_order_upload(self):
        print("Testing: Parallel and out-of-order upload...")
        client_uid = str(uuid.uuid4())
        total_chunks = 4
        res = create_upload_session(self.token, "parallel.txt", CHUNK_SIZE * total_chunks, "text/plain", client_uid, chunkSize=CHUNK_SIZE)
        self.assertEqual(res.status_code, 200)
        session_id = res.json()["sessionId"]
        self.created_sessions.append(session_id)

        data_list = [f"Data_chunk_{i}".encode().ljust(CHUNK_SIZE, b"X") for i in range(1, total_chunks + 1)]
        checksums = [get_sha256(d) for d in data_list]

        # Upload concurrently and out of order
        # Upload chunk 3, then 1, then 4, then 2
        order = [3, 1, 4, 2]
        
        def upload_worker(chunk_idx):
            idx = chunk_idx - 1
            res_up = upload_chunk(self.token, session_id, chunk_idx, data_list[idx], checksum=checksums[idx], size=CHUNK_SIZE)
            return chunk_idx, res_up.status_code

        with ThreadPoolExecutor(max_workers=4) as executor:
            results = list(executor.map(upload_worker, order))

        for chunk_idx, status_code in results:
            self.assertEqual(status_code, 200, f"Chunk {chunk_idx} failed with {status_code}")

        # Check all uploaded
        db_rows = execute_mysql_query_fetch("SELECT chunk_number, status FROM uploaded_chunks WHERE session_id = %s ORDER BY chunk_number", (session_id,))
        self.assertEqual(len(db_rows), total_chunks)
        for i, row in enumerate(db_rows):
            self.assertEqual(row["chunk_number"], i + 1)
            self.assertEqual(row["status"], "UPLOADED")

    def test_03_duplicate_protection_and_duplicate_concurrent_uploads(self):
        print("Testing: Duplicate protection and concurrent duplicate uploads...")
        client_uid = str(uuid.uuid4())
        res = create_upload_session(self.token, "duplicate.txt", CHUNK_SIZE * 2, "text/plain", client_uid, chunkSize=CHUNK_SIZE)
        session_id = res.json()["sessionId"]
        self.created_sessions.append(session_id)

        data = b"D" * CHUNK_SIZE
        checksum = get_sha256(data)

        # Trigger duplicate concurrent uploads of same chunk
        success_list = []
        conflict_list = []

        def duplicate_worker():
            res_up = upload_chunk(self.token, session_id, 1, data, checksum=checksum, size=CHUNK_SIZE)
            if res_up.status_code == 200:
                success_list.append(res_up)
            elif res_up.status_code == 409:
                conflict_list.append(res_up)

        threads = [threading.Thread(target=duplicate_worker) for _ in range(5)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        # One should succeed (200), and others should be blocked with 409 Conflict (ChunkAlreadyUploadingException or DuplicateChunkException)
        self.assertEqual(len(success_list), 1)
        self.assertGreaterEqual(len(conflict_list), 1)

    def test_04_completion_race(self):
        print("Testing: Completion race locks...")
        client_uid = str(uuid.uuid4())
        res = create_upload_session(self.token, "completion_race.txt", CHUNK_SIZE * 2, "text/plain", client_uid, chunkSize=CHUNK_SIZE)
        session_id = res.json()["sessionId"]
        self.created_sessions.append(session_id)

        data1 = b"C1" * (CHUNK_SIZE // 2)
        checksum1 = ("transient_fail_" + get_sha256(data1))[:64]

        # Trigger a slow retry scheduling upload that holds coordinator state briefly
        res_upload = upload_chunk(self.token, session_id, 1, data1, checksum=checksum1, size=CHUNK_SIZE)
        self.assertEqual(res_upload.status_code, 500)  # Transient fail goes to retry queue

        # Now trigger complete during active retries/active session chunks
        res_comp = complete_upload(self.token, session_id, "some-hash")
        # Incomplete or active chunks should reject merge completion
        self.assertEqual(res_comp.status_code, 400) # Since not all chunks are UPLOADED (chunk 1 is RETRY_PENDING)

    def test_05_stats_monitoring(self):
        print("Testing: Stats monitoring...")
        res_stats = get_parallel_stats(self.token)
        self.assertEqual(res_stats.status_code, 200)
        stats = res_stats.json()
        
        self.assertIn("totalActiveUploads", stats)
        self.assertIn("queueDepth", stats)
        self.assertIn("workerUtilization", stats)
        self.assertIn("threadStatistics", stats)

    def test_06_stress_parallel_uploads(self):
        print("Testing: High concurrency stress parallel uploads (100 parallel chunk uploads)...")
        client_uid = str(uuid.uuid4())
        total_chunks = 100
        res = create_upload_session(self.token, "stress_parallel.bin", CHUNK_SIZE * total_chunks, "application/octet-stream", client_uid, chunkSize=CHUNK_SIZE)
        self.assertEqual(res.status_code, 200)
        session_id = res.json()["sessionId"]
        self.created_sessions.append(session_id)

        data = b"M" * CHUNK_SIZE
        checksum = get_sha256(data)

        # Upload 100 chunks concurrently using ThreadPoolExecutor (up to 16 workers)
        def stress_worker(chunk_idx):
            res_up = upload_chunk(self.token, session_id, chunk_idx, data, checksum=checksum, size=CHUNK_SIZE)
            return chunk_idx, res_up.status_code

        with ThreadPoolExecutor(max_workers=16) as executor:
            results = list(executor.map(stress_worker, range(1, total_chunks + 1)))

        for chunk_idx, status_code in results:
            self.assertEqual(status_code, 200, f"Chunk {chunk_idx} failed under stress with status {status_code}")

        # Verify DB has 100 chunks
        db_rows = execute_mysql_query_fetch("SELECT COUNT(*) as count FROM uploaded_chunks WHERE session_id = %s AND status = 'UPLOADED'", (session_id,))
        self.assertEqual(db_rows[0]["count"], total_chunks)

if __name__ == "__main__":
    unittest.main()
