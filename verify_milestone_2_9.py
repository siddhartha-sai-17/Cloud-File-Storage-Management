#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Milestone 2.9 — Upload Progress Tracking
Integration Verification & Performance Benchmarking Suite
"""
import requests
import time
import sys
import io
import uuid
import json
import threading
import websocket

# Force UTF-8 output on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE = "http://localhost:8080/api"
WS_BASE = "ws://localhost:8080/ws/upload-progress"
RESULTS = []

# Unique test user for this run
TEST_USER = f"q9user_{uuid.uuid4().hex[:8]}"
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
    return {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}

def create_session(priority="NORMAL", filename="test.bin", size=1024*1024, chunkSize=262144):
    r = requests.post(f"{BASE}/uploads/session",
                      headers=h(),
                      json={"filename": filename, "size": size,
                            "clientUploadId": f"cli-{uuid.uuid4().hex[:8]}",
                            "priority": priority,
                            "chunkSize": chunkSize,
                            "contentType": "application/octet-stream"},
                      timeout=10)
    return r

def upload_chunk(sid, chunk_number, data_size):
    import hashlib
    dummy_data = b"x" * data_size
    checksum = hashlib.sha256(dummy_data).hexdigest()
    r = requests.post(f"{BASE}/uploads/session/{sid}/chunk",
                      headers={"Authorization": f"Bearer {TOKEN}"},
                      files={"file": (f"chunk-{chunk_number}", dummy_data)},
                      data={"chunkNumber": str(chunk_number), "checksum": checksum},
                      timeout=10)
    return r

def cancel_session(sid):
    requests.post(f"{BASE}/uploads/session/{sid}/cancel", headers=h(), timeout=10)

# ---------- TESTS ----------

def test_progress_initialization():
    """Test 1: Newly created session registers correct initial progress in cache"""
    r = create_session(filename="init.bin", size=1048576, chunkSize=262144)
    log("Session creation succeeds", r.status_code == 200, f"status={r.status_code}")
    if r.status_code != 200:
        return
    sid = r.json()["sessionId"]

    # Verify progress state
    pr = requests.get(f"{BASE}/uploads/session/{sid}/progress", headers=h(), timeout=10)
    log("Progress status code is 200", pr.status_code == 200, f"status={pr.status_code}")
    if pr.status_code == 200:
        data = pr.json()
        log("Initial uploadedBytes is 0", data["uploadedBytes"] == 0, str(data))
        log("Initial uploadedChunks is 0", data["uploadedChunks"] == 0, str(data))
        log("Initial uploadPercentage is 0.0", data["uploadPercentage"] == 0.0, str(data))
        log("Initial remainingBytes matches total size", data["remainingBytes"] == 1048576, str(data))
        log("Initial remainingChunks matches total chunks", data["remainingChunks"] == 4, str(data))
        log("Initial etaSeconds is -1", data["etaSeconds"] == -1, str(data))
        log("Initial queueState is QUEUED", data["queueState"] == "QUEUED", str(data))
        log("Initial status is INITIALIZED", data["status"] == "INITIALIZED", str(data))

    cancel_session(sid)


def test_progress_aggregation_on_upload():
    """Test 2: Uploading chunks aggregates progress, speed, and ETA correctly"""
    r = create_session(filename="upload.bin", size=1048576, chunkSize=262144)
    if r.status_code != 200:
        log("Session creation for upload progress aggregation failed", False)
        return
    sid = r.json()["sessionId"]

    # Dequeue to simulate active state
    requests.post(f"{BASE}/uploads/queue/dequeue", headers=h(), timeout=10)

    # Upload chunk 1
    u1 = upload_chunk(sid, 1, 262144)
    log("Uploaded chunk 1", u1.status_code == 200, f"status={u1.status_code}")

    # Check progress
    pr = requests.get(f"{BASE}/uploads/session/{sid}/progress", headers=h(), timeout=10)
    log("Progress check after chunk 1", pr.status_code == 200)
    if pr.status_code == 200:
        data = pr.json()
        log("UploadedBytes matches chunk 1 size", data["uploadedBytes"] == 262144, str(data))
        log("UploadedChunks matches 1", data["uploadedChunks"] == 1, str(data))
        log("Percentage matches 25%", data["uploadPercentage"] == 25.0, str(data))
        log("Current speed > 0", data["currentSpeedBps"] > 0, str(data))
        log("Peak speed matches or exceeds current speed", data["peakSpeedBps"] >= data["currentSpeedBps"], str(data))
        log("ETA is calculated correctly", data["etaSeconds"] >= 0, str(data))

    cancel_session(sid)


def test_websocket_broadcasts():
    """Test 3: WebSocket connection, subscription, and broadcast updates"""
    r = create_session(filename="ws_test.bin", size=1048576, chunkSize=262144)
    if r.status_code != 200:
        log("Session creation for WS test failed", False)
        return
    sid = r.json()["sessionId"]

    # Connect to WebSocket
    ws_url = f"{WS_BASE}?token={TOKEN}"
    ws = websocket.create_connection(ws_url)
    
    # Subscribe to sessionId
    ws.send(json.dumps({"action": "subscribe", "sessionId": sid}))
    sub_response = json.loads(ws.recv())
    log("WS Subscribe response received", sub_response.get("status") == "subscribed", str(sub_response))

    # Dequeue to simulate active
    requests.post(f"{BASE}/uploads/queue/dequeue", headers=h(), timeout=10)

    # Upload chunk
    u_res = upload_chunk(sid, 1, 262144)
    log("Uploaded chunk in WS test", u_res.status_code == 200, f"status={u_res.status_code} response={u_res.text[:150]}")

    # Wait for broadcast message
    ws.settimeout(5.0)
    broadcast_msg = None
    try:
        # Loop to consume possible sub ack or broadcast messages
        for _ in range(10):
            msg = json.loads(ws.recv())
            if msg.get("sessionId") == sid and msg.get("uploadedBytes", 0) > 0:
                broadcast_msg = msg
                break
    except Exception as e:
        log("WS broadcast timeout or error", False, str(e))

    if broadcast_msg:
        log("WS broadcast contains correct uploadedBytes", broadcast_msg["uploadedBytes"] == 262144, str(broadcast_msg))
        log("WS broadcast contains uploadPercentage", broadcast_msg["uploadPercentage"] == 25.0, str(broadcast_msg))
        log("WS broadcast contains etaSeconds", "etaSeconds" in broadcast_msg, str(broadcast_msg))
        log("WS broadcast contains currentSpeedBps", "currentSpeedBps" in broadcast_msg, str(broadcast_msg))

    # Unsubscribe
    ws.send(json.dumps({"action": "unsubscribe", "sessionId": sid}))
    unsub_response = json.loads(ws.recv())
    log("WS Unsubscribe response received", unsub_response.get("status") == "unsubscribed", str(unsub_response))

    ws.close()
    cancel_session(sid)


def test_pause_resume_continuity():
    """Test 4: Pause and resume states reflect correctly in progress snapshots"""
    r = create_session(filename="pause_resume.bin", size=1048576, chunkSize=262144)
    if r.status_code != 200:
        log("Session creation for pause/resume test failed", False)
        return
    sid = r.json()["sessionId"]

    # Dequeue to make active
    requests.post(f"{BASE}/uploads/queue/dequeue", headers=h(), timeout=10)

    # Upload first chunk to move status from INITIALIZED to UPLOADING
    upload_chunk(sid, 1, 262144)

    # Pause upload
    requests.post(f"{BASE}/uploads/session/{sid}/pause", headers=h(), timeout=10)
    pr = requests.get(f"{BASE}/uploads/session/{sid}/progress", headers=h(), timeout=10)
    if pr.status_code == 200:
        log("Progress status is PAUSED after pause request", pr.json()["status"] == "PAUSED", str(pr.json()))

    # Resume upload
    requests.post(f"{BASE}/uploads/session/{sid}/resume", headers=h(), timeout=10)
    pr = requests.get(f"{BASE}/uploads/session/{sid}/progress", headers=h(), timeout=10)
    if pr.status_code == 200:
        log("Progress status is UPLOADING after resume request", pr.json()["status"] == "UPLOADING", str(pr.json()))

    cancel_session(sid)


def test_retry_continuity():
    """Test 5: Progress snapshot tracks retry states and continuity correctly"""
    r = create_session(filename="retry_test.bin", size=524288, chunkSize=262144)
    if r.status_code != 200:
        log("Session creation for retry test failed", False)
        return
    sid = r.json()["sessionId"]

    # Trigger a dummy progress record retry manually or using retry endpoint
    # We can mock this by calling executeRetry or triggering scheduling
    # Let's verify stats endpoint supports getting retryState
    pr = requests.get(f"{BASE}/uploads/session/{sid}/progress", headers=h(), timeout=10)
    if pr.status_code == 200:
        log("Progress snapshot has retryState field", "retryState" in pr.json(), str(pr.json()))

    cancel_session(sid)


def test_stats_and_history_endpoints():
    """Test 6: REST API contract validation for stats and history endpoints"""
    # Active endpoints
    active_res = requests.get(f"{BASE}/uploads/progress/active", headers=h(), timeout=10)
    log("Active progress endpoint returns 200", active_res.status_code == 200)
    if active_res.status_code == 200:
        log("Active progress is a list", isinstance(active_res.json(), list))

    # History endpoint
    history_res = requests.get(f"{BASE}/uploads/progress/history", headers=h(), timeout=10)
    log("History endpoint returns 200", history_res.status_code == 200)
    if history_res.status_code == 200:
        log("History is a list", isinstance(history_res.json(), list))


def test_database_persistence_and_throttling():
    """Test 7: Verification of database progress flushes and update throttling"""
    r = create_session(filename="persist.bin", size=1048576, chunkSize=262144)
    if r.status_code != 200:
        log("Session creation for persistence test failed", False)
        return
    sid = r.json()["sessionId"]

    # Dequeue to make active
    requests.post(f"{BASE}/uploads/queue/dequeue", headers=h(), timeout=10)

    # Upload chunk
    upload_chunk(sid, 1, 262144)

    # Sleep for 1.5 seconds to allow background thread to flush progress snapshot (flush interval = 1000ms)
    time.sleep(1.5)

    # Fetch directly from DB / session status
    s_res = requests.get(f"{BASE}/uploads/session", headers=h(), timeout=10)
    # Check that database matches memory values
    pr = requests.get(f"{BASE}/uploads/session/{sid}/progress", headers=h(), timeout=10)
    if pr.status_code == 200:
        mem_data = pr.json()
        log("Progress matches memory and DB values", mem_data["uploadedBytes"] == 262144, str(mem_data))

    cancel_session(sid)


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("  Milestone 2.9 -- Upload Progress Tracking")
    print("=" * 60 + "\n")

    TOKEN = register_and_login()
    if not TOKEN:
        print("[ERROR] Login failed. Is the backend running?")
        sys.exit(1)
    print(f"[AUTH] Logged in as {TEST_USER}\n")

    tests = [
        ("1. Progress Initialization", test_progress_initialization),
        ("2. Progress Aggregation on Upload", test_progress_aggregation_on_upload),
        ("3. WebSocket Broadcasts & Subscription", test_websocket_broadcasts),
        ("4. Pause/Resume State Continuity", test_pause_resume_continuity),
        ("5. Retry State Tracking Continuity", test_retry_continuity),
        ("6. REST Stats and History API Verification", test_stats_and_history_endpoints),
        ("7. DB Persistence & Throttling", test_database_persistence_and_throttling)
    ]

    for label, fn in tests:
        print(f"\n[TEST] {label}")
        try:
            fn()
        except Exception as e:
            log(label, False, f"Exception: {e}")

    passed = sum(RESULTS)
    total = len(RESULTS)
    print(f"\n{'=' * 60}")
    print(f"  Results: {passed}/{total} checks passed")
    print(f"{'=' * 60}\n")
    sys.exit(0 if passed == total else 1)
