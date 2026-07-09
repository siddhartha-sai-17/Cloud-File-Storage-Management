#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Phase 3 — File Versioning
Integration & Regression Verification Suite
"""
import requests
import time
import sys
import io
import uuid
import json
import hashlib
from concurrent.futures import ThreadPoolExecutor

# Force UTF-8 output on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE = "http://localhost:8080/api"
RESULTS = []

# Unique test user for this run
TEST_USER = f"veruser_{uuid.uuid4().hex[:8]}"
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

def h(ip="1.2.3.4", ua="test-agent"):
    return {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json",
        "X-Forwarded-For": ip,
        "User-Agent": ua
    }

def create_session(filename, size, changeDescription=None, chunkSize=262144):
    payload = {
        "filename": filename,
        "size": size,
        "clientUploadId": f"cli-{uuid.uuid4().hex[:8]}",
        "chunkSize": chunkSize,
        "contentType": "application/octet-stream"
    }
    if changeDescription:
        payload["changeDescription"] = changeDescription

    r = requests.post(f"{BASE}/uploads/session", headers=h(), json=payload, timeout=10)
    return r

def upload_chunk(sid, chunk_number, dummy_data):
    checksum = hashlib.sha256(dummy_data).hexdigest()
    r = requests.post(f"{BASE}/uploads/session/{sid}/chunk",
                      headers={"Authorization": f"Bearer {TOKEN}"},
                      files={"file": (f"chunk-{chunk_number}", dummy_data)},
                      data={"chunkNumber": str(chunk_number), "checksum": checksum},
                      timeout=10)
    return r

def complete_session(sid, checksum):
    r = requests.post(f"{BASE}/uploads/session/{sid}/complete",
                      headers=h(),
                      json={"clientChecksum": checksum},
                      timeout=10)
    return r

def upload_file_via_pipeline(filename, content_bytes, changeDescription=None):
    size = len(content_bytes)
    r_sess = create_session(filename, size, changeDescription)
    if r_sess.status_code != 200:
        raise Exception(f"Session creation failed: {r_sess.text}")
    
    sid = r_sess.json()["sessionId"]
    chunk_size = r_sess.json()["chunkSize"]
    
    # Slice and upload chunks
    offset = 0
    chunk_number = 1
    while offset < size:
        chunk_data = content_bytes[offset:offset+chunk_size]
        r_chunk = upload_chunk(sid, chunk_number, chunk_data)
        if r_chunk.status_code != 200:
            raise Exception(f"Chunk {chunk_number} upload failed: {r_chunk.text}")
        offset += chunk_size
        chunk_number += 1
        
    full_checksum = hashlib.sha256(content_bytes).hexdigest()
    r_comp = complete_session(sid, full_checksum)
    if r_comp.status_code != 200:
        raise Exception(f"Session completion failed: {r_comp.text}")
    return r_comp.json()

def direct_upload(filename, content_bytes):
    files = {'file': (filename, content_bytes, 'application/octet-stream')}
    r = requests.post(f"{BASE}/storage/upload",
                      headers={"Authorization": f"Bearer {TOKEN}"},
                      files=files,
                      timeout=10)
    return r

# ---------- TESTS ----------

def test_versioning_lifecycle():
    global TOKEN
    TOKEN = register_and_login()
    
    print("\n=== Test 1: Upload File Creates Version 1 ===")
    filename = "ver-test-file.bin"
    content_v1 = b"Hello Version 1 - Content data of version one"
    
    res = upload_file_via_pipeline(filename, content_v1, "Initial release")
    file_id = res["fileId"]
    log("Initial upload finished successfully", file_id is not None, f"fileId={file_id}")
    
    # Verify current version via endpoint
    r_curr = requests.get(f"{BASE}/files/{file_id}/versions/current", headers=h(), timeout=10)
    log("GET current version metadata status 200", r_curr.status_code == 200, f"status={r_curr.status_code}")
    if r_curr.status_code == 200:
        curr_data = r_curr.json()
        log("Current version number is 1", curr_data["versionNumber"] == 1, f"version={curr_data['versionNumber']}")
        log("Current version has currentVersion=True", curr_data["currentVersion"] is True)
        log("Change description is populated", curr_data["changeDescription"] == "Initial release")
    
    print("\n=== Test 2: Upload Subsequent Revisions (V2, V3) ===")
    content_v2 = b"Hello Version 2 - Content data updated for version two"
    upload_file_via_pipeline(filename, content_v2, "V2 Bugfixes")
    
    content_v3 = b"Hello Version 3 - Third version revision content"
    upload_file_via_pipeline(filename, content_v3, "V3 Feature release")
    
    # Query version history
    r_hist = requests.get(f"{BASE}/files/{file_id}/versions", headers=h(), timeout=10)
    log("GET version history status 200", r_hist.status_code == 200)
    if r_hist.status_code == 200:
        history = r_hist.json()["content"]
        log("History contains exactly 3 versions", len(history) == 3, f"versions={len(history)}")
        log("Current version value in history is V3", history[0]["versionNumber"] == 3 and history[0]["currentVersion"] is True)
        log("Previous versions are marked current=False", history[1]["currentVersion"] is False and history[2]["currentVersion"] is False)
        
    print("\n=== Test 3: Pagination, Sorting & Filtering ===")
    r_sort = requests.get(f"{BASE}/files/{file_id}/versions?sortBy=versionNumber&direction=asc", headers=h(), timeout=10)
    if r_sort.status_code == 200:
        history_asc = r_sort.json()["content"]
        log("Sorted ascending returns version 1 first", history_asc[0]["versionNumber"] == 1)
        
    r_filter = requests.get(f"{BASE}/files/{file_id}/versions?contentType=application/octet-stream", headers=h(), timeout=10)
    if r_filter.status_code == 200:
        filtered = r_filter.json()["content"]
        log("Filtering returns versions matching contentType", len(filtered) == 3)
        
    print("\n=== Test 4: Restore Version ===")
    # Find Version 1 ID
    v1_id = None
    if r_hist.status_code == 200:
        for v in r_hist.json()["content"]:
            if v["versionNumber"] == 1:
                v1_id = v["id"]
                
    log("Found Version 1 ID", v1_id is not None, f"v1_id={v1_id}")
    if v1_id:
        r_rest = requests.post(f"{BASE}/files/{file_id}/versions/{v1_id}/restore", headers=h(), timeout=10)
        log("POST restore status 200", r_rest.status_code == 200, f"status={r_rest.status_code}")
        if r_rest.status_code == 200:
            restored = r_rest.json()
            log("Restored version is V4", restored["versionNumber"] == 4)
            log("Restored version points to V1", restored["restoredFromVersion"] == 1)
            log("Restored version is current", restored["currentVersion"] is True)
            
            # Download file from storage and assert content matches V1
            r_down = requests.get(f"{BASE}/storage/download/{file_id}", headers=h(), timeout=10)
            log("Download file succeeds", r_down.status_code == 200)
            log("Downloaded content matches V1", r_down.content == content_v1)

    print("\n=== Test 5: Version Download & View Audit events ===")
    # Download specific version V3
    v3_id = None
    if r_hist.status_code == 200:
        for v in r_hist.json()["content"]:
            if v["versionNumber"] == 3:
                v3_id = v["id"]
                
    if v3_id:
        r_down_v3 = requests.get(f"{BASE}/files/{file_id}/versions/{v3_id}/download", headers=h(), timeout=10)
        log("Download specific version V3 status 200", r_down_v3.status_code == 200)
        log("Downloaded version V3 content matches", r_down_v3.content == content_v3)
        
        # View metadata of specific version V3 (triggers VERSION_VIEWED)
        r_view = requests.get(f"{BASE}/files/{file_id}/versions/{v3_id}", headers=h(), timeout=10)
        log("View version V3 metadata status 200", r_view.status_code == 200)

    print("\n=== Test 6: Safe Version Deletion ===")
    # Find Version 2 ID
    v2_id = None
    if r_hist.status_code == 200:
        for v in r_hist.json()["content"]:
            if v["versionNumber"] == 2:
                v2_id = v["id"]
                
    if v2_id:
        r_del = requests.delete(f"{BASE}/files/{file_id}/versions/{v2_id}", headers=h(), timeout=10)
        log("Delete version V2 status 204", r_del.status_code == 204)
        
        # Verify history no longer contains Version 2
        r_hist_post = requests.get(f"{BASE}/files/{file_id}/versions", headers=h(), timeout=10)
        if r_hist_post.status_code == 200:
            hist_post = r_hist_post.json()["content"]
            log("History has exactly 3 versions remaining", len(hist_post) == 3)
            matching_v2 = [v for v in hist_post if v["versionNumber"] == 2]
            log("Version 2 is absent from list", len(matching_v2) == 0)

    print("\n=== Test 7: Concurrency & Lock Map Stress ===")
    # Launch 5 concurrent direct uploads to the same filename
    # Under high concurrency, they must successfully order version numbers V5, V6, V7, V8, V9
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(direct_upload, filename, b"Concurrent content upload " + bytes([i])) for i in range(5)]
        
    responses = [f.result() for f in futures]
    all_ok = all(r.status_code == 200 for r in responses)
    log("All 5 concurrent uploads completed with 200 OK", all_ok, f"statuses={[r.status_code for r in responses]}")
    
    # Retrieve complete version history
    r_hist_final = requests.get(f"{BASE}/files/{file_id}/versions?size=50&sortBy=versionNumber&direction=asc", headers=h(), timeout=10)
    if r_hist_final.status_code == 200:
        final_history = r_hist_final.json()["content"]
        version_numbers = [v["versionNumber"] for v in final_history]
        print(f"  All version numbers in DB: {version_numbers}")
        # Verify no duplicate version numbers
        has_duplicates = len(version_numbers) != len(set(version_numbers))
        log("No duplicate version numbers were created", not has_duplicates)

    print("\n=== Test 8: Audit Logs Generation ===")
    r_audit = requests.get(f"{BASE}/uploads/history/audit?size=100", headers=h(), timeout=10)
    if r_audit.status_code == 200:
        events = r_audit.json()["content"]
        event_types = [e["eventType"] for e in events]
        print(f"  Audit events found: {set(event_types)}")
        log("Audit logs contain VERSION_CREATED", "VERSION_CREATED" in event_types)
        log("Audit logs contain VERSION_RESTORED", "VERSION_RESTORED" in event_types)
        log("Audit logs contain VERSION_DELETED", "VERSION_DELETED" in event_types)
        log("Audit logs contain VERSION_DOWNLOADED", "VERSION_DOWNLOADED" in event_types)
        log("Audit logs contain VERSION_VIEWED", "VERSION_VIEWED" in event_types)

def main():
    print("==========================================================")
    print("STARTING PHASE 3 FILE VERSIONING INTEGRATION TESTS")
    print("==========================================================")
    
    try:
        test_versioning_lifecycle()
    except Exception as e:
        print(f"[ERROR] Test execution failed: {e}")
        import traceback
        traceback.print_exc()
        RESULTS.append(False)
        
    print("\n==========================================================")
    if all(RESULTS) and len(RESULTS) > 0:
        print("[SUCCESS] ALL PHASE 3 VERSIONING INTEGRATION TESTS PASSED!")
        sys.exit(0)
    else:
        print("[FAIL] PHASE 3 INTEGRATION TESTS ENCOUNTERED FAILURES.")
        sys.exit(1)

if __name__ == "__main__":
    main()
