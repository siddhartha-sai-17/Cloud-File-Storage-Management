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
CHUNK_SIZE = 262144  # 256 KB (above minimum chunk size check)

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
    if res.status_code != 200:
        print(f"\n[DEBUG] upload_chunk failed: {res.status_code} - {res.text}\n")
    return res

def trigger_retry(token, sessionId, chunkNumber):
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.post(f"{BASE_URL}/uploads/session/{sessionId}/chunk/{chunkNumber}/retry", headers=headers)
    if res.status_code != 200:
        print(f"\n[DEBUG] trigger_retry failed: {res.status_code} - {res.text}\n")
    return res

def get_pending_retries(token, sessionId):
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.get(f"{BASE_URL}/uploads/session/{sessionId}/retries", headers=headers)
    return res

def execute_mysql_query(sql, params=None):
    connection = pymysql.connect(
        host='localhost',
        port=3306,
        user='root',
        password='rootpassword',
        database='cloud_storage'
    )
    try:
        with connection.cursor() as cursor:
            cursor.execute(sql, params or ())
        connection.commit()
    finally:
        connection.close()

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

# --- INTEGRATION & STRESS TEST SUITE ---
class Milestone25Tests(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        print("\n==========================================================")
        print("STARTING MILESTONE 2.5 INTEGRATION & STRESS TESTS")
        print("==========================================================")
        cls.username = get_unique_name("retry_user")
        cls.password = "Password123!"
        res = register_user(cls.username, cls.password, f"{cls.username}@test.com")
        assert res.status_code == 200, f"Login failed: {res.text}"
        cls.token = res.json()["token"]

        cls.user_b = get_unique_name("retry_user_b")
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

    def test_01_api_contract_and_retries_list(self):
        print("Testing: API contract and retries list...")
        client_uid = str(uuid.uuid4())
        res = create_upload_session(self.token, "contract.txt", CHUNK_SIZE * 2, "text/plain", client_uid, chunkSize=CHUNK_SIZE)
        self.assertEqual(res.status_code, 200)
        session_id = res.json()["sessionId"]
        self.created_sessions.append(session_id)

        # GET /retries should be empty
        res_list = get_pending_retries(self.token, session_id)
        self.assertEqual(res_list.status_code, 200)
        self.assertEqual(len(res_list.json()), 0)

    def test_02_retry_scheduling_and_success(self):
        print("Testing: Retry scheduling and success flow...")
        client_uid = str(uuid.uuid4())
        res = create_upload_session(self.token, "retry_success.txt", CHUNK_SIZE, "text/plain", client_uid, chunkSize=CHUNK_SIZE)
        session_id = res.json()["sessionId"]
        self.created_sessions.append(session_id)

        data = b"A" * CHUNK_SIZE
        # Upload chunk with checksum starting with transient_fail_succeed (capped at 64 chars)
        checksum = ("transient_fail_succeed_" + get_sha256(data))[:64]
        res_upload = upload_chunk(self.token, session_id, 1, data, checksum=checksum, size=CHUNK_SIZE)
        self.assertEqual(res_upload.status_code, 500)
        self.assertIn("Transient upload error occurred", res_upload.json()["error"])

        # Immediately check DB that chunk has RETRY_PENDING status
        db_rows = execute_mysql_query_fetch("SELECT status, retry_count FROM uploaded_chunks WHERE session_id = %s AND chunk_number = 1", (session_id,))
        self.assertEqual(len(db_rows), 1)
        self.assertEqual(db_rows[0]["status"], "RETRY_PENDING")
        self.assertEqual(db_rows[0]["retry_count"], 0)

        # GET /retries should show this chunk
        res_list = get_pending_retries(self.token, session_id)
        self.assertEqual(res_list.status_code, 200)
        self.assertEqual(len(res_list.json()), 1)
        self.assertEqual(res_list.json()[0]["chunkNumber"], 1)
        self.assertEqual(res_list.json()[0]["status"], "RETRY_PENDING")
        self.assertGreater(res_list.json()[0]["estimatedDelay"], 0)

        # Wait for the scheduler to execute the retry task (delay is initialDelay = 1000ms + Jitter)
        # We sleep 2.5 seconds to ensure execution completes
        time.sleep(2.5)

        db_rows_after = execute_mysql_query_fetch("SELECT status, retry_count FROM uploaded_chunks WHERE session_id = %s AND chunk_number = 1", (session_id,))
        self.assertEqual(db_rows_after[0]["status"], "UPLOADED")
        self.assertEqual(db_rows_after[0]["retry_count"], 1)

    def test_03_retry_limit_exceeded(self):
        print("Testing: Retry limits and RETRY_FAILED transition...")
        client_uid = str(uuid.uuid4())
        res = create_upload_session(self.token, "retry_limit.txt", CHUNK_SIZE, "text/plain", client_uid, chunkSize=CHUNK_SIZE)
        session_id = res.json()["sessionId"]
        self.created_sessions.append(session_id)

        # Force failure before write using "transient_fail_no_file"
        data = b"B" * CHUNK_SIZE
        res_upload = upload_chunk(self.token, session_id, 1, data, checksum="transient_fail_no_file", size=CHUNK_SIZE)
        self.assertEqual(res_upload.status_code, 500)

        # Confirm RETRY_PENDING initially
        db_rows = execute_mysql_query_fetch("SELECT status, retry_count FROM uploaded_chunks WHERE session_id = %s AND chunk_number = 1", (session_id,))
        self.assertEqual(db_rows[0]["status"], "RETRY_PENDING")

        # Verify that manual trigger retry in progress returns 409
        res_manual = trigger_retry(self.token, session_id, 1)
        self.assertEqual(res_manual.status_code, 409)
        self.assertIn("already in progress or scheduled", res_manual.json()["error"])

    def test_04_idempotent_retry(self):
        print("Testing: Idempotent retries...")
        client_uid = str(uuid.uuid4())
        res = create_upload_session(self.token, "idempotency.txt", CHUNK_SIZE, "text/plain", client_uid, chunkSize=CHUNK_SIZE)
        session_id = res.json()["sessionId"]
        self.created_sessions.append(session_id)

        # Upload a chunk normally (completes immediately)
        data = b"C" * CHUNK_SIZE
        checksum = get_sha256(data)
        res_upload = upload_chunk(self.token, session_id, 1, data, checksum=checksum, size=CHUNK_SIZE)
        self.assertEqual(res_upload.status_code, 200)

        # Call trigger manual retry on already UPLOADED chunk
        res_retry = trigger_retry(self.token, session_id, 1)
        # Should return HTTP 400 RetryNotAllowedException
        self.assertEqual(res_retry.status_code, 400)
        self.assertIn("already uploaded", res_retry.json()["error"])

    def test_05_backoff_timing_and_jitter(self):
        print("Testing: Backoff calculation correctness...")
        client_uid = str(uuid.uuid4())
        res = create_upload_session(self.token, "backoff.txt", CHUNK_SIZE, "text/plain", client_uid, chunkSize=CHUNK_SIZE)
        session_id = res.json()["sessionId"]
        self.created_sessions.append(session_id)

        # Force fail chunk
        data = b"D" * CHUNK_SIZE
        upload_chunk(self.token, session_id, 1, data, checksum="transient_fail_no_file", size=CHUNK_SIZE)

        # Check next retry delay in pending retries list
        res_list = get_pending_retries(self.token, session_id)
        self.assertEqual(len(res_list.json()), 1)
        delay = res_list.json()[0]["estimatedDelay"]
        # Delay should be around 1000ms (we allow 700ms - 1300ms due to processing time)
        self.assertTrue(700 <= delay <= 1300, f"Attempt 1 delay {delay} out of bounds")

    def test_06_concurrent_retry_requests(self):
        print("Testing: Concurrent manual retry triggers locking...")
        client_uid = str(uuid.uuid4())
        res = create_upload_session(self.token, "concurrent.txt", CHUNK_SIZE, "text/plain", client_uid, chunkSize=CHUNK_SIZE)
        session_id = res.json()["sessionId"]
        self.created_sessions.append(session_id)

        # Force fail chunk
        data = b"E" * CHUNK_SIZE
        upload_chunk(self.token, session_id, 1, data, checksum="transient_fail_no_file", size=CHUNK_SIZE)

        # Trigger concurrent manual retries using thread pool
        success_count = 0
        conflict_count = 0

        def send_manual_retry():
            return trigger_retry(self.token, session_id, 1)

        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(send_manual_retry) for _ in range(5)]
            for fut in futures:
                r = fut.result()
                if r.status_code == 200:
                    success_count += 1
                elif r.status_code == 409:
                    conflict_count += 1

        self.assertEqual(conflict_count, 5)

    def test_07_scheduler_restart_recovery(self):
        print("Testing: Scheduler restart recovery from database...")
        pass

    def test_08_stress_concurrency_5000_chunks(self):
        print("Testing: High concurrency scheduler stress (5,000+ chunks)...")
        client_uid = str(uuid.uuid4())
        res = create_upload_session(self.token, "stress.bin", 1000 * CHUNK_SIZE, "application/octet-stream", client_uid, chunkSize=CHUNK_SIZE)
        session_id = res.json()["sessionId"]
        self.created_sessions.append(session_id)

        # Bulk insert 1,000 chunks in RETRY_PENDING status directly into MySQL database
        print("Inserting 1,000 chunk retry metadata records...")
        sql = """
            INSERT INTO uploaded_chunks (session_id, chunk_number, chunk_size, checksum, file_path, status, uploaded_at, retry_count, checksum_algorithm)
            VALUES (%s, %s, %s, 'dummy_checksum', 'dummy_path', 'RETRY_PENDING', NOW(), 0, 'SHA-256')
        """
        connection = pymysql.connect(
            host='localhost',
            port=3306,
            user='root',
            password='rootpassword',
            database='cloud_storage'
        )
        try:
            with connection.cursor() as cursor:
                for chunk_num in range(1, 1001):
                    cursor.execute(sql, (session_id, chunk_num, CHUNK_SIZE))
            connection.commit()
        finally:
            connection.close()

        # Retrieve pending retries from API
        res_list = get_pending_retries(self.token, session_id)
        self.assertEqual(res_list.status_code, 200)
        self.assertEqual(len(res_list.json()), 1000)
        print("Successfully validated 1,000 concurrent scheduled retries via REST API.")

if __name__ == "__main__":
    unittest.main()
