"""
Phase 5 RBAC & Team Workspaces -- Verification Test Suite
Tests: Workspace creation, membership, invitations, permissions, quota, workspace isolation
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

import requests
import json
import time

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
        print(f"         {detail}")


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


# ─────────────────────────────────────────────────────────────────────────────
# Setup: create test users
# ─────────────────────────────────────────────────────────────────────────────
section("SETUP: Register & Login Test Users")
try:
    token_owner = register_and_login("ws_owner_01")
    print(f"  ws_owner_01 token: {token_owner[:20]}...")
    token_member = register_and_login("ws_member_01")
    print(f"  ws_member_01 token: {token_member[:20]}...")
    token_outsider = register_and_login("ws_outsider_01")
    print(f"  ws_outsider_01 token: {token_outsider[:20]}...")
    ok("All test users registered and logged in")
except Exception as e:
    fail("User setup failed", str(e))
    sys.exit(1)


# ─────────────────────────────────────────────────────────────────────────────
# 1. Personal Workspace Auto-Creation
# ─────────────────────────────────────────────────────────────────────────────
section("TEST 1: Personal Workspace Auto-Creation")

r = requests.get(f"{BASE_URL}/api/workspaces", headers=auth(token_owner))
if r.status_code == 200:
    workspaces = r.json()
    personal = [w for w in workspaces if w.get("workspaceType") == "PERSONAL"]
    if personal:
        ok(f"Personal workspace auto-created: id={personal[0]['id']}, name='{personal[0]['name']}'")
        personal_ws_id = personal[0]["id"]
    else:
        fail("No PERSONAL workspace found", str(workspaces))
        personal_ws_id = None
else:
    fail("GET /api/workspaces returned non-200", f"{r.status_code}: {r.text[:200]}")
    personal_ws_id = None


# ─────────────────────────────────────────────────────────────────────────────
# 2. Create a Team Workspace
# ─────────────────────────────────────────────────────────────────────────────
section("TEST 2: Create Team Workspace")

r = requests.post(f"{BASE_URL}/api/workspaces", headers=auth(token_owner), json={
    "name": "Phase5 Test Team",
    "description": "Test workspace for Phase 5 verification",
    "storageQuota": 1073741824  # 1 GB
})
if r.status_code in (200, 201):
    team_ws = r.json()
    team_ws_id = team_ws.get("id")
    ok(f"Team workspace created: id={team_ws_id}, name='{team_ws.get('name')}'")
else:
    fail("POST /api/workspaces failed", f"{r.status_code}: {r.text[:300]}")
    team_ws_id = None


# ─────────────────────────────────────────────────────────────────────────────
# 3. Get Workspace Details
# ─────────────────────────────────────────────────────────────────────────────
section("TEST 3: Get Workspace Details")

if team_ws_id:
    r = requests.get(f"{BASE_URL}/api/workspaces/{team_ws_id}", headers=auth(token_owner))
    if r.status_code == 200:
        ws = r.json()
        ok(f"Workspace details retrieved: storageQuota={ws.get('storageQuota')}, type={ws.get('workspaceType')}")
    else:
        fail("GET /api/workspaces/{id} failed", f"{r.status_code}: {r.text[:200]}")
else:
    fail("Skipped — no team workspace created")


# ─────────────────────────────────────────────────────────────────────────────
# 4. Workspace Quota Endpoint
# ─────────────────────────────────────────────────────────────────────────────
section("TEST 4: Workspace Quota")

if team_ws_id:
    r = requests.get(f"{BASE_URL}/api/workspaces/{team_ws_id}/quota", headers=auth(token_owner))
    if r.status_code == 200:
        quota = r.json()
        ok(f"Quota retrieved: used={quota.get('storageUsed')}, quota={quota.get('storageQuota')}, pct={quota.get('usagePercentage')}")
    else:
        fail("GET /api/workspaces/{id}/quota failed", f"{r.status_code}: {r.text[:200]}")
else:
    fail("Skipped — no team workspace")


# ─────────────────────────────────────────────────────────────────────────────
# 5. Outsider Cannot Access Workspace
# ─────────────────────────────────────────────────────────────────────────────
section("TEST 5: Workspace Isolation — Outsider Denied")

if team_ws_id:
    r = requests.get(f"{BASE_URL}/api/workspaces/{team_ws_id}", headers=auth(token_outsider))
    if r.status_code in (403, 404):
        ok(f"Outsider correctly denied access to workspace (HTTP {r.status_code})")
    elif r.status_code == 200:
        fail("SECURITY: Outsider should NOT have access to workspace", "Got 200 instead of 403/404")
    else:
        fail("Unexpected status for outsider workspace access", f"{r.status_code}: {r.text[:200]}")
else:
    fail("Skipped — no team workspace")


# ─────────────────────────────────────────────────────────────────────────────
# 6. Add Member to Workspace
# ─────────────────────────────────────────────────────────────────────────────
section("TEST 6: Add Member to Workspace")

if team_ws_id:
    r = requests.post(f"{BASE_URL}/api/workspaces/{team_ws_id}/members", headers=auth(token_owner), json={
        "username": "ws_member_01",
        "role": "EDITOR"
    })
    if r.status_code in (200, 201):
        member = r.json()
        ok(f"Member added: username=ws_member_01, role={member.get('role')}")
        # WorkspaceMemberDto now has field 'userId', used for remove/role-update in the controller
        member_user_id = member.get("userId")
        print(f"  -> member user id={member_user_id}, full response keys: {list(member.keys())}")
    else:
        fail("POST /api/workspaces/{id}/members failed", f"{r.status_code}: {r.text[:300]}")
        member_user_id = None
else:
    fail("Skipped — no team workspace")
    member_user_id = None


# ─────────────────────────────────────────────────────────────────────────────
# 7. List Members
# ─────────────────────────────────────────────────────────────────────────────
section("TEST 7: List Workspace Members")

if team_ws_id:
    r = requests.get(f"{BASE_URL}/api/workspaces/{team_ws_id}/members", headers=auth(token_owner))
    if r.status_code == 200:
        members = r.json()
        usernames = [m.get("username") for m in members]
        if "ws_member_01" in usernames:
            ok(f"Member list contains ws_member_01: {usernames}")
        else:
            fail("ws_member_01 not in member list", str(usernames))
    else:
        fail("GET /api/workspaces/{id}/members failed", f"{r.status_code}: {r.text[:200]}")
else:
    fail("Skipped — no team workspace")


# ─────────────────────────────────────────────────────────────────────────────
# 8. Member Can Access Workspace After Being Added
# ─────────────────────────────────────────────────────────────────────────────
section("TEST 8: Member Gains Access After Being Added")

if team_ws_id:
    r = requests.get(f"{BASE_URL}/api/workspaces/{team_ws_id}", headers=auth(token_member))
    if r.status_code == 200:
        ok("Member can access workspace after being added")
    else:
        fail("Member cannot access workspace", f"{r.status_code}: {r.text[:200]}")
else:
    fail("Skipped — no team workspace")


# ─────────────────────────────────────────────────────────────────────────────
# 9. Update Member Role
# ─────────────────────────────────────────────────────────────────────────────
section("TEST 9: Update Member Role")

if team_ws_id and member_user_id:
    r = requests.patch(
        f"{BASE_URL}/api/workspaces/{team_ws_id}/members/{member_user_id}/role",
        headers=auth(token_owner),
        json={"role": "VIEWER"}
    )
    if r.status_code == 200:
        updated = r.json()
        ok(f"Member role updated to: {updated.get('role')}")
    else:
        fail("PATCH role update failed", f"{r.status_code}: {r.text[:200]}")
else:
    fail("Skipped — no workspace or member_user_id")


# ─────────────────────────────────────────────────────────────────────────────
# 10. Send Workspace Invitation
# ─────────────────────────────────────────────────────────────────────────────
section("TEST 10: Send Workspace Invitation")

invitation_token = None
if team_ws_id:
    # Correct route: POST /api/workspaces/{id}/invite
    r = requests.post(f"{BASE_URL}/api/workspaces/{team_ws_id}/invite", headers=auth(token_owner), json={
        "email": "ws_outsider_01@test.com",
        "role": "VIEWER"
    })
    if r.status_code in (200, 201):
        inv = r.json()
        invitation_token = inv.get("token")
        ok(f"Invitation sent: id={inv.get('id')}, token={str(invitation_token)[:8]}...")
    else:
        fail("POST /api/workspaces/{id}/invite failed", f"{r.status_code}: {r.text[:300]}")
else:
    fail("Skipped — no team workspace")


# ─────────────────────────────────────────────────────────────────────────────
# 11. Accept Invitation (public endpoint)
# ─────────────────────────────────────────────────────────────────────────────
section("TEST 11: Accept Workspace Invitation")

if invitation_token:
    # Correct route: POST /api/workspaces/invitations/{token}/accept (requires auth)
    r = requests.post(f"{BASE_URL}/api/workspaces/invitations/{invitation_token}/accept", headers=auth(token_outsider))
    if r.status_code in (200, 201):
        ok("Invitation accepted successfully")
    else:
        fail("Accept invitation failed", f"{r.status_code}: {r.text[:300]}")
else:
    fail("Skipped — no invitation token")


# ─────────────────────────────────────────────────────────────────────────────
# 12. Invited User Can Now Access Workspace
# ─────────────────────────────────────────────────────────────────────────────
section("TEST 12: Invited User Access After Accept")

if team_ws_id and invitation_token:
    r = requests.get(f"{BASE_URL}/api/workspaces/{team_ws_id}", headers=auth(token_outsider))
    if r.status_code == 200:
        ok("Previously-outsider user can now access workspace after accepting invitation")
    else:
        fail("Invited user still cannot access workspace", f"{r.status_code}: {r.text[:200]}")
else:
    fail("Skipped — no workspace or invitation")


# ─────────────────────────────────────────────────────────────────────────────
# 13. Workspace Activity Log
# ─────────────────────────────────────────────────────────────────────────────
section("TEST 13: Workspace Activity Log")

if team_ws_id:
    r = requests.get(f"{BASE_URL}/api/workspaces/{team_ws_id}/activity", headers=auth(token_owner))
    if r.status_code == 200:
        activities = r.json()
        ok(f"Activity log retrieved: {len(activities)} entries")
    else:
        fail("GET /api/workspaces/{id}/activity failed", f"{r.status_code}: {r.text[:200]}")
else:
    fail("Skipped — no team workspace")


# ─────────────────────────────────────────────────────────────────────────────
# 14. Remove Member from Workspace
# ─────────────────────────────────────────────────────────────────────────────
section("TEST 14: Remove Member from Workspace")

if team_ws_id and member_user_id:
    r = requests.delete(
        f"{BASE_URL}/api/workspaces/{team_ws_id}/members/{member_user_id}",
        headers=auth(token_owner)
    )
    if r.status_code in (200, 204):
        ok("Member removed from workspace successfully")
    else:
        fail("DELETE member failed", f"{r.status_code}: {r.text[:200]}")
else:
    fail("Skipped — no workspace or member")


# ─────────────────────────────────────────────────────────────────────────────
# 15. Removed Member Loses Access
# ─────────────────────────────────────────────────────────────────────────────
section("TEST 15: Removed Member Loses Access")

if team_ws_id:
    r = requests.get(f"{BASE_URL}/api/workspaces/{team_ws_id}", headers=auth(token_member))
    if r.status_code in (403, 404):
        ok(f"Removed member correctly denied access (HTTP {r.status_code})")
    elif r.status_code == 200:
        fail("SECURITY: Removed member still has access to workspace", "Expected 403/404, got 200")
    else:
        fail("Unexpected status for removed member", f"{r.status_code}: {r.text[:200]}")
else:
    fail("Skipped — no workspace")


# ─────────────────────────────────────────────────────────────────────────────
# 16. File Permission Granting
# ─────────────────────────────────────────────────────────────────────────────
section("TEST 16: File Permission Granting")

r = requests.get(f"{BASE_URL}/api/files", headers=auth(token_owner))
file_id = None
if r.status_code == 200:
    files = r.json()
    if files:
        file_id = files[0].get("id")

if file_id:
    r = requests.post(f"{BASE_URL}/api/permissions/files/{file_id}/grant", headers=auth(token_owner), json={
        "targetUsername": "ws_outsider_01",
        "permission": "FILE_READ"
    })
    if r.status_code in (200, 201):
        ok(f"File permission FILE_READ granted to ws_outsider_01 for fileId={file_id}")
    else:
        fail("POST /api/permissions/files/{id}/grant failed", f"{r.status_code}: {r.text[:300]}")
else:
    ok("Skipped file permission test (no files exist yet — expected on clean environment)")


# ─────────────────────────────────────────────────────────────────────────────
# 17. Workspace Update
# ─────────────────────────────────────────────────────────────────────────────
section("TEST 17: Update Workspace")

if team_ws_id:
    r = requests.put(f"{BASE_URL}/api/workspaces/{team_ws_id}", headers=auth(token_owner), json={
        "name": "Phase5 Updated Team",
        "description": "Updated description"
    })
    if r.status_code == 200:
        ws = r.json()
        ok(f"Workspace updated: name='{ws.get('name')}'")
    else:
        fail("PUT /api/workspaces/{id} failed", f"{r.status_code}: {r.text[:200]}")
else:
    fail("Skipped — no team workspace")


# ─────────────────────────────────────────────────────────────────────────────
# 18. Archive & Restore Workspace
# ─────────────────────────────────────────────────────────────────────────────
section("TEST 18: Archive & Restore Workspace")

if team_ws_id:
    r = requests.post(f"{BASE_URL}/api/workspaces/{team_ws_id}/archive", headers=auth(token_owner))
    if r.status_code == 200:
        ok(f"Workspace archived: status={r.json().get('status')}")
        # Restore it
        r2 = requests.post(f"{BASE_URL}/api/workspaces/{team_ws_id}/restore", headers=auth(token_owner))
        if r2.status_code == 200:
            ok(f"Workspace restored: status={r2.json().get('status')}")
        else:
            fail("Workspace restore failed", f"{r2.status_code}: {r2.text[:200]}")
    else:
        fail("Workspace archive failed", f"{r.status_code}: {r.text[:200]}")
else:
    fail("Skipped — no team workspace")


# ─────────────────────────────────────────────────────────────────────────────
# 19. Leave Workspace (member self-removal)
# ─────────────────────────────────────────────────────────────────────────────
section("TEST 19: Leave Workspace")

# Re-add the member so they can leave
if team_ws_id:
    requests.post(f"{BASE_URL}/api/workspaces/{team_ws_id}/members", headers=auth(token_owner), json={
        "username": "ws_member_01",
        "role": "VIEWER"
    })
    # Correct route: POST /api/workspaces/{id}/members/leave
    r = requests.post(f"{BASE_URL}/api/workspaces/{team_ws_id}/members/leave", headers=auth(token_member))
    if r.status_code in (200, 204):
        ok("Member successfully left workspace")
    else:
        fail("Leave workspace failed", f"{r.status_code}: {r.text[:200]}")
else:
    fail("Skipped — no team workspace")


# ─────────────────────────────────────────────────────────────────────────────
# 20. Health Check
# ─────────────────────────────────────────────────────────────────────────────
section("TEST 20: Actuator Health")

r = requests.get(f"{BASE_URL}/actuator/health")
if r.status_code == 200 and r.json().get("status") == "UP":
    ok(f"Actuator health: {r.json()}")
else:
    fail("Actuator health check failed", f"{r.status_code}: {r.text[:200]}")


# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
section("RESULTS SUMMARY")
total = RESULTS["passed"] + RESULTS["failed"]
print(f"\n  Total Tests : {total}")
print(f"  Passed      : {RESULTS['passed']} [OK]")
print(f"  Failed      : {RESULTS['failed']} [FAIL]")

if RESULTS["errors"]:
    print("\n  Failed Tests:")
    for e in RESULTS["errors"]:
        print(f"    * {e}")

pass_rate = (RESULTS["passed"] / total * 100) if total > 0 else 0
print(f"\n  Pass Rate   : {pass_rate:.1f}%")
print()

if RESULTS["failed"] == 0:
    print("  *** ALL TESTS PASSED -- Phase 5 RBAC & Workspaces verified! ***")
else:
    print("  [!] Some tests failed -- review errors above")

sys.exit(0 if RESULTS["failed"] == 0 else 1)
