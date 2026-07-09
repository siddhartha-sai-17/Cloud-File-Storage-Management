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

def upload_chunk(token, sessionId, chunkNumber, data, checksum=None, size=None, use_header=False):
    headers = {"Authorization": f"Bearer {token}"}
    if use_header and checksum:
        headers["X-Upload-Chunk-Checksum"] = checksum
    files = {"file": ("chunk.bin", data, "application/octet-stream")}
    params = {"chunkNumber": chunkNumber}
    if size:
        params["size"] = size
    if checksum and not use_header:
        params["checksum"] = checksum
    res = requests.post(f"{BASE_URL}/uploads/session/{sessionId}/chunk", headers=headers, files=files, params=params)
    return res

def verify_session(token, sessionId, checksum=None):
    headers = {"Authorization": f"Bearer {token}"}
    params = {}
    if checksum:
        params["checksum"] = checksum
    res = requests.post(f"{BASE_URL}/uploads/session/{sessionId}/verify", headers=headers, params=params)
    return res

def verify_chunk(token, sessionId, chunkNumber, checksum=None):
    headers = {"Authorization": f"Bearer {token}"}
    params = {}
    if checksum:
        params["checksum"] = checksum
    res = requests.post(f"{BASE_URL}/uploads/session/{sessionId}/chunk/{chunkNumber}/verify", headers=headers, params=params)
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

def get_sha256(data):
    return hashlib.sha256(data).hexdigest()

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

