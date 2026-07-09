import requests
import uuid
import sys
import unittest
import pymysql
import threading
import time
import subprocess
import hashlib
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

def upload_chunk(token, sessionId, chunkNumber, data, checksum=None, size=None):
    headers = {"Authorization": f"Bearer {token}"}
    files = {"file": ("chunk.bin", data, "application/octet-stream")}
    params = {"chunkNumber": chunkNumber}
    if checksum:
        params["checksum"] = checksum
    if size:
        params["size"] = size
    res = requests.post(f"{BASE_URL}/uploads/session/{sessionId}/chunk", headers=headers, files=files, params=params)
    return res

def get_sha256(data):
    return hashlib.sha256(data).hexdigest()

def expire_session_in_db(sessionId):
    connection = pymysql.connect(
        host='localhost',
        port=3306,
        user='root',
        password='rootpassword',
        database='cloud_storage'
    )
    try:
        with connection.cursor() as cursor:
            sql = "UPDATE upload_sessions SET expires_at = DATE_SUB(NOW(), INTERVAL 48 HOUR) WHERE id = %s"
            cursor.execute(sql, (sessionId,))
        connection.commit()
    finally:
        connection.close()

def delete_session_in_db(sessionId):
    connection = pymysql.connect(
        host='localhost',
        port=3306,
        user='root',
        password='rootpassword',
        database='cloud_storage'
    )
    try:
        with connection.cursor() as cursor:
            cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
            cursor.execute("DELETE FROM upload_sessions WHERE id = %s", (sessionId,))
            cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
        connection.commit()
    finally:
        connection.close()

def check_file_exists_in_container(sessionId, chunkNumber):
    cmd = ["docker", "exec", "cloud_storage_backend", "ls", f"/app/uploads/{sessionId}/{chunkNumber}"]
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return result.returncode == 0


