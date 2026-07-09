#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Milestone 2.11 — Performance Optimization
Integration Verification Suite
"""
import requests
import time
import sys
import io
import uuid
import hashlib

# Force UTF-8 output on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE = "http://localhost:8080/api"
RESULTS = []

# Unique test user
TEST_USER = f"q11user_{uuid.uuid4().hex[:8]}"
TEST_PASS = "Pass1234!"
TOKEN = None

def register_and_login():
    requests.post(f"{BASE}/auth/register",
                  json={"username": TEST_USER, "password": TEST_PASS,
                        "email": f"{TEST_USER}@test.com"}, timeout=10)
    r = requests.post(f"{BASE}/auth/login",
                      json={"username": TEST_USER, "password": TEST_PASS}, timeout=10)
    return r.json().get("token")

def log(label, passed, detail=""):
    status = "[PASS]" if passed else "[FAIL]"
    msg = f"  {status}: {label}"
    if detail:
        msg += f" | {detail}"
    print(msg)
    RESULTS.append(passed)

def h():
    return {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json"
    }

def create_session(filename="test.bin", size=1024*1024, chunkSize=262144):
    r = requests.post(f"{BASE}/uploads/session",
                      headers=h(),
                      json={"filename": filename, "size": size,
                            "clientUploadId": f"cli-{uuid.uuid4().hex[:8]}",
                            "priority": "NORMAL",
                            "chunkSize": chunkSize,
                            "contentType": "application/octet-stream"},
                      timeout=10)
    if r.status_code == 200:
        # Trigger dequeue to activate the session
        requests.post(f"{BASE}/uploads/queue/dequeue", headers=h(), timeout=10)
    return r

def upload_chunk(sid, chunk_number, data_size):
    dummy_data = b"x" * data_size
    checksum = hashlib.sha256(dummy_data).hexdigest()
    r = requests.post(f"{BASE}/uploads/session/{sid}/chunk",
                      headers={"Authorization": f"Bearer {TOKEN}"},
                      files={"file": (f"chunk-{chunk_number}", dummy_data)},
                      data={"chunkNumber": str(chunk_number), "checksum": checksum},
                      timeout=10)
    return r

# ---------- TESTS ----------

def test_performance_endpoints():
    print("\n--- 1. Testing Performance Metrics Endpoints ---")
    r = create_session(filename="perf-test.bin", size=1048576, chunkSize=524288)
    log("Create session succeeds", r.status_code == 200)
    if r.status_code != 200:
        return
    sid = r.json()["sessionId"]
    
    # Upload first chunk
    u1 = upload_chunk(sid, 1, 524288)
    log("Upload chunk 1 succeeds", u1.status_code == 200, f"body={u1.text}")

    # Check session performance endpoint
    perf_session = requests.get(f"{BASE}/uploads/performance/session/{sid}", headers=h(), timeout=10)
    log("GET session performance status is 200", perf_session.status_code == 200)
    if perf_session.status_code == 200:
        data = perf_session.json()
        log("Snapshot contains sessionId", data.get("sessionId") == sid)
        log("Snapshot contains uploadThroughputMbS", "uploadThroughputMbS" in data)
        log("Snapshot contains bufferPoolSize", data.get("bufferPoolSize") >= 0)
        log("Snapshot contains executorUtilization", "executorUtilization" in data)
        log("Snapshot contains averageChunkProcessingTimeMs", "averageChunkProcessingTimeMs" in data)

    # Check global performance summary endpoint
    perf_summary = requests.get(f"{BASE}/uploads/performance", headers=h(), timeout=10)
    log("GET global performance summary status is 200", perf_summary.status_code == 200)
    if perf_summary.status_code == 200:
        summary = perf_summary.json()
        log("Summary contains systemAverageThroughputMbS", "systemAverageThroughputMbS" in summary)
        log("Summary contains totalChunksProcessed", summary.get("totalChunksProcessed") >= 1)
        log("Summary contains bufferPoolSize", summary.get("bufferPoolSize") >= 0)
        log("Summary has session snapshots list", isinstance(summary.get("sessionSnapshots"), list))

def test_large_upload_simulation():
    print("\n--- 2. Testing Large 1GB Simulated Upload ---")
    # Simulate a 1 GB file: 1 * 1024 * 1024 * 1024 bytes (1073741824)
    large_size = 1 * 1024 * 1024 * 1024
    chunk_size = 5 * 1024 * 1024 # 5 MB chunks
    r = create_session(filename="large-1gb.bin", size=large_size, chunkSize=chunk_size)
    log("Create 1GB session succeeds", r.status_code == 200)
    if r.status_code != 200:
        return
    sid = r.json()["sessionId"]
    
    # Upload first 5MB chunk
    u1 = upload_chunk(sid, 1, chunk_size)
    log("Upload chunk 1 of 1GB session succeeds", u1.status_code == 200, f"body={u1.text}")
    
    # Verify performance metrics calculation for large numbers
    perf_session = requests.get(f"{BASE}/uploads/performance/session/{sid}", headers=h(), timeout=10)
    log("GET large session performance succeeds", perf_session.status_code == 200)
    if perf_session.status_code == 200:
        data = perf_session.json()
        log("Throughput calculation doesn't crash", "uploadThroughputMbS" in data)
        log("Average chunk processing time recorded", data.get("averageChunkProcessingTimeMs") >= 0)

def test_concurrency_stress_load():
    print("\n--- 3. Testing High Concurrency Load (Executor / Buffer Pool Stress) ---")
    from concurrent.futures import ThreadPoolExecutor

    # Run 5 concurrent session uploads
    sessions_to_run = 5
    chunks_per_session = 3
    chunk_sz = 262144 # Min chunk size 256 KB
    
    sids = []
    for i in range(sessions_to_run):
        r = create_session(filename=f"stress-{i}.bin", size=chunk_sz*chunks_per_session, chunkSize=chunk_sz)
        if r.status_code == 200:
            sids.append(r.json()["sessionId"])
            
    log(f"Created {len(sids)} sessions for stress test", len(sids) == sessions_to_run)

    errors = []
    def upload_worker(sid, chunk_num):
        res = upload_chunk(sid, chunk_num, chunk_sz)
        if res.status_code != 200:
            errors.append(f"Session {sid} Chunk {chunk_num} failed: {res.status_code} - {res.text}")

    # Use ThreadPoolExecutor to upload chunks in parallel
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = []
        for sid in sids:
            for c in range(1, chunks_per_session + 1):
                futures.append(executor.submit(upload_worker, sid, c))
        for f in futures:
            f.result()

    log("All concurrent stress chunk uploads succeeded without connection pool deadlock or errors", len(errors) == 0, f"errors={errors}")

    # Complete one session to verify merge and object storage upload stats
    if sids:
        merge_r = requests.post(f"{BASE}/uploads/session/{sids[0]}/complete", headers=h(), timeout=10)
        log("Complete session succeeds", merge_r.status_code == 200, f"body={merge_r.text}")
        
        # Verify merge metrics are populated
        perf_session = requests.get(f"{BASE}/uploads/performance/session/{sids[0]}", headers=h(), timeout=10)
        if perf_session.status_code == 200:
            data = perf_session.json()
            log("Merge duration recorded in performance snapshot", data.get("mergeDurationMs") >= 0)
            log("Object storage upload duration recorded", data.get("objectStorageUploadDurationMs") >= 0)
            log("DB commit duration recorded", data.get("databaseCommitDurationMs") >= 0)

if __name__ == "__main__":
    print("==========================================================")
    print("STARTING MILESTONE 2.11 PERFORMANCE INTEGRATION TESTS")
    print("==========================================================")
    TOKEN = register_and_login()
    if not TOKEN:
        print("[FAIL] Authentication registration/login failed")
        sys.exit(1)
        
    test_performance_endpoints()
    test_large_upload_simulation()
    test_concurrency_stress_load()

    print("==========================================================")
    if all(RESULTS) and len(RESULTS) > 0:
        print("[SUCCESS] ALL MILESTONE 2.11 INTEGRATION TESTS PASSED!")
        sys.exit(0)
    else:
        print("[FAIL] MILESTONE 2.11 INTEGRATION TESTS ENCOUNTERED FAILURES.")
        sys.exit(1)
