#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Milestone 2.10 — Upload History & Audit Logs
Integration Verification & Integrity Check Suite
"""
import requests
import time
import sys
import io
import uuid
import json

# Force UTF-8 output on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE = "http://localhost:8080/api"
RESULTS = []

# Unique test user for this run
TEST_USER = f"q10user_{uuid.uuid4().hex[:8]}"
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

def create_session(priority="NORMAL", filename="test.bin", size=1024*1024, chunkSize=262144, ip="1.2.3.4", ua="test-agent"):
    r = requests.post(f"{BASE}/uploads/session",
                      headers=h(ip, ua),
                      json={"filename": filename, "size": size,
                            "clientUploadId": f"cli-{uuid.uuid4().hex[:8]}",
                            "priority": priority,
                            "chunkSize": chunkSize,
                            "contentType": "application/octet-stream"},
                      timeout=10)
    return r

def upload_chunk(sid, chunk_number, data_size, ip="1.2.3.4", ua="test-agent"):
    import hashlib
    dummy_data = b"x" * data_size
    checksum = hashlib.sha256(dummy_data).hexdigest()
    r = requests.post(f"{BASE}/uploads/session/{sid}/chunk",
                      headers={
                          "Authorization": f"Bearer {TOKEN}",
                          "X-Forwarded-For": ip,
                          "User-Agent": ua
                      },
                      files={"file": (f"chunk-{chunk_number}", dummy_data)},
                      data={"chunkNumber": str(chunk_number), "checksum": checksum},
                      timeout=10)
    return r

def cancel_session(sid, ip="1.2.3.4", ua="test-agent"):
    r = requests.delete(f"{BASE}/uploads/session/{sid}", headers=h(ip, ua), timeout=10)
    return r

# ---------- TESTS ----------

def test_audit_context_and_events():
    """Test 1: Check audit event generation with IP & User Agent context"""
    custom_ip = "192.168.1.100"
    custom_ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) VerifySuite/1.0"
    
    r = create_session(filename="audit-test.bin", size=1048576, chunkSize=262144, ip=custom_ip, ua=custom_ua)
    log("Session creation succeeds", r.status_code == 200, f"status={r.status_code}")
    if r.status_code != 200:
        return
    
    sid = r.json()["sessionId"]
    
    # 1. Verify history endpoint displays the session
    hist = requests.get(f"{BASE}/uploads/history", headers=h(), timeout=10)
    log("Upload history retrieval succeeds", hist.status_code == 200, f"status={hist.status_code}")
    if hist.status_code == 200:
        sessions = hist.json()["content"]
        matching = [s for s in sessions if s["id"] == sid]
        log("History contains the created session", len(matching) > 0, f"sessions={len(sessions)}")
        if matching:
            log("Session status is correct in history", matching[0]["status"] == "INITIALIZED", f"status={matching[0]['status']}")

    # 2. Verify audit logs contain the SESSION_CREATED event with IP and UA
    audit = requests.get(f"{BASE}/uploads/history/audit?sessionId={sid}", headers=h(), timeout=10)
    log("Audit logs retrieval succeeds", audit.status_code == 200, f"status={audit.status_code}")
    if audit.status_code == 200:
        events = audit.json()["content"]
        log("Audit logs have events", len(events) > 0)
        
        created_events = [e for e in events if e["eventType"] == "SESSION_CREATED"]
        log("SESSION_CREATED event exists", len(created_events) > 0, str(events))
        if created_events:
            ev = created_events[0]
            log("IP Address is captured correctly", ev["clientIp"] == custom_ip, f"ip={ev['clientIp']}")
            log("User Agent is captured correctly", ev["userAgent"] == custom_ua, f"ua={ev['userAgent']}")
            log("Result status is SUCCESS", ev["resultStatus"] == "SUCCESS", f"result={ev['resultStatus']}")
            log("Username matches test user", ev["username"] == TEST_USER, f"user={ev['username']}")
            
        queued_events = [e for e in events if e["eventType"] == "QUEUE_ENTERED" or e["eventType"] == "QUEUED"]
        log("QUEUE_ENTERED/QUEUED event exists", len(queued_events) > 0, str(events))

    # 3. Upload a chunk and verify CHUNK_UPLOADED event
    up_r = upload_chunk(sid, 1, 262144, ip=custom_ip, ua=custom_ua)
    log("Chunk upload succeeds", up_r.status_code == 200, f"status={up_r.status_code}")
    
    audit_chunk = requests.get(f"{BASE}/uploads/history/audit?sessionId={sid}&eventType=CHUNK_UPLOADED", headers=h(), timeout=10)
    if audit_chunk.status_code == 200:
        chunk_events = audit_chunk.json()["content"]
        log("CHUNK_UPLOADED audit event exists", len(chunk_events) > 0, str(chunk_events))
        if chunk_events:
            log("Chunk event IP matches", chunk_events[0]["clientIp"] == custom_ip, f"ip={chunk_events[0]['clientIp']}")

    # 4. Cancel session and check cancellation/deletion audit event
    cancel_r = cancel_session(sid, ip=custom_ip, ua=custom_ua)
    log("Cancel session succeeds", cancel_r.status_code == 200, f"status={cancel_r.status_code}")
    
    audit_cancel = requests.get(f"{BASE}/uploads/history/audit?sessionId={sid}", headers=h(), timeout=10)
    if audit_cancel.status_code == 200:
        cancel_events = [e for e in audit_cancel.json()["content"] if e["eventType"] in ["SESSION_DELETED", "UPLOAD_DELETED", "QUEUE_CANCELLED"]]
        log("Cancellation audit events exist", len(cancel_events) > 0, str(cancel_events))

def test_pagination_and_filtering():
    """Test 2: Paginated history, sorting, and filter checks"""
    # Create another session to have multiple history records
    create_session(filename="filter-test-1.bin", size=500000, chunkSize=262144)
    create_session(filename="filter-test-2.bin", size=600000, chunkSize=262144)
    
    # 1. Filter by status
    hist_f = requests.get(f"{BASE}/uploads/history?status=INITIALIZED", headers=h(), timeout=10)
    log("Filter by status code succeeds", hist_f.status_code == 200)
    if hist_f.status_code == 200:
        content = hist_f.json()["content"]
        all_initialized = all(s["status"] == "INITIALIZED" for s in content)
        log("All filtered sessions are INITIALIZED", all_initialized, str(content))
        log("Filtered list contains multiple items", len(content) >= 2, f"size={len(content)}")

    # 2. Pagination check (size=1)
    hist_page = requests.get(f"{BASE}/uploads/history?size=1", headers=h(), timeout=10)
    log("Pagination request succeeds", hist_page.status_code == 200)
    if hist_page.status_code == 200:
        data = hist_page.json()
        log("Page size equals 1", len(data["content"]) == 1, str(data))
        log("Total elements is at least 3", data["totalElements"] >= 3, str(data))

    # 3. Sorting check
    hist_sort = requests.get(f"{BASE}/uploads/history?sort=filename,asc", headers=h(), timeout=10)
    log("Sorting request succeeds", hist_sort.status_code == 200)
    if hist_sort.status_code == 200:
        filenames = [s["filename"] for s in hist_sort.json()["content"]]
        sorted_filenames = sorted(filenames)
        log("Filenames are sorted ascendingly", filenames == sorted_filenames, f"returned={filenames}, expected={sorted_filenames}")

def test_retention_cleanup():
    """Test 3: Manual retention cleanup trigger"""
    cleanup = requests.post(f"{BASE}/uploads/history/cleanup", headers=h(), timeout=10)
    log("Trigger manual retention cleanup returns 200 OK", cleanup.status_code == 200)

if __name__ == "__main__":
    print("=== Milestone 2.10 Verification Suite ===")
    try:
        TOKEN = register_and_login()
        log("User registration & login succeeds", TOKEN is not None)
        if TOKEN:
            test_audit_context_and_events()
            test_pagination_and_filtering()
            test_retention_cleanup()
    except Exception as e:
        print(f"Error during verification: {e}")
        RESULTS.append(False)

    print("\nVerification Results Summary:")
    all_ok = all(RESULTS) and len(RESULTS) > 0
    print(f"Overall status: {'SUCCESS' if all_ok else 'FAILED'}")
    sys.exit(0 if all_ok else 1)