# --- INTEGRATION TEST SUITE ---
class Milestone22Tests(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        print("\n=== Initializing Milestone 2.2 Test Users ===")
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

    def tearDown(self):
        # Clean up database sessions to prevent test interference and purge filesystem files
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

        # Delete physical folders in container
        for sid in self.created_sessions:
            subprocess.run(["docker", "exec", "cloud_storage_backend", "rm", "-rf", f"/app/uploads/{sid}"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # --- 1. API CONTRACT & SUCCESSFUL UPLOAD ---
    def test_01_api_contract_and_upload_success(self):
        print("Testing: Chunk Upload API Contract & Progress Metrics...")
        client_uid = str(uuid.uuid4())
        chunk_size = 1024 * 1024 # 1MB
        total_size = chunk_size * 3 # 3MB

        # Initialize session
        res = create_upload_session(self.token_a, "video.mp4", total_size, "video/mp4", client_uid, chunkSize=chunk_size)
        self.assertEqual(res.status_code, 200)
        session = res.json()
        sid = session["sessionId"]
        self.created_sessions.append(sid)

        # Prepare chunk data (1MB)
        chunk_data = b"A" * chunk_size
        checksum = get_sha256(chunk_data)

        # Upload chunk 1
        res_upload = upload_chunk(self.token_a, sid, 1, chunk_data, checksum=checksum, size=chunk_size)
        self.assertEqual(res_upload.status_code, 200)
        resp_data = res_upload.json()

        # Verify API contract fields
        self.assertEqual(resp_data["sessionId"], sid)
        self.assertEqual(resp_data["chunkNumber"], 1)
        self.assertEqual(resp_data["uploadedChunks"], 1)
        self.assertEqual(resp_data["uploadedBytes"], chunk_size)
        self.assertEqual(resp_data["totalChunks"], 3)
        self.assertAlmostEqual(resp_data["uploadPercentage"], 33.33333333333333)
        self.assertEqual(resp_data["remainingChunks"], 2)
        self.assertIsNotNone(resp_data["lastActivityAt"])
        self.assertEqual(resp_data["status"], "UPLOADING")

        # Verify session state from GET endpoint
        res_sess = get_upload_session(self.token_a, sid)
        sess_data = res_sess.json()
        self.assertEqual(sess_data["uploadedChunks"], 1)
        self.assertEqual(sess_data["uploadedBytes"], chunk_size)
        self.assertEqual(sess_data["status"], "UPLOADING")

    # --- 2. INPUT BOUNDARY & VALIDATION ---
    def test_02_input_boundaries(self):
        print("Testing: Chunk Input Boundary Validations...")
        client_uid = str(uuid.uuid4())
        chunk_size = 256 * 1024 # 256KB
        total_size = chunk_size * 3

        res = create_upload_session(self.token_a, "test.txt", total_size, "text/plain", client_uid, chunkSize=chunk_size)
        sid = res.json()["sessionId"]
        self.created_sessions.append(sid)

        chunk_data = b"B" * chunk_size
        checksum = get_sha256(chunk_data)

        # Chunk number out of bounds (0)
        res1 = upload_chunk(self.token_a, sid, 0, chunk_data, checksum=checksum, size=chunk_size)
        self.assertEqual(res1.status_code, 400)

        # Chunk number out of bounds (4 when total chunks is 3)
        res2 = upload_chunk(self.token_a, sid, 4, chunk_data, checksum=checksum, size=chunk_size)
        self.assertEqual(res2.status_code, 400)

        # Size mismatch (expected 256KB, sent 100 bytes)
        res3 = upload_chunk(self.token_a, sid, 1, b"too_short", checksum=get_sha256(b"too_short"), size=chunk_size)
        self.assertEqual(res3.status_code, 400)

        # Checksum mismatch
        res4 = upload_chunk(self.token_a, sid, 1, chunk_data, checksum="wrongchecksum123", size=chunk_size)
        self.assertEqual(res4.status_code, 400)

        # Session not found (wrong UUID)
        fake_sid = str(uuid.uuid4())
        res5 = upload_chunk(self.token_a, fake_sid, 1, chunk_data, checksum=checksum, size=chunk_size)
        self.assertEqual(res5.status_code, 404)

        # Expiration Check
        expire_session_in_db(sid)
        res6 = upload_chunk(self.token_a, sid, 1, chunk_data, checksum=checksum, size=chunk_size)
        self.assertEqual(res6.status_code, 410)

    # --- 3. IDEMPOTENT UPLOADS ---
    def test_03_idempotency(self):
        print("Testing: Chunk Upload Idempotency and Duplicates...")
        client_uid = str(uuid.uuid4())
        chunk_size = 256 * 1024
        total_size = chunk_size * 2

        res = create_upload_session(self.token_a, "idemp.bin", total_size, "application/octet-stream", client_uid, chunkSize=chunk_size)
        sid = res.json()["sessionId"]
        self.created_sessions.append(sid)

        chunk_data = b"C" * chunk_size
        checksum = get_sha256(chunk_data)

        # First upload - success
        res1 = upload_chunk(self.token_a, sid, 1, chunk_data, checksum=checksum, size=chunk_size)
        self.assertEqual(res1.status_code, 200)
        resp1 = res1.json()

        # Second upload with identical payload - should return 200 (idempotent no-op reuse)
        res2 = upload_chunk(self.token_a, sid, 1, chunk_data, checksum=checksum, size=chunk_size)
        self.assertEqual(res2.status_code, 200)
        resp2 = res2.json()
        self.assertEqual(resp1["uploadedChunks"], resp2["uploadedChunks"])

        # Third upload with different checksum/payload for same chunk - 409 Conflict
        bad_data = b"D" * chunk_size
        res3 = upload_chunk(self.token_a, sid, 1, bad_data, checksum=get_sha256(bad_data), size=chunk_size)
        self.assertEqual(res3.status_code, 409)

    # --- 4. OUT-OF-ORDER UPLOADS ---
    def test_04_out_of_order(self):
        print("Testing: Out-of-Order Chunk Upload Processing...")
        client_uid = str(uuid.uuid4())
        chunk_size = 256 * 1024
        total_size = chunk_size * 5

        res = create_upload_session(self.token_a, "ooo.bin", total_size, "application/octet-stream", client_uid, chunkSize=chunk_size)
        sid = res.json()["sessionId"]
        self.created_sessions.append(sid)

        chunk_data = b"O" * chunk_size
        checksum = get_sha256(chunk_data)

        # Upload in order: 4, 1, 5, 2, 3
        order = [4, 1, 5, 2, 3]
        for idx, chunk_num in enumerate(order):
            res_up = upload_chunk(self.token_a, sid, chunk_num, chunk_data, checksum=checksum, size=chunk_size)
            self.assertEqual(res_up.status_code, 200)
            self.assertEqual(res_up.json()["uploadedChunks"], idx + 1)

        # Retrieve session and verify progress
        res_sess = get_upload_session(self.token_a, sid)
        sess_data = res_sess.json()
        self.assertEqual(sess_data["uploadedChunks"], 5)
        self.assertEqual(sess_data["uploadedBytes"], total_size)

    # --- 5. CONCURRENT DUPLICATE UPLOADS ---
    def test_05_concurrent_duplicate_uploads(self):
        print("Testing: Concurrent Duplicate Chunk Uploads...")
        client_uid = str(uuid.uuid4())
        chunk_size = 256 * 1024
        total_size = chunk_size * 3

        res = create_upload_session(self.token_a, "concurrent.bin", total_size, "application/octet-stream", client_uid, chunkSize=chunk_size)
        sid = res.json()["sessionId"]
        self.created_sessions.append(sid)

        chunk_data = b"P" * chunk_size
        checksum = get_sha256(chunk_data)

        results = []
        def upload_worker():
            res_up = upload_chunk(self.token_a, sid, 2, chunk_data, checksum=checksum, size=chunk_size)
            results.append(res_up.status_code)

        # Dispatch 2 threads concurrently uploading chunk 2
        threads = [threading.Thread(target=upload_worker) for _ in range(2)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        # At least one must succeed (200). The other could succeed (idempotent bypass) or fail with 409 (optimistic lock or unique constraint rollback).
        self.assertIn(200, results)
        for code in results:
            self.assertTrue(code in [200, 409])

        # Verify exactly one database record exists for chunk 2 of this session
        connection = pymysql.connect(
            host='localhost',
            port=3306,
            user='root',
            password='rootpassword',
            database='cloud_storage'
        )
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT COUNT(*) FROM uploaded_chunks WHERE session_id = %s AND chunk_number = 2", (sid,))
                count = cursor.fetchone()[0]
                self.assertEqual(count, 1)
        finally:
            connection.close()

    # --- 6. CRASH RECOVERY (DB fails -> File removed) ---
    def test_06_crash_recovery_transaction_rollback(self):
        print("Testing: Crash Recovery / Filesystem Transaction Rollback...")
        client_uid = str(uuid.uuid4())
        chunk_size = 5 * 1024 * 1024 # 5MB
        total_size = chunk_size * 2

        res = create_upload_session(self.token_a, "rollback_test.bin", total_size, "application/octet-stream", client_uid, chunkSize=chunk_size)
        sid = res.json()["sessionId"]
        self.created_sessions.append(sid)

        chunk_data = b"R" * chunk_size
        checksum = get_sha256(chunk_data)

        # We will upload chunk 1, but right after sending the request we delete the session from DB in a concurrent thread.
        # When Java tries to commit the UploadedChunk, it fails due to the foreign key constraint pointing to a missing session.
        # This will trigger a transaction rollback.
        
        def delete_session_delayed():
            time.sleep(0.02) # Let Tomcat start reading file and write to disk
            delete_session_in_db(sid)

        del_thread = threading.Thread(target=delete_session_delayed)
        del_thread.start()

        # Send chunk upload
        res_upload = upload_chunk(self.token_a, sid, 1, chunk_data, checksum=checksum, size=chunk_size)
        del_thread.join()

        # The upload must fail (either 409, 400, or 500 because the session was deleted mid-transaction)
        self.assertNotEqual(res_upload.status_code, 200)

        # Wait a moment for rollback listeners to run
        time.sleep(0.5)

        # Verify that the physical file was DELETED from the container directory
        file_exists = check_file_exists_in_container(sid, 1)
        self.assertFalse(file_exists, "Physical file was not cleaned up during database rollback!")

        # Verify database metadata is absent
        connection = pymysql.connect(
            host='localhost',
            port=3306,
            user='root',
            password='rootpassword',
            database='cloud_storage'
        )
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT COUNT(*) FROM uploaded_chunks WHERE session_id = %s", (sid,))
                count = cursor.fetchone()[0]
                self.assertEqual(count, 0)
        finally:
            connection.close()

    # --- 7. HIGH CONCURRENCY PERFORMANCE & STRESS LOAD (1000 Chunks) ---
    def test_07_stress_concurrency_1000_chunks(self):
        print("Testing: High Concurrency Stress Load (1,000 Chunks)...")
        client_uid = str(uuid.uuid4())
        chunk_size = 256 * 1024 # 256KB
        total_size = chunk_size * 1000 # 250MB total

        # Initialize session
        res = create_upload_session(self.token_a, "large_stress_file.bin", total_size, "application/octet-stream", client_uid, chunkSize=chunk_size)
        self.assertEqual(res.status_code, 200)
        sid = res.json()["sessionId"]
        self.created_sessions.append(sid)

        chunk_data = b"S" * chunk_size
        checksum = get_sha256(chunk_data)

        # Record performance metrics
        start_time = time.time()
        results = {}
        lock = threading.Lock()

        def upload_chunk_worker(chunk_num):
            try:
                res_up = upload_chunk(self.token_a, sid, chunk_num, chunk_data, checksum=checksum, size=chunk_size)
                with lock:
                    results[chunk_num] = res_up.status_code
            except Exception as e:
                with lock:
                    results[chunk_num] = str(e)

        # Upload 1,000 chunks concurrently using 20 workers
        print("Uploading 1,000 chunks in parallel (20 threads)...")
        with ThreadPoolExecutor(max_workers=20) as executor:
            executor.map(upload_chunk_worker, range(1, 1001))

        end_time = time.time()
        duration = end_time - start_time

        # Assert all 1000 chunks succeeded
        self.assertEqual(len(results), 1000)
        successes = [num for num, code in results.items() if code == 200]
        self.assertEqual(len(successes), 1000, f"Only {len(successes)} chunks succeeded out of 1000. Errors: { {k: v for k, v in results.items() if v != 200} }")

        # Verify session progress metrics in database
        res_sess = get_upload_session(self.token_a, sid)
        sess_data = res_sess.json()
        self.assertEqual(sess_data["uploadedChunks"], 1000)
        self.assertEqual(sess_data["uploadedBytes"], total_size)

        # Print performance statistics
        avg_latency = (duration * 20) / 1000.0 # concurrency adjusted average latency estimate
        throughput = (total_size / (1024 * 1024)) / duration # MB/sec

        print("\n=== PERFORMANCE TEST RESULTS ===")
        print(f"Total Chunks: 1,000")
        print(f"Total Bytes Uploaded: {total_size / (1024 * 1024):.2f} MB")
        print(f"Total Upload Duration: {duration:.2f} seconds")
        print(f"Average Throughput: {throughput:.2f} MB/sec")
        print(f"Estimated Avg Chunk Latency: {avg_latency * 1000:.2f} ms")
        print("================================")


def run_tests():
    print("==========================================================")
    print("STARTING MILESTONE 2.2 INTEGRATION & PERFORMANCE TESTS")
    print("==========================================================")
    suite = unittest.TestLoader().loadTestsFromTestCase(Milestone22Tests)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    print("\n==========================================================")
    if result.wasSuccessful():
        print("[SUCCESS] MILESTONE 2.2 INTEGRATION TESTS PASSED!")
        print("==========================================================")
        sys.exit(0)
    else:
        print("[FAIL] MILESTONE 2.2 INTEGRATION TESTS ENCOUNTERED FAILURES.")
        print("==========================================================")
        sys.exit(1)


if __name__ == "__main__":
    run_tests()
