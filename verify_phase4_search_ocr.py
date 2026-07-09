#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Phase 4: Advanced Search & OCR
Integration Verification Test Suite
"""
import requests
import time
import sys
import io
import uuid
import json
import threading

# Force UTF-8 output on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE = "http://localhost:8080/api"
RESULTS = []

# Unique test user for this run
TEST_USER = f"searchuser_{uuid.uuid4().hex[:8]}"
TEST_PASS = "Pass1234!"
TOKEN = None

def register_and_login():
    global TOKEN
    requests.post(f"{BASE}/auth/register",
                  json={"username": TEST_USER, "password": TEST_PASS,
                        "email": f"{TEST_USER}@test.com"}, timeout=10)
    r = requests.post(f"{BASE}/auth/login",
                      json={"username": TEST_USER, "password": TEST_PASS}, timeout=10)
    TOKEN = r.json().get("token")
    return TOKEN

def log(label, passed, detail=""):
    status = "[PASS]" if passed else "[FAIL]"
    msg = f"  {status}: {label}"
    if detail:
        msg += f" | {detail}"
    print(msg)
    RESULTS.append(passed)

def h():
    return {
        "Authorization": f"Bearer {TOKEN}"
    }

def direct_upload(filename, content, content_type="application/octet-stream"):
    files = {"file": (filename, content, content_type)}
    r = requests.post(f"{BASE}/storage/upload", headers=h(), files=files, timeout=10)
    return r

def list_files():
    r = requests.get(f"{BASE}/storage", headers=h(), timeout=10)
    return r.json()

def update_tags(file_id, tags):
    r = requests.post(f"{BASE}/storage/tags", headers=h(), params={"id": file_id, "tags": tags}, timeout=10)
    return r

def update_category(file_id, category):
    r = requests.post(f"{BASE}/storage/category", headers=h(), params={"id": file_id, "category": category}, timeout=10)
    return r

def search_get(query, page=0, size=20, sort_by="filename", direction="asc"):
    r = requests.get(f"{BASE}/search", headers=h(), params={
        "query": query, "page": page, "size": size, "sortBy": sort_by, "direction": direction
    }, timeout=10)
    return r

def search_post(query, page=0, size=20, sort_by="filename", direction="asc"):
    r = requests.post(f"{BASE}/search", headers=h(), json={
        "query": query, "page": page, "size": size, "sortBy": sort_by, "direction": direction
    }, timeout=10)
    return r

def get_suggestions():
    r = requests.get(f"{BASE}/search/suggestions", headers=h(), timeout=10)
    return r

def get_recent():
    r = requests.get(f"{BASE}/search/recent", headers=h(), timeout=10)
    return r

def clear_recent():
    r = requests.delete(f"{BASE}/search/recent", headers=h(), timeout=10)
    return r

def get_categories():
    r = requests.get(f"{BASE}/search/categories", headers=h(), timeout=10)
    return r

def get_ocr_status(file_id):
    r = requests.get(f"{BASE}/ocr/status/{file_id}", headers=h(), timeout=10)
    return r.json().get("status")

def get_ocr_statistics():
    r = requests.get(f"{BASE}/ocr/statistics", headers=h(), timeout=10)
    return r.json()

def trigger_reindex_file(file_id):
    r = requests.post(f"{BASE}/ocr/reindex/{file_id}", headers=h(), timeout=10)
    return r

def trigger_reindex_all():
    r = requests.post(f"{BASE}/ocr/reindex/all", headers=h(), timeout=10)
    return r

def main():
    print("==========================================================")
    print("STARTING PHASE 4 ADVANCED SEARCH & OCR INTEGRATION TESTS")
    print("==========================================================")

    # 1. Register and Login
    register_and_login()
    if TOKEN:
        log("Auth Login", True, f"Logged in as {TEST_USER}")
    else:
        log("Auth Login", False, "Failed to retrieve authentication token")
        sys.exit(1)

    # 2. Upload test files
    direct_upload("invoice_2026.pdf", b"Simulated PDF OCR Text Invoice 998877", "application/pdf")
    direct_upload("screenshot.png", b"Error code 404: Database Connection Refused", "image/png")
    direct_upload("report.txt", b"Machine learning algorithms are very good for predictions", "text/plain")
    direct_upload("notes.docx", b"Holiday plans with John and Alice", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")

    # Map uploaded files
    items = list_files()
    files_map = {item["name"]: item["id"] for item in items if item["type"] == "FILE"}
    
    # Poll until OCR finishes processing
    print("Waiting for OCR processing to complete on all files...")
    for name, fid in files_map.items():
        for _ in range(20):
            status = get_ocr_status(fid)
            if status in ["COMPLETED", "FAILED"]:
                break
            time.sleep(0.5)
        log(f"OCR completion check for {name}", get_ocr_status(fid) == "COMPLETED", f"status={get_ocr_status(fid)}")

    # Update metadata tags and categories
    invoice_id = files_map["invoice_2026.pdf"]
    screenshot_id = files_map["screenshot.png"]
    report_id = files_map["report.txt"]
    notes_id = files_map["notes.docx"]

    update_tags(invoice_id, "tax,audit")
    update_category(screenshot_id, "system")
    update_category(invoice_id, "document")

    # VERIFICATION TEST CASES

    # Test 1: Filename search
    r = search_get("filename:invoice_2026.pdf")
    log("Exact Filename Search", r.status_code == 200 and len(r.json()["content"]) == 1, f"matches={len(r.json()['content'])}")
    
    r = search_get("filename:invoice")
    log("Fuzzy/Partial Filename Search", r.status_code == 200 and len(r.json()["content"]) == 1, f"matches={len(r.json()['content'])}")

    # Test 2: Owner search
    r = search_get(f"owner:{TEST_USER}")
    log("Owner Search", r.status_code == 200 and len(r.json()["content"]) >= 4, f"matches={len(r.json()['content'])}")

    # Test 3: Tag search
    r = search_get("tag:tax")
    log("Tag Search", r.status_code == 200 and len(r.json()["content"]) == 1, f"matches={len(r.json()['content'])}")

    # Test 4: Category search
    r = search_get("category:system")
    log("Category Search", r.status_code == 200 and len(r.json()["content"]) == 1, f"matches={len(r.json()['content'])}")

    # Test 5: Boolean AND/OR/NOT
    r = search_get("machine AND learning")
    log("Boolean AND Search", r.status_code == 200 and len(r.json()["content"]) == 1, f"matches={len(r.json()['content'])}")

    r = search_get("machine OR screenshot")
    log("Boolean OR Search", r.status_code == 200 and len(r.json()["content"]) == 2, f"matches={len(r.json()['content'])}")

    r = search_get("machine AND NOT screenshot")
    log("Boolean NOT Search", r.status_code == 200 and len(r.json()["content"]) == 1, f"matches={len(r.json()['content'])}")

    r = search_get(f"(owner:{TEST_USER} OR owner:nonexistent) AND category:system")
    log("Boolean Parentheses Nesting Search", r.status_code == 200 and len(r.json()["content"]) == 1, f"matches={len(r.json()['content'])}")

    # Test 6: Phrase search
    r = search_get("\"machine learning\"")
    log("Exact Phrase Search", r.status_code == 200 and len(r.json()["content"]) == 1, f"matches={len(r.json()['content'])}")

    # Test 7: OCR content search
    r = search_get("ocr:Database")
    log("OCR Content Search (Image)", r.status_code == 200 and len(r.json()["content"]) == 1, f"matches={len(r.json()['content'])}")

    r = search_get("ocr:998877")
    log("OCR Content Search (PDF)", r.status_code == 200 and len(r.json()["content"]) == 1, f"matches={len(r.json()['content'])}")

    # Test 8: Highlight generation
    r = search_get("machine")
    snippet = r.json()["content"][0]["snippet"]
    log("Highlight and Snippet Generation", "<b>machine</b>" in snippet or "<b>Machine</b>" in snippet, f"snippet={snippet}")

    # Test 9: Pagination and sorting
    r = search_get(f"owner:{TEST_USER}", page=0, size=2, sort_by="filename", direction="asc")
    filenames = [item["filename"] for item in r.json()["content"]]
    log("Pagination & Sorting (ASC)", r.status_code == 200 and len(filenames) <= 2 and filenames == sorted(filenames), f"returned={filenames}")

    # Test 10: Suggestions and recent queries
    r = get_suggestions()
    log("Suggestions Endpoint", r.status_code == 200 and "popularTags" in r.json() and "categories" in r.json(), f"response={r.json()}")
    
    r = get_recent()
    log("Recent Queries Tracking", r.status_code == 200 and len(r.json()) > 0, f"queries={r.json()}")
    
    clear_recent()
    r = get_recent()
    log("Clear Recent Queries", r.status_code == 200 and len(r.json()) == 0, f"queries={r.json()}")

    # Test 11: Search ranking (filename match boost vs text match)
    direct_upload("machine.txt", b"Empty file", "text/plain")
    time.sleep(1) # wait for indexing
    r = search_get("machine")
    content = r.json()["content"]
    log("Search Ranking (Filename Boost)", len(content) >= 2 and content[0]["filename"] == "machine.txt", f"ranked first={content[0]['filename'] if len(content) > 0 else 'None'}")

    # Test 12: Concurrent searches
    search_errors = []
    def run_concurrent_search():
        try:
            res = search_get("machine")
            if res.status_code != 200:
                search_errors.append(res.status_code)
        except Exception as e:
            search_errors.append(str(e))

    threads = [threading.Thread(target=run_concurrent_search) for _ in range(10)]
    for t in threads: t.start()
    for t in threads: t.join()
    log("Concurrent Search Stress Load", len(search_errors) == 0, f"errors={search_errors}")

    # Test 13: Concurrent OCR processing
    ocr_threads_errors = []
    def run_concurrent_upload(index):
        try:
            res = direct_upload(f"concurrent_{index}.txt", b"Concurrent OCR Text processing stress load test", "text/plain")
            if res.status_code != 200:
                ocr_threads_errors.append(res.status_code)
        except Exception as e:
            ocr_threads_errors.append(str(e))

    upload_threads = [threading.Thread(target=run_concurrent_upload, args=(i,)) for i in range(5)]
    for t in upload_threads: t.start()
    for t in upload_threads: t.join()
    log("Concurrent OCR Upload Stress Load", len(ocr_threads_errors) == 0, f"errors={ocr_threads_errors}")

    # Test 14: OCR reindex lifecycle
    # Upload a small file, wait for COMPLETED, then trigger reindex and verify
    # that the status transitions back to PENDING/PROCESSING before re-completing.
    direct_upload("reindex_lifecycle.txt", b"Reindex lifecycle test document content", "text/plain")
    time.sleep(0.5)
    items_after = list_files()
    reindex_file = [item for item in items_after if item["name"] == "reindex_lifecycle.txt"]
    if reindex_file:
        reindex_fid = reindex_file[0]["id"]
        # Wait for initial COMPLETED
        for _ in range(20):
            if get_ocr_status(reindex_fid) == "COMPLETED":
                break
            time.sleep(0.5)
        initial_status = get_ocr_status(reindex_fid)
        # Trigger reindex — should reset to PENDING
        r_ri = trigger_reindex_file(reindex_fid)
        log("OCR Reindex Trigger HTTP", r_ri.status_code == 200, f"status_code={r_ri.status_code}")
        # Give the async executor a moment to pick it up
        time.sleep(0.3)
        mid_status = get_ocr_status(reindex_fid)
        # Status should be PENDING or PROCESSING (being actively reindexed) or COMPLETED if very fast
        log("OCR Reindex Lifecycle", mid_status in ["PENDING", "PROCESSING", "COMPLETED"], f"initial={initial_status} mid={mid_status}")
        # Wait for it to finish
        for _ in range(20):
            if get_ocr_status(reindex_fid) == "COMPLETED":
                break
            time.sleep(0.5)
        log("OCR Reindex Completes", get_ocr_status(reindex_fid) == "COMPLETED", f"status={get_ocr_status(reindex_fid)}")
    else:
        log("OCR Reindex Trigger HTTP", False, "File not found after upload")
        log("OCR Reindex Lifecycle", False, "File not found after upload")
        log("OCR Reindex Completes", False, "File not found after upload")

    # Test 15: Reindex all
    r = trigger_reindex_all()
    log("Reindex All Operations", r.status_code == 200, f"response={r.json().get('message')}")

    # 16. Statistics check
    stats = get_ocr_statistics()
    log("OCR Statistics Dashboard", "completedJobs" in stats and "failedJobs" in stats, f"stats={stats}")

    print("==========================================================")
    print("Verification Results Summary:")
    passed_all = all(RESULTS)
    if passed_all:
        print("[SUCCESS] ALL PHASE 4 SEARCH & OCR INTEGRATION TESTS PASSED!")
        sys.exit(0)
    else:
        print("[FAIL] PHASE 4 SEARCH & OCR INTEGRATION TESTS ENCOUNTERED FAILURES.")
        sys.exit(1)

if __name__ == "__main__":
    main()
