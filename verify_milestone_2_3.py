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

def complete_upload_session(token, sessionId, checksum=None):
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    payload = {}
    if checksum:
        payload["checksum"] = checksum
    res = requests.post(f"{BASE_URL}/uploads/session/{sessionId}/complete", json=payload, headers=headers)
    return res

def get_upload_session(token, sessionId):
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.get(f"{BASE_URL}/uploads/session/{sessionId}", headers=headers)
    return res

def cancel_upload_session(token, sessionId):
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.delete(f"{BASE_URL}/uploads/session/{sessionId}", headers=headers)
    return res

def download_file(token, file_id):
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.get(f"{BASE_URL}/storage/download/{file_id}", headers=headers)
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

def check_file_exists_in_container(sessionId, name):
    cmd = ["docker", "exec", "cloud_storage_backend", "ls", f"/app/uploads/{sessionId}/{name}"]
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return result.returncode == 0

def check_session_dir_exists_in_container(sessionId):
    cmd = ["docker", "exec", "cloud_storage_backend", "ls", f"/app/uploads/{sessionId}"]
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return result.returncode == 0


# --- INTEGRATION TEST SUITE ---
class Milestone23Tests(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        print("\n=== Initializing Milestone 2.3 Test Users ===")
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
        self.created_files = []

    def tearDown(self):
        # Clean up database sessions & files to prevent test interference
        connection = pymysql.connect(
            host='localhost',
            port=3306,
            user='root',
            password='rootpassword',
            database='cloud_storage'
        )
        try:
            with connection.cursor() as cursor:
                for fid in self.created_files:
                    cursor.execute("DELETE FROM file_versions WHERE file_id = %s", (fid,))
                    cursor.execute("DELETE FROM ocr_contents WHERE file_id = %s", (fid,))
                    cursor.execute("DELETE FROM comments WHERE file_id = %s", (fid,))
                    cursor.execute("DELETE FROM files WHERE id = %s", (fid,))
                for sid in self.created_sessions:
                    cursor.execute("DELETE FROM uploaded_chunks WHERE session_id = %s", (sid,))
                    cursor.execute("DELETE FROM upload_sessions WHERE id = %s", (sid,))
            connection.commit()
        finally:
            connection.close()

        # Delete physical folders & objects in container/MinIO
        for sid in self.created_sessions:
            subprocess.run(["docker", "exec", "cloud_storage_backend", "rm", "-rf", f"/app/uploads/{sid}"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


    # --- 1. COMPLETION VALIDATION SCENARIOS ---
    def test_01_incomplete_and_missing_chunks(self):
        print("Testing: Incomplete upload and missing chunk validation...")
        client_uid = str(uuid.uuid4())
        chunk_size = 256 * 1024 # 256KB
        total_size = chunk_size * 3 # 3 chunks

        # Initialize session
        res = create_upload_session(self.token_a, "incomplete.bin", total_size, "application/octet-stream", client_uid, chunkSize=chunk_size)
        self.assertEqual(res.status_code, 200)
        sid = res.json()["sessionId"]
        self.created_sessions.append(sid)

        # Upload chunk 1 and chunk 3, skip chunk 2
        chunk_data = b"A" * chunk_size
        upload_chunk(self.token_a, sid, 1, chunk_data, checksum=get_sha256(chunk_data), size=chunk_size)
        upload_chunk(self.token_a, sid, 3, chunk_data, checksum=get_sha256(chunk_data), size=chunk_size)

        # Request complete -> should fail with 400 (UploadIncompleteException)
        res_comp = complete_upload_session(self.token_a, sid)
        self.assertEqual(res_comp.status_code, 400)
        self.assertIn("error", res_comp.json())
        self.assertIn("Chunk count mismatch", res_comp.json()["error"])

        # Upload chunk 2 now
        upload_chunk(self.token_a, sid, 2, chunk_data, checksum=get_sha256(chunk_data), size=chunk_size)

        # Session should now be complete-able
        res_comp_success = complete_upload_session(self.token_a, sid)
        self.assertEqual(res_comp_success.status_code, 200)
        self.created_files.append(res_comp_success.json()["fileId"])


    def test_02_validation_boundaries(self):
        print("Testing: Status boundaries (expired, cancelled, unauthorized)...")
        client_uid = str(uuid.uuid4())
        chunk_size = 256 * 1024
        total_size = chunk_size * 2

        # 1. Expired Session Complete
        res1 = create_upload_session(self.token_a, "expired_test.bin", total_size, "application/octet-stream", client_uid, chunkSize=chunk_size)
        sid1 = res1.json()["sessionId"]
        self.created_sessions.append(sid1)
        upload_chunk(self.token_a, sid1, 1, b"X" * chunk_size, size=chunk_size)
        upload_chunk(self.token_a, sid1, 2, b"X" * chunk_size, size=chunk_size)

        expire_session_in_db(sid1)
        res_comp1 = complete_upload_session(self.token_a, sid1)
        self.assertEqual(res_comp1.status_code, 410) # 410 Gone for expired

        # 2. Cancelled Session Complete
        client_uid2 = str(uuid.uuid4())
        res2 = create_upload_session(self.token_a, "cancelled_test.bin", total_size, "application/octet-stream", client_uid2, chunkSize=chunk_size)
        sid2 = res2.json()["sessionId"]
        self.created_sessions.append(sid2)
        upload_chunk(self.token_a, sid2, 1, b"X" * chunk_size, size=chunk_size)
        upload_chunk(self.token_a, sid2, 2, b"X" * chunk_size, size=chunk_size)

        cancel_upload_session(self.token_a, sid2)
        res_comp2 = complete_upload_session(self.token_a, sid2)
        self.assertEqual(res_comp2.status_code, 409) # 409 Conflict for cancelled

        # 3. Unauthorized Completion
        client_uid3 = str(uuid.uuid4())
        res3 = create_upload_session(self.token_a, "unauth_test.bin", total_size, "application/octet-stream", client_uid3, chunkSize=chunk_size)
        sid3 = res3.json()["sessionId"]
        self.created_sessions.append(sid3)
        upload_chunk(self.token_a, sid3, 1, b"X" * chunk_size, size=chunk_size)
        upload_chunk(self.token_a, sid3, 2, b"X" * chunk_size, size=chunk_size)

        res_comp3 = complete_upload_session(self.token_b, sid3)
        self.assertEqual(res_comp3.status_code, 403) # 403 Forbidden for cross-user


    # --- 2. ORDERED MERGING & CHECKSUM VERIFICATION ---
    def test_03_out_of_order_merge_and_checksum(self):
        print("Testing: Out-of-order merging and checksum verification...")
        client_uid = str(uuid.uuid4())
        chunk_size = 256 * 1024
        total_size = chunk_size * 4 # 1MB

        res = create_upload_session(self.token_a, "ooo_merge.bin", total_size, "application/octet-stream", client_uid, chunkSize=chunk_size)
        sid = res.json()["sessionId"]
        self.created_sessions.append(sid)

        # Chunks are different data blocks, padded to exactly match chunk_size
        c1 = b"PART_1_DATA_" * (chunk_size // 12) + b"A" * (chunk_size % 12)
        c2 = b"PART_2_DATA_" * (chunk_size // 12) + b"B" * (chunk_size % 12)
        c3 = b"PART_3_DATA_" * (chunk_size // 12) + b"C" * (chunk_size % 12)
        c4 = b"PART_4_DATA_" * (chunk_size // 12) + b"D" * (chunk_size % 12)
        original_content = c1 + c2 + c3 + c4
        expected_sha = get_sha256(original_content)

        # Upload out of order: 3, 1, 4, 2
        upload_chunk(self.token_a, sid, 3, c3, checksum=get_sha256(c3), size=chunk_size)
        upload_chunk(self.token_a, sid, 1, c1, checksum=get_sha256(c1), size=chunk_size)
        upload_chunk(self.token_a, sid, 4, c4, checksum=get_sha256(c4), size=chunk_size)
        upload_chunk(self.token_a, sid, 2, c2, checksum=get_sha256(c2), size=chunk_size)

        # Complete session with matching client checksum
        res_comp = complete_upload_session(self.token_a, sid, checksum=expected_sha)
        self.assertEqual(res_comp.status_code, 200)
        data = res_comp.json()
        self.created_files.append(data["fileId"])

        # Check response contract
        self.assertEqual(data["sessionId"], sid)
        self.assertEqual(data["status"], "COMPLETED")
        self.assertEqual(data["checksum"], expected_sha)
        self.assertEqual(data["size"], total_size)
        self.assertFalse(data["deduplicated"])
        self.assertIsNotNone(data["completedAt"])

        # Verify downloaded contents match original
        res_dl = download_file(self.token_a, data["fileId"])
        self.assertEqual(res_dl.status_code, 200)
        self.assertEqual(res_dl.content, original_content)

        # Verify temporary folder and files were deleted from the container filesystem
        time.sleep(0.5) # Wait for cleanup to finish writing
        session_exists = check_session_dir_exists_in_container(sid)
        self.assertFalse(session_exists, "Temporary upload directory was not deleted after successful merge completion!")


    # --- 3. FAILURES AND ROLLBACKS ---
    def test_04_mismatched_client_checksum_rollback(self):
        print("Testing: Mismatched client checksum rollback...")
        client_uid = str(uuid.uuid4())
        chunk_size = 256 * 1024
        total_size = chunk_size * 2

        res = create_upload_session(self.token_a, "rollback_checksum.bin", total_size, "application/octet-stream", client_uid, chunkSize=chunk_size)
        sid = res.json()["sessionId"]
        self.created_sessions.append(sid)

        c1 = b"X" * chunk_size
        c2 = b"Y" * chunk_size
        upload_chunk(self.token_a, sid, 1, c1, size=chunk_size)
        upload_chunk(self.token_a, sid, 2, c2, size=chunk_size)

        # Complete with mismatch checksum
        res_comp = complete_upload_session(self.token_a, sid, checksum="wrongchecksum_value_abc123")
        self.assertEqual(res_comp.status_code, 400) # 400 Bad Request

        # Check that session is marked as FAILED in database
        res_get = get_upload_session(self.token_a, sid)
        self.assertEqual(res_get.json()["status"], "FAILED")

        # Verify merged.tmp is deleted (by checking if the directory has merged.tmp)
        time.sleep(0.5)
        merged_exists = check_file_exists_in_container(sid, "merged.tmp")
        self.assertFalse(merged_exists, "Merged temporary file was not cleaned up during checksum validation failure!")


    def test_05_rollback_on_io_failure(self):
        print("Testing: Rollback on IO merge failure...")
        client_uid = str(uuid.uuid4())
        chunk_size = 256 * 1024
        total_size = chunk_size * 2

        res = create_upload_session(self.token_a, "rollback_io.bin", total_size, "application/octet-stream", client_uid, chunkSize=chunk_size)
        sid = res.json()["sessionId"]
        self.created_sessions.append(sid)

        upload_chunk(self.token_a, sid, 1, b"X" * chunk_size, size=chunk_size)
        upload_chunk(self.token_a, sid, 2, b"Y" * chunk_size, size=chunk_size)

        # Delete a physical chunk file inside the container mid-way to trigger IOException during merge
        subprocess.run(["docker", "exec", "cloud_storage_backend", "rm", f"/app/uploads/{sid}/2"])

        # Attempt to complete -> expect failure (500/400 because filesystem fails during merge)
        res_comp = complete_upload_session(self.token_a, sid)
        self.assertNotEqual(res_comp.status_code, 200)

        # Verify session is marked FAILED in DB
        res_get = get_upload_session(self.token_a, sid)
        self.assertEqual(res_get.json()["status"], "FAILED")

        # Verify no merged.tmp exists
        time.sleep(0.5)
        merged_exists = check_file_exists_in_container(sid, "merged.tmp")
        self.assertFalse(merged_exists, "Merged temp file exists despite IO merge failure!")


    # --- 4. IDEMPOTENT COMPLETIONS ---
    def test_06_idempotent_duplicate_completion(self):
        print("Testing: Idempotent duplicate completion requests...")
        client_uid = str(uuid.uuid4())
        chunk_size = 256 * 1024
        total_size = chunk_size * 2

        res = create_upload_session(self.token_a, "idemp_comp.bin", total_size, "application/octet-stream", client_uid, chunkSize=chunk_size)
        sid = res.json()["sessionId"]
        self.created_sessions.append(sid)

        upload_chunk(self.token_a, sid, 1, b"X" * chunk_size, size=chunk_size)
        upload_chunk(self.token_a, sid, 2, b"Y" * chunk_size, size=chunk_size)

        # Call complete 1st time - success
        res1 = complete_upload_session(self.token_a, sid)
        self.assertEqual(res1.status_code, 200)
        data1 = res1.json()
        self.created_files.append(data1["fileId"])

        # Call complete 2nd time - should return identical 200 success response (idempotent behavior)
        res2 = complete_upload_session(self.token_a, sid)
        self.assertEqual(res2.status_code, 200)
        data2 = res2.json()

        self.assertEqual(data1["fileId"], data2["fileId"])
        self.assertEqual(data1["checksum"], data2["checksum"])
        self.assertEqual(data1["storagePath"], data2["storagePath"])
        self.assertEqual(data1["status"], data2["status"])


    # --- 5. DEDUPLICATION HIT SCENARIOS ---
    def test_07_deduplication_hit(self):
        print("Testing: Deduplication hit on completion...")
        content = b"Deduplicated Content Milestone 2.3 Checkpoint" * 6000
        content_sha = get_sha256(content)
        total_size = len(content)

        # 1. Create and complete 1st session
        client_uid1 = str(uuid.uuid4())
        res1 = create_upload_session(self.token_a, "original_file.txt", total_size, "text/plain", client_uid1, chunkSize=total_size)
        sid1 = res1.json()["sessionId"]
        self.created_sessions.append(sid1)

        upload_chunk(self.token_a, sid1, 1, content, size=total_size)
        res_comp1 = complete_upload_session(self.token_a, sid1)
        self.assertEqual(res_comp1.status_code, 200)
        data1 = res_comp1.json()
        self.created_files.append(data1["fileId"])
        self.assertFalse(data1["deduplicated"])

        # Record storage path
        first_path = data1["storagePath"]

        # 2. Create and complete 2nd session with identical content
        client_uid2 = str(uuid.uuid4())
        res2 = create_upload_session(self.token_a, "duplicate_file.txt", total_size, "text/plain", client_uid2, chunkSize=total_size)
        sid2 = res2.json()["sessionId"]
        self.created_sessions.append(sid2)

        upload_chunk(self.token_a, sid2, 1, content, size=total_size)
        res_comp2 = complete_upload_session(self.token_a, sid2)
        self.assertEqual(res_comp2.status_code, 200)
        data2 = res_comp2.json()
        self.created_files.append(data2["fileId"])

        # Check deduplication verification
        self.assertTrue(data2["deduplicated"])
        self.assertEqual(data2["storagePath"], first_path)
        self.assertEqual(data2["checksum"], content_sha)
        self.assertNotEqual(data1["fileId"], data2["fileId"])


    # --- 6. PARALLEL COMPLETIONS (CONCURRENCY) ---
    def test_08_parallel_completion_stress(self):
        print("Testing: Parallel completion concurrency stress load...")
        chunk_size = 256 * 1024
        total_size = chunk_size * 2
        content = b"S" * total_size

        session_ids = []
        for i in range(5):
            client_uid = str(uuid.uuid4())
            res = create_upload_session(self.token_a, f"parallel_{i}.bin", total_size, "application/octet-stream", client_uid, chunkSize=chunk_size)
            self.assertEqual(res.status_code, 200)
            sid = res.json()["sessionId"]
            self.created_sessions.append(sid)
            session_ids.append(sid)

            # Upload chunks
            upload_chunk(self.token_a, sid, 1, content[:chunk_size], size=chunk_size)
            upload_chunk(self.token_a, sid, 2, content[chunk_size:], size=chunk_size)

        results = {}
        lock = threading.Lock()

        def complete_worker(sid):
            res_comp = complete_upload_session(self.token_a, sid)
            with lock:
                results[sid] = res_comp.status_code
                if res_comp.status_code == 200:
                    self.created_files.append(res_comp.json()["fileId"])

        # Complete all 5 sessions concurrently using threads
        with ThreadPoolExecutor(max_workers=5) as executor:
            executor.map(complete_worker, session_ids)

        # Assert all succeeded with 200
        self.assertEqual(len(results), 5)
        for sid, code in results.items():
            self.assertEqual(code, 200, f"Session {sid} failed to complete. Status code: {code}")


def run_tests():
    print("==========================================================")
    print("STARTING MILESTONE 2.3 INTEGRATION TESTS")
    print("==========================================================")
    suite = unittest.TestLoader().loadTestsFromTestCase(Milestone23Tests)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    print("\n==========================================================")
    if result.wasSuccessful():
        print("[SUCCESS] MILESTONE 2.3 INTEGRATION TESTS PASSED!")
        print("==========================================================")
        sys.exit(0)
    else:
        print("[FAIL] MILESTONE 2.3 INTEGRATION TESTS ENCOUNTERED FAILURES.")
        print("==========================================================")
        sys.exit(1)


if __name__ == "__main__":
    run_tests()
