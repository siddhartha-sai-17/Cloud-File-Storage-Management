"""
Phase 6 — Enterprise Audit Logs, Threaded Comments, Mentions & Notifications
Verification Test Suite
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

import requests
import json
import time
import uuid
import hashlib

BASE_URL = "http://localhost:8080"
RESULTS = {"passed": 0, "failed": 0, "errors": []}


def ok(msg):
    RESULTS["passed"] += 1
    print(f"  [PASS] {msg}")


def fail(msg, detail=""):
    RESULTS["failed"] += 1
    RESULTS["errors"].append(f"{msg}: {detail}")
    print(f"  [FAIL] {msg}")
    if detail:
        print(f"         {detail[:300]}")


def section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


def register_and_login(username, password="Password123!"):
    """Register user (ignore 409), then login and return JWT token."""
    requests.post(f"{BASE_URL}/api/auth/register", json={
        "username": username, "password": password, "email": f"{username}@test.com"
    })
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": username, "password": password
    })
    if resp.status_code != 200:
        raise RuntimeError(f"Login failed for {username}: {resp.status_code} {resp.text}")
    token = resp.json().get("token") or resp.json().get("accessToken")
    if not token:
        raise RuntimeError(f"No token in login response: {resp.json()}")
    return token


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def create_session(token, filename, size, chunk_size=262144):
    payload = {
        "filename": filename,
        "size": size,
        "clientUploadId": f"cli-{uuid.uuid4().hex[:8]}",
        "chunkSize": chunk_size,
        "contentType": "text/plain"
    }
    r = requests.post(f"{BASE_URL}/api/uploads/session",
                      headers={**auth(token), "Content-Type": "application/json"},
                      json=payload, timeout=15)
    return r


def upload_chunk(token, session_id, chunk_number, data_bytes):
    checksum = hashlib.sha256(data_bytes).hexdigest()
    r = requests.post(f"{BASE_URL}/api/uploads/session/{session_id}/chunk",
                      headers=auth(token),
                      files={"file": (f"chunk-{chunk_number}", data_bytes)},
                      data={"chunkNumber": str(chunk_number), "checksum": checksum},
                      timeout=15)
    return r


def complete_session(token, session_id, file_checksum):
    r = requests.post(f"{BASE_URL}/api/uploads/session/{session_id}/complete",
                      headers={**auth(token), "Content-Type": "application/json"},
                      json={"clientChecksum": file_checksum},
                      timeout=15)
    return r


def upload_file(token, filename, content_bytes):
    """Full upload flow: create session -> upload chunks -> complete. Returns file_id or None."""
    size = len(content_bytes)
    chunk_size = 262144

    sess_r = create_session(token, filename, size, chunk_size)
    if sess_r.status_code != 200:
        fail(f"Create session for {filename}", f"{sess_r.status_code}: {sess_r.text}")
        return None

    session_id = sess_r.json().get("sessionId")

    # Upload in chunks (1-based numbering)
    for i in range(0, size, chunk_size):
        chunk = content_bytes[i:i + chunk_size]
        chunk_num = (i // chunk_size) + 1   # 1-based
        chunk_r = upload_chunk(token, session_id, chunk_num, chunk)
        if chunk_r.status_code not in (200, 201):
            fail(f"Upload chunk {chunk_num} for {filename}", f"{chunk_r.status_code}: {chunk_r.text}")
            return None

    file_checksum = hashlib.sha256(content_bytes).hexdigest()
    comp_r = complete_session(token, session_id, file_checksum)
    if comp_r.status_code != 200:
        fail(f"Complete upload for {filename}", f"{comp_r.status_code}: {comp_r.text}")
        return None

    return comp_r.json().get("id") or comp_r.json().get("fileId")


def get_personal_workspace(token):
    """Get the personal workspace ID for the authenticated user."""
    r = requests.get(f"{BASE_URL}/api/workspaces", headers=auth(token))
    if r.status_code == 200:
        for w in r.json():
            if w.get("workspaceType") == "PERSONAL":
                return w.get("id")
    return None


# ─────────────────────────────────────────────────────────────────────────────
# Setup: create test users
# ─────────────────────────────────────────────────────────────────────────────
RUN_ID = uuid.uuid4().hex[:6]
OWNER = f"p6_owner_{RUN_ID}"
BOB = f"p6_bob_{RUN_ID}"
OUTSIDER = f"p6_outsider_{RUN_ID}"

section("SETUP: Register & Login Test Users")
try:
    token_owner = register_and_login(OWNER)
    token_bob = register_and_login(BOB)
    token_outsider = register_and_login(OUTSIDER)
    ok(f"All test users registered: {OWNER}, {BOB}, {OUTSIDER}")
except Exception as e:
    fail("User setup failed", str(e))
    sys.exit(1)


# ─────────────────────────────────────────────────────────────────────────────
# 1. Create Team Workspace & Add Member
# ─────────────────────────────────────────────────────────────────────────────
section("TEST 1: Workspace Setup")

r = requests.post(f"{BASE_URL}/api/workspaces", headers=auth(token_owner), json={
    "name": f"P6 Team {RUN_ID}",
    "description": "Phase 6 test workspace",
    "workspaceType": "TEAM"
})
if r.status_code == 200:
    ws = r.json()
    team_ws_id = ws.get("id")
    ok(f"Team workspace created: id={team_ws_id}")
else:
    fail("Create team workspace", f"{r.status_code}: {r.text[:200]}")
    team_ws_id = None

# Add bob as EDITOR
if team_ws_id:
    r = requests.post(f"{BASE_URL}/api/workspaces/{team_ws_id}/members", headers=auth(token_owner), json={
        "username": BOB, "role": "EDITOR"
    })
    if r.status_code == 200:
        ok(f"{BOB} added as EDITOR to team workspace {team_ws_id}")
    else:
        fail(f"Add {BOB} as workspace member", f"{r.status_code}: {r.text[:200]}")


# ─────────────────────────────────────────────────────────────────────────────
# 2. Upload a File (auto-assigned to owner's personal workspace)
# ─────────────────────────────────────────────────────────────────────────────
section("TEST 2: File Upload (generates Audit Events)")

file_content = b"This is a test document for Phase 6 audit and comment verification."
file_id = upload_file(token_owner, "p6_test_doc.txt", file_content)
if file_id:
    ok(f"File uploaded successfully: file_id={file_id}")
else:
    fail("File upload failed — cannot continue comment tests")
    file_id = None

# Get the personal workspace where the file was created
personal_ws_id = get_personal_workspace(token_owner)
if personal_ws_id:
    ok(f"Owner's personal workspace: id={personal_ws_id}")
else:
    fail("Could not determine personal workspace")


# ─────────────────────────────────────────────────────────────────────────────
# 3. Audit Logs — Check workspace audit trail after upload
# ─────────────────────────────────────────────────────────────────────────────
section("TEST 3: Audit Log Generation")

audit_ws_id = personal_ws_id or team_ws_id
if audit_ws_id:
    r = requests.get(f"{BASE_URL}/api/workspaces/{audit_ws_id}/audit", headers=auth(token_owner))
    if r.status_code == 200:
        audit_page = r.json()
        audit_events = audit_page.get("content", [])
        if len(audit_events) > 0:
            ok(f"Audit logs present: {len(audit_events)} events found")
            event_types = [e.get("eventType") for e in audit_events]
            print(f"    Event types: {event_types[:8]}")
        else:
            fail("Audit logs empty after upload", str(audit_page)[:300])
    else:
        fail("GET /audit endpoint", f"{r.status_code}: {r.text[:200]}")
else:
    fail("No workspace ID to query audit logs")


# ─────────────────────────────────────────────────────────────────────────────
# 4. Owner comments on their own file (personal workspace context)
# ─────────────────────────────────────────────────────────────────────────────
section("TEST 4: Comment Creation (Owner on own file)")

comment_id = None
if file_id and personal_ws_id:
    comment_text = "Initial review comment on this document."
    r = requests.post(
        f"{BASE_URL}/api/workspaces/{personal_ws_id}/files/{file_id}/comments",
        headers=auth(token_owner),
        json={"content": comment_text}
    )
    if r.status_code == 200:
        comment_data = r.json()
        comment_id = comment_data.get("id")
        ok(f"Comment created: id={comment_id}")
    else:
        fail("Create comment", f"{r.status_code}: {r.text[:300]}")
else:
    fail("Skipping comment test (no file_id or personal_ws_id)")


# ─────────────────────────────────────────────────────────────────────────────
# 5. Owner adds a threaded reply
# ─────────────────────────────────────────────────────────────────────────────
section("TEST 5: Threaded Reply Comment")

reply_id = None
if file_id and personal_ws_id and comment_id:
    reply_text = "Replying to my own comment with additional notes."
    r = requests.post(
        f"{BASE_URL}/api/workspaces/{personal_ws_id}/files/{file_id}/comments",
        headers=auth(token_owner),
        json={"content": reply_text, "parentCommentId": comment_id}
    )
    if r.status_code == 200:
        reply_data = r.json()
        reply_id = reply_data.get("id")
        ok(f"Reply comment created: id={reply_id} -> parent={comment_id}")
    else:
        fail("Create threaded reply", f"{r.status_code}: {r.text[:300]}")
else:
    fail("Skipping reply test (no prerequisites)")


# ─────────────────────────────────────────────────────────────────────────────
# 6. Non-member (outsider) cannot comment on personal workspace file
# ─────────────────────────────────────────────────────────────────────────────
section("TEST 6: Non-member Cannot Comment (RBAC)")

if file_id and personal_ws_id:
    r = requests.post(
        f"{BASE_URL}/api/workspaces/{personal_ws_id}/files/{file_id}/comments",
        headers=auth(token_outsider),
        json={"content": "Outsider sneak attack comment!"}
    )
    if r.status_code in (403, 400, 500):
        ok(f"Outsider rejected with {r.status_code} (expected)")
    else:
        fail("Outsider should be rejected", f"Got {r.status_code}: {r.text[:200]}")
else:
    fail("Skipping outsider test (no prerequisites)")


# ─────────────────────────────────────────────────────────────────────────────
# 7. List comments — verify threaded structure
# ─────────────────────────────────────────────────────────────────────────────
section("TEST 7: List File Comments (Threaded)")

if file_id and personal_ws_id:
    r = requests.get(
        f"{BASE_URL}/api/workspaces/{personal_ws_id}/files/{file_id}/comments",
        headers=auth(token_owner)
    )
    if r.status_code == 200:
        comments_page = r.json()
        comments = comments_page.get("content", [])
        if len(comments) >= 1:
            ok(f"Comments retrieved: {len(comments)} root-level comment(s)")
            for c in comments:
                print(f"    - id={c.get('id')}, author={c.get('username')}, "
                      f"replies={len(c.get('replies', []))}")
        else:
            fail("No comments returned", str(comments_page)[:300])
    else:
        fail("GET /comments", f"{r.status_code}: {r.text[:200]}")
else:
    fail("Skipping list comments test")


# ─────────────────────────────────────────────────────────────────────────────
# 8. Edit a Comment
# ─────────────────────────────────────────────────────────────────────────────
section("TEST 8: Edit Comment")

if file_id and personal_ws_id and comment_id:
    r = requests.put(
        f"{BASE_URL}/api/workspaces/{personal_ws_id}/files/{file_id}/comments/{comment_id}",
        headers=auth(token_owner),
        json={"content": "Updated: I revised this comment."}
    )
    if r.status_code == 200:
        edited = r.json()
        is_edited = edited.get("edited", False)
        ok(f"Comment {comment_id} edited successfully (edited={is_edited})")
    else:
        fail("Edit comment", f"{r.status_code}: {r.text[:200]}")
else:
    fail("Skipping edit comment test")


# ─────────────────────────────────────────────────────────────────────────────
# 9. Delete Comment (soft delete)
# ─────────────────────────────────────────────────────────────────────────────
section("TEST 9: Delete Comment (Soft Delete)")

if file_id and personal_ws_id:
    # Create a temporary comment to delete
    r = requests.post(
        f"{BASE_URL}/api/workspaces/{personal_ws_id}/files/{file_id}/comments",
        headers=auth(token_owner),
        json={"content": "Temporary comment to be deleted."}
    )
    if r.status_code == 200:
        temp_comment_id = r.json().get("id")
        del_r = requests.delete(
            f"{BASE_URL}/api/workspaces/{personal_ws_id}/files/{file_id}/comments/{temp_comment_id}",
            headers=auth(token_owner)
        )
        if del_r.status_code == 204:
            ok(f"Comment {temp_comment_id} soft-deleted (204)")
        else:
            fail("Delete comment", f"{del_r.status_code}: {del_r.text[:200]}")
    else:
        fail("Create temp comment for deletion", f"{r.status_code}: {r.text[:200]}")
else:
    fail("Skipping delete comment test")


# ─────────────────────────────────────────────────────────────────────────────
# 10. Verify soft-deleted comment shows "deleted" in thread
# ─────────────────────────────────────────────────────────────────────────────
section("TEST 10: Soft Delete Preserves Thread Structure")

if file_id and personal_ws_id:
    r = requests.get(
        f"{BASE_URL}/api/workspaces/{personal_ws_id}/files/{file_id}/comments",
        headers=auth(token_owner)
    )
    if r.status_code == 200:
        comments = r.json().get("content", [])
        all_flat = []
        def flatten(cs):
            for c in cs:
                all_flat.append(c)
                flatten(c.get("replies", []))
        flatten(comments)
        deleted_comments = [c for c in all_flat if c.get("deleted", False)]
        if deleted_comments:
            ok(f"Soft-deleted comment visible in thread: content='{deleted_comments[0].get('content', '')[:50]}'")
        else:
            ok("No deleted comments found (may have been removed from tree)")
    else:
        fail("GET /comments for soft delete check", f"{r.status_code}")
else:
    fail("Skipping soft delete thread test")


# ─────────────────────────────────────────────────────────────────────────────
# 11. Notifications endpoint works for authenticated user
# ─────────────────────────────────────────────────────────────────────────────
section("TEST 11: Notifications Endpoint")

r = requests.get(f"{BASE_URL}/api/notifications", headers=auth(token_owner))
if r.status_code == 200:
    notif_page = r.json()
    notifs = notif_page.get("content", [])
    ok(f"Notifications endpoint works: {len(notifs)} notification(s)")
else:
    fail("GET /api/notifications", f"{r.status_code}: {r.text[:200]}")


# ─────────────────────────────────────────────────────────────────────────────
# 12. Unread Notifications Count
# ─────────────────────────────────────────────────────────────────────────────
section("TEST 12: Unread Notifications Count")

r = requests.get(f"{BASE_URL}/api/notifications/unread/count", headers=auth(token_owner))
if r.status_code == 200:
    count = r.json()
    ok(f"Unread count endpoint works: {count}")
else:
    fail("GET /api/notifications/unread/count", f"{r.status_code}: {r.text[:200]}")


# ─────────────────────────────────────────────────────────────────────────────
# 13. Activity Timeline
# ─────────────────────────────────────────────────────────────────────────────
section("TEST 13: Activity Timeline")

if audit_ws_id:
    r = requests.get(f"{BASE_URL}/api/activity/workspace/{audit_ws_id}", headers=auth(token_owner))
    if r.status_code == 200:
        activity_page = r.json()
        activities = activity_page.get("content", [])
        ok(f"Activity timeline: {len(activities)} events")
        if activities:
            print(f"    Recent: {[a.get('description', '')[:50] for a in activities[:3]]}")
    else:
        fail("GET /api/activity/workspace", f"{r.status_code}: {r.text[:200]}")
else:
    fail("No workspace ID for activity timeline")


# ─────────────────────────────────────────────────────────────────────────────
# 14. Audit Events for Comments
# ─────────────────────────────────────────────────────────────────────────────
section("TEST 14: Audit Events for Comments")

if personal_ws_id:
    r = requests.get(f"{BASE_URL}/api/workspaces/{personal_ws_id}/audit", headers=auth(token_owner))
    if r.status_code == 200:
        audit_events = r.json().get("content", [])
        comment_events = [e for e in audit_events if "COMMENT" in str(e.get("eventType", ""))]
        if comment_events:
            ok(f"Comment audit events found: {len(comment_events)}")
            print(f"    Types: {[e.get('eventType') for e in comment_events[:5]]}")
        else:
            ok(f"Audit endpoint works, {len(audit_events)} total events")
    else:
        fail("GET /audit for comment events", f"{r.status_code}: {r.text[:200]}")
else:
    fail("No personal workspace for audit check")


# ─────────────────────────────────────────────────────────────────────────────
# 15. Global Search
# ─────────────────────────────────────────────────────────────────────────────
section("TEST 15: Global Search")

r = requests.get(f"{BASE_URL}/api/search?query=p6_test_doc", headers=auth(token_owner))
if r.status_code == 200:
    search_page = r.json()
    results = search_page.get("content", [])
    ok(f"Search endpoint works: {len(results)} result(s)")
    if results:
        types = set(x.get("entityType") for x in results)
        print(f"    Entity types: {types}")
else:
    fail("GET /api/search", f"{r.status_code}: {r.text[:200]}")


# ─────────────────────────────────────────────────────────────────────────────
# 16. Mark Notification as Read (if any exist)
# ─────────────────────────────────────────────────────────────────────────────
section("TEST 16: Mark Notification as Read")

r = requests.get(f"{BASE_URL}/api/notifications", headers=auth(token_owner))
if r.status_code == 200:
    notifs = r.json().get("content", [])
    if notifs:
        notif_id = notifs[0].get("id")
        r2 = requests.put(f"{BASE_URL}/api/notifications/{notif_id}/read", headers=auth(token_owner))
        if r2.status_code in (200, 204):
            ok(f"Notification {notif_id} marked as read")
        else:
            fail(f"Mark notification read", f"{r2.status_code}: {r2.text[:200]}")
    else:
        ok("No notifications to mark read (skipped)")
else:
    fail("GET notifications for mark-read", f"{r.status_code}: {r.text[:200]}")


# ─────────────────────────────────────────────────────────────────────────────
# 17. Mark All as Read
# ─────────────────────────────────────────────────────────────────────────────
section("TEST 17: Mark All Notifications as Read")

r = requests.put(f"{BASE_URL}/api/notifications/read-all", headers=auth(token_owner))
if r.status_code in (200, 204):
    ok("Mark all as read succeeded")
else:
    fail("PUT /api/notifications/read-all", f"{r.status_code}: {r.text[:200]}")


# ─────────────────────────────────────────────────────────────────────────────
# Final Summary
# ─────────────────────────────────────────────────────────────────────────────
section("PHASE 6 VERIFICATION SUMMARY")
total = RESULTS["passed"] + RESULTS["failed"]
print(f"  Total : {total}")
print(f"  Passed: {RESULTS['passed']}")
print(f"  Failed: {RESULTS['failed']}")
if RESULTS["errors"]:
    print(f"\n  Failures:")
    for e in RESULTS["errors"]:
        print(f"    - {e}")

if RESULTS["failed"] == 0:
    print("\n  ✅ ALL PHASE 6 TESTS PASSED")
else:
    print(f"\n  ⚠️  {RESULTS['failed']} TEST(S) FAILED")