# --- INTEGRATION TEST SUITE ---
class Milestone24Tests(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        print("\n=== Initializing Milestone 2.4 Test Users ===")
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
        # Clean up database sessions & files
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

        # Delete physical folders
        for sid in self.created_sessions:
            subprocess.run(["docker", "exec", "cloud_storage_backend", "rm", "-rf", f"/app/uploads/{sid}"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    def test_01_verification_and_recovery_flow(self):
        print("Testing: Chunk and Session Verification, Corruption, and Recovery...")
        client_uid = str(uuid.uuid4())
        chunk_size = 256 * 1024
        total_size = chunk_size * 3

        # Create session
        res = create_upload_session(self.token_a, "integrity_test.bin", total_size, "application/octet-stream", client_uid, chunkSize=chunk_size)
        self.assertEqual(res.status_code, 200)
        sid = res.json()["sessionId"]
        self.created_sessions.append(sid)

        # Upload 3 valid chunks
        c1 = b"A" * chunk_size
        c2 = b"B" * chunk_size
        c3 = b"C" * chunk_size

        upload_chunk(self.token_a, sid, 1, c1, checksum=get_sha256(c1), size=chunk_size)
        # Upload chunk 2 using X-Upload-Chunk-Checksum header
        upload_chunk(self.token_a, sid, 2, c2, checksum=get_sha256(c2), size=chunk_size, use_header=True)
        upload_chunk(self.token_a, sid, 3, c3, checksum=get_sha256(c3), size=chunk_size)

        # 1. Verify valid chunk 1
        res_cv = verify_chunk(self.token_a, sid, 1)
        self.assertEqual(res_cv.status_code, 200)
        self.assertTrue(res_cv.json()["valid"])
        self.assertEqual(res_cv.json()["status"], "VERIFIED")

        # Check DB status
        rows = execute_mysql_query_fetch("SELECT status, verified_at, checksum_algorithm FROM uploaded_chunks WHERE session_id = %s AND chunk_number = 1", (sid,))
        self.assertEqual(rows[0]["status"], "VERIFIED")
        self.assertIsNotNone(rows[0]["verified_at"])
        self.assertEqual(rows[0]["checksum_algorithm"], "SHA-256")

        # 2. Verify entire session
        res_sv = verify_session(self.token_a, sid)
        self.assertEqual(res_sv.status_code, 200)
        data = res_sv.json()
        self.assertTrue(data["integrityPassed"])
        self.assertEqual(data["totalChunks"], 3)
        self.assertEqual(data["verifiedChunks"], 3)
        self.assertEqual(data["missingChunksCount"], 0)
        self.assertEqual(data["corruptedChunksCount"], 0)

        # 3. Simulate Corruption on chunk 1 (modify physical file keeping size intact)
        subprocess.run(["docker", "exec", "cloud_storage_backend", "sh", "-c", f"echo -n 'corrupt' | dd of=/app/uploads/{sid}/1 bs=1 seek=0 conv=notrunc"])

        # 4. Simulate Truncated chunk on chunk 2 (fewer bytes)
        subprocess.run(["docker", "exec", "cloud_storage_backend", "sh", "-c", f"truncate -s 100 /app/uploads/{sid}/2"])

        # 5. Simulate Missing chunk on chunk 3 (delete file)
        subprocess.run(["docker", "exec", "cloud_storage_backend", "sh", "-c", f"rm /app/uploads/{sid}/3"])

        # 6. Verify entire session with corruption
        res_sv_corrupt = verify_session(self.token_a, sid)
        self.assertEqual(res_sv_corrupt.status_code, 200)
        data_c = res_sv_corrupt.json()
        self.assertFalse(data_c["integrityPassed"])
        self.assertEqual(data_c["corruptedChunksCount"], 2) # chunk 1 and 2
        self.assertEqual(data_c["missingChunksCount"], 1) # chunk 3
        self.assertIn(1, data_c["corruptedChunks"])
        self.assertIn(2, data_c["corruptedChunks"])
        self.assertIn(3, data_c["missingChunks"])

        # Verify database statuses updated
        c1_row = execute_mysql_query_fetch("SELECT status, retry_count, last_failure_reason FROM uploaded_chunks WHERE session_id = %s AND chunk_number = 1", (sid,))
        self.assertEqual(c1_row[0]["status"], "FAILED")
        self.assertEqual(c1_row[0]["retry_count"], 1)
        self.assertIn("checksum", c1_row[0]["last_failure_reason"].lower())

        c2_row = execute_mysql_query_fetch("SELECT status, retry_count, last_failure_reason FROM uploaded_chunks WHERE session_id = %s AND chunk_number = 2", (sid,))
        self.assertEqual(c2_row[0]["status"], "FAILED")
        self.assertEqual(c2_row[0]["retry_count"], 1)
        self.assertIn("size", c2_row[0]["last_failure_reason"].lower())

        c3_row = execute_mysql_query_fetch("SELECT status, retry_count, last_failure_reason FROM uploaded_chunks WHERE session_id = %s AND chunk_number = 3", (sid,))
        self.assertEqual(c3_row[0]["status"], "MISSING")
        self.assertEqual(c3_row[0]["retry_count"], 1)
        self.assertIn("not found", c3_row[0]["last_failure_reason"].lower())

        # 7. Single chunk verify on corrupted chunk should fail with 409 Conflict
        res_cv_corrupt = verify_chunk(self.token_a, sid, 1)
        self.assertEqual(res_cv_corrupt.status_code, 409)

        # 8. Recovery: Re-upload corrupted/missing chunks
        # Chunk 1
        res_up1 = upload_chunk(self.token_a, sid, 1, c1, checksum=get_sha256(c1), size=chunk_size)
        self.assertEqual(res_up1.status_code, 200)

        # Chunk 2
        res_up2 = upload_chunk(self.token_a, sid, 2, c2, checksum=get_sha256(c2), size=chunk_size)
        self.assertEqual(res_up2.status_code, 200)

        # Chunk 3
        res_up3 = upload_chunk(self.token_a, sid, 3, c3, checksum=get_sha256(c3), size=chunk_size)
        self.assertEqual(res_up3.status_code, 200)

        # Verify DB status returned to UPLOADED
        recovery_rows = execute_mysql_query_fetch("SELECT status FROM uploaded_chunks WHERE session_id = %s ORDER BY chunk_number", (sid,))
        self.assertEqual(recovery_rows[0]["status"], "UPLOADED")
        self.assertEqual(recovery_rows[1]["status"], "UPLOADED")
        self.assertEqual(recovery_rows[2]["status"], "UPLOADED")

        # 9. Verify entire session again -> should now pass
        res_sv_recovered = verify_session(self.token_a, sid)
        self.assertEqual(res_sv_recovered.status_code, 200)
        self.assertTrue(res_sv_recovered.json()["integrityPassed"])

    def test_02_concurrency_locks_and_verification_states(self):
        print("Testing: Concurrency blocks during verification...")
        client_uid = str(uuid.uuid4())
        chunk_size = 256 * 1024
        total_size = chunk_size * 2

        res = create_upload_session(self.token_a, "concurrency_verify.bin", total_size, "application/octet-stream", client_uid, chunkSize=chunk_size)
        sid = res.json()["sessionId"]
        self.created_sessions.append(sid)

        c1 = b"X" * chunk_size
        upload_chunk(self.token_a, sid, 1, c1, checksum=get_sha256(c1), size=chunk_size)

        # Let's put the session in VERIFYING state manually via DB to test state machine enforcement
        execute_mysql_query("UPDATE upload_sessions SET status = 'VERIFYING' WHERE id = %s", (sid,))

        # 1. Attempt upload while VERIFYING -> should fail with 409 Conflict
        res_up = upload_chunk(self.token_a, sid, 2, c1, checksum=get_sha256(c1), size=chunk_size)
        self.assertEqual(res_up.status_code, 409)

        # 2. Attempt complete while VERIFYING -> should fail with 409 Conflict
        res_comp = complete_upload_session(self.token_a, sid)
        self.assertEqual(res_comp.status_code, 409)

        # Restore state
        execute_mysql_query("UPDATE upload_sessions SET status = 'UPLOADING' WHERE id = %s", (sid,))

    def test_03_stress_5000_chunks(self):
        print("Testing: Stress verification of 5,000+ chunks...")
        client_uid = str(uuid.uuid4())
        chunk_size = 256 * 1024 # 256KB
        num_chunks = 5000
        total_size = chunk_size * num_chunks

        # Create session
        res = create_upload_session(self.token_a, "stress_5000.bin", total_size, "application/octet-stream", client_uid, chunkSize=chunk_size)
        self.assertEqual(res.status_code, 200)
        sid = res.json()["sessionId"]
        self.created_sessions.append(sid)

        # Generate 256KB template file inside backend container
        subprocess.run(["docker", "exec", "cloud_storage_backend", "dd", "if=/dev/zero", "of=/tmp/template.bin", "bs=1024", "count=256"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        # Create the session directory inside backend container
        subprocess.run(["docker", "exec", "cloud_storage_backend", "mkdir", "-p", f"/app/uploads/{sid}"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        # Copy the template file 5,000 times
        print("Creating 5,000 chunk files inside container... (takes ~2 seconds)")
        # Run copy loop inside container
        subprocess.run(["docker", "exec", "cloud_storage_backend", "sh", "-c", f"for i in $(seq 1 {num_chunks}); do cp /tmp/template.bin /app/uploads/{sid}/$i; done"])

        # Calculate checksum of the template file
        template_checksum = get_sha256(b"\x00" * chunk_size)

        # Populate database records in a single bulk insert
        print("Inserting 5,000 database chunk records...")
        connection = pymysql.connect(
            host='localhost',
            port=3306,
            user='root',
            password='rootpassword',
            database='cloud_storage'
        )
        try:
            with connection.cursor() as cursor:
                sql = "INSERT INTO uploaded_chunks (session_id, chunk_number, chunk_size, checksum, file_path, status, uploaded_at, checksum_algorithm, retry_count) VALUES (%s, %s, %s, %s, %s, %s, NOW(), 'SHA-256', 0)"
                batch_data = []
                for i in range(1, num_chunks + 1):
                    batch_data.append((sid, i, chunk_size, template_checksum, f"/app/uploads/{sid}/{i}", "UPLOADED"))
                cursor.executemany(sql, batch_data)
            connection.commit()
        finally:
            connection.close()

        # Execute session-wide verification
        print("Running verification on 5,000 chunks...")
        start_time = time.time()
        res_sv = verify_session(self.token_a, sid)
        end_time = time.time()

        self.assertEqual(res_sv.status_code, 200)
        data = res_sv.json()
        self.assertTrue(data["integrityPassed"])
        self.assertEqual(data["totalChunks"], num_chunks)
        self.assertEqual(data["verifiedChunks"], num_chunks)
        self.assertEqual(data["missingChunksCount"], 0)
        self.assertEqual(data["corruptedChunksCount"], 0)

        duration = end_time - start_time
        print(f"Verified {num_chunks} chunks in {duration:.2f} seconds ({num_chunks/duration:.2f} chunks/sec).")


def run_tests():
    print("==========================================================")
    print("STARTING MILESTONE 2.4 INTEGRATION & STRESS TESTS")
    print("==========================================================")
    suite = unittest.TestLoader().loadTestsFromTestCase(Milestone24Tests)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    print("\n==========================================================")
    if result.wasSuccessful():
        print("[SUCCESS] MILESTONE 2.4 INTEGRATION TESTS PASSED!")
        print("==========================================================")
        sys.exit(0)
    else:
        print("[FAIL] MILESTONE 2.4 INTEGRATION TESTS ENCOUNTERED FAILURES.")
        print("==========================================================")
        sys.exit(1)


if __name__ == "__main__":
    run_tests()
