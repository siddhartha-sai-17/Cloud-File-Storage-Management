import requests
import uuid
import sys
import unittest

BASE_URL = "http://localhost:8080/api"

# --- BACKWARD COMPATIBLE HELPER FUNCTIONS ---
def get_unique_name(prefix):
    return f"{prefix}_{uuid.uuid4().hex[:8]}"

def register_user(username, password, email):
    res = requests.post(f"{BASE_URL}/auth/register", json={"username": username, "password": password, "email": email})
    return res

def login(username, password):
    res = requests.post(f"{BASE_URL}/auth/login", json={"username": username, "password": password})
    return res

def upload_file(token, filename, content, folder_id=None):
    headers = {"Authorization": f"Bearer {token}"}
    files = {'file': (filename, content, 'text/plain')}
    params = {}
    if folder_id:
        params["folderId"] = folder_id
    res = requests.post(f"{BASE_URL}/storage/upload", files=files, params=params, headers=headers)
    return res

def create_folder(token, name, parent_id=None):
    headers = {"Authorization": f"Bearer {token}"}
    params = {"name": name}
    if parent_id:
        params["parentId"] = parent_id
    res = requests.post(f"{BASE_URL}/storage/folder", params=params, headers=headers)
    return res

def list_items(token, folder_id=None):
    headers = {"Authorization": f"Bearer {token}"}
    params = {}
    if folder_id:
        params["folderId"] = folder_id
    res = requests.get(f"{BASE_URL}/storage", params=params, headers=headers)
    return res

def rename_item(token, id, is_folder, new_name):
    headers = {"Authorization": f"Bearer {token}"}
    params = {"id": id, "isFolder": is_folder, "newName": new_name}
    res = requests.post(f"{BASE_URL}/storage/rename", params=params, headers=headers)
    return res

def soft_delete_item(token, id, is_folder):
    headers = {"Authorization": f"Bearer {token}"}
    params = {"id": id, "isFolder": is_folder}
    res = requests.post(f"{BASE_URL}/storage/delete", params=params, headers=headers)
    return res

def restore_item(token, id, is_folder):
    headers = {"Authorization": f"Bearer {token}"}
    params = {"id": id, "isFolder": is_folder}
    res = requests.post(f"{BASE_URL}/storage/restore", params=params, headers=headers)
    return res

def permanent_delete_item(token, id, is_folder):
    headers = {"Authorization": f"Bearer {token}"}
    params = {"id": id, "isFolder": is_folder}
    res = requests.delete(f"{BASE_URL}/storage/permanent", params=params, headers=headers)
    return res

def toggle_star(token, id):
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.post(f"{BASE_URL}/storage/star/{id}", headers=headers)
    return res

def list_starred(token):
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.get(f"{BASE_URL}/storage/starred", headers=headers)
    return res

def list_trash(token):
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.get(f"{BASE_URL}/storage/trash", headers=headers)
    return res

def share_file(token, file_id, password=None, expiry_days=None, download_limit=None):
    headers = {"Authorization": f"Bearer {token}"}
    params = {}
    if password:
        params["password"] = password
    if expiry_days is not None:
        params["expiryDays"] = expiry_days
    if download_limit is not None:
        params["downloadLimit"] = download_limit
    res = requests.post(f"{BASE_URL}/share/{file_id}", params=params, headers=headers)
    return res

def list_shares(token):
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.get(f"{BASE_URL}/share", headers=headers)
    return res

def get_public_info(token_share):
    res = requests.get(f"{BASE_URL}/public/info/{token_share}")
    return res

def download_public_file(token_share, password=None):
    params = {}
    if password:
        params["password"] = password
    res = requests.get(f"{BASE_URL}/public/{token_share}", params=params)
    return res

def update_tags(token, id, tags):
    headers = {"Authorization": f"Bearer {token}"}
    params = {"id": id, "tags": tags}
    res = requests.post(f"{BASE_URL}/storage/tags", params=params, headers=headers)
    return res

def update_category(token, id, category):
    headers = {"Authorization": f"Bearer {token}"}
    params = {"id": id, "category": category}
    res = requests.post(f"{BASE_URL}/storage/category", params=params, headers=headers)
    return res

def update_classification(token, id, classification):
    headers = {"Authorization": f"Bearer {token}"}
    params = {"id": id, "classification": classification}
    res = requests.post(f"{BASE_URL}/storage/classification", params=params, headers=headers)
    return res

def copy_item(token, id, is_folder, target_folder_id=None):
    headers = {"Authorization": f"Bearer {token}"}
    params = {"id": id, "isFolder": is_folder}
    if target_folder_id:
        params["targetFolderId"] = target_folder_id
    res = requests.post(f"{BASE_URL}/storage/copy", params=params, headers=headers)
    return res

def move_item(token, id, is_folder, target_folder_id=None):
    headers = {"Authorization": f"Bearer {token}"}
    params = {"id": id, "isFolder": is_folder}
    if target_folder_id:
        params["targetFolderId"] = target_folder_id
    res = requests.post(f"{BASE_URL}/storage/move", params=params, headers=headers)
    return res

def get_analytics(token):
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.get(f"{BASE_URL}/storage/analytics", headers=headers)
    return res


# --- UNITTEST-BASED INTEGRATION TEST SUITE ---
class CloudStorageIntegrationTests(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        print("\n=== Initializing Test Users ===")
        cls.user_a = get_unique_name("user_a")
        cls.user_b = get_unique_name("user_b")
        cls.password = "SuperSecure123!"

        # Register User A
        reg_a = register_user(cls.user_a, cls.password, f"{cls.user_a}@test.com")
        assert reg_a.status_code == 200, f"Setup: User A registration failed: {reg_a.text}"
        cls.token_a = reg_a.json()["token"]

        # Register User B
        reg_b = register_user(cls.user_b, cls.password, f"{cls.user_b}@test.com")
        assert reg_b.status_code == 200, f"Setup: User B registration failed: {reg_b.text}"
        cls.token_b = reg_b.json()["token"]

    def setUp(self):
        # We track files/folders created during each test to clean them up in tearDown
        self.created_files_a = []
        self.created_folders_a = []

    def tearDown(self):
        # Clean up files created in User A context
        for file_id in self.created_files_a:
            try:
                permanent_delete_item(self.token_a, file_id, False)
            except:
                pass
        # Clean up folders created in User A context
        for folder_id in self.created_folders_a:
            try:
                permanent_delete_item(self.token_a, folder_id, True)
            except:
                pass

    def _get_item_by_name(self, token, name, folder_id=None):
        items = list_items(token, folder_id).json()
        for item in items:
            if item["name"] == name:
                return item
        return None

    # --- 1. AUTHENTICATION SCENARIOS ---
    def test_01_authentication(self):
        print("Running: Authentication Tests...")
        # Valid Login
        login_ok = login(self.user_a, self.password)
        self.assertEqual(login_ok.status_code, 200)
        self.assertIn("token", login_ok.json())

        # Invalid Login (Wrong password)
        login_fail = login(self.user_a, "IncorrectPassword")
        self.assertEqual(login_fail.status_code, 400) # Bad Request

        # Missing Token
        res_no_tok = list_items("")
        self.assertEqual(res_no_tok.status_code, 401)

        # Invalid Token
        res_bad_tok = requests.get(f"{BASE_URL}/storage", headers={"Authorization": "Bearer BadToken123"})
        self.assertEqual(res_bad_tok.status_code, 401)

    # --- 2. UPLOAD SCENARIOS ---
    def test_02_upload_boundaries(self):
        print("Running: Upload Boundary Tests...")
        # Normal Upload
        content = "Invoice details: $120.00"
        res = upload_file(self.token_a, "invoice_upload.pdf", content)
        self.assertEqual(res.status_code, 200)
        
        item = self._get_item_by_name(self.token_a, "invoice_upload.pdf")
        self.assertIsNotNone(item)
        self.created_files_a.append(item["id"])

        # Unicode filename
        unicode_name = "test_日本語_document.txt"
        res_uni = upload_file(self.token_a, unicode_name, "Unicode file content")
        self.assertEqual(res_uni.status_code, 200)
        uni_item = self._get_item_by_name(self.token_a, unicode_name)
        self.assertIsNotNone(uni_item)
        self.created_files_a.append(uni_item["id"])

        # Empty file
        res_empty = upload_file(self.token_a, "empty_file.txt", "")
        self.assertEqual(res_empty.status_code, 200)
        empty_item = self._get_item_by_name(self.token_a, "empty_file.txt")
        self.assertIsNotNone(empty_item)
        self.created_files_a.append(empty_item["id"])
        self.assertEqual(empty_item["size"], 0)

        # Large File (approx 5MB)
        large_content = "X" * (5 * 1024 * 1024)
        res_large = upload_file(self.token_a, "large_file.txt", large_content)
        self.assertEqual(res_large.status_code, 200)
        large_item = self._get_item_by_name(self.token_a, "large_file.txt")
        self.assertIsNotNone(large_item)
        self.created_files_a.append(large_item["id"])
        self.assertEqual(large_item["size"], len(large_content))

        # Invalid/unrecognized extension (returns "Other" category)
        res_ext = upload_file(self.token_a, "unknown_ext.xyz", "XYZ Content")
        self.assertEqual(res_ext.status_code, 200)
        ext_item = self._get_item_by_name(self.token_a, "unknown_ext.xyz")
        self.assertIsNotNone(ext_item)
        self.created_files_a.append(ext_item["id"])
        self.assertEqual(ext_item["category"], "Other")

    # --- 3. SMART DUPLICATE DETECTION ---
    def test_03_duplicate_detection(self):
        print("Running: Duplicate Detection Tests...")
        content = "Deduplication Content Rule 101"
        
        # First upload
        res1 = upload_file(self.token_a, "dup1.txt", content)
        self.assertEqual(res1.status_code, 200)
        item1 = self._get_item_by_name(self.token_a, "dup1.txt")
        self.created_files_a.append(item1["id"])

        # Record analytics before duplicate upload
        anal_before = get_analytics(self.token_a).json()
        savings_before = anal_before["duplicateSavings"]
        usage_before = anal_before["storageUsage"]

        # Second upload with same content
        res2 = upload_file(self.token_a, "dup2.txt", content)
        self.assertEqual(res2.status_code, 200)
        item2 = self._get_item_by_name(self.token_a, "dup2.txt")
        self.created_files_a.append(item2["id"])

        # Check DB metadata reference match
        self.assertNotEqual(item1["id"], item2["id"])
        
        # Verify SHA-256 and storage path match (Deduplication validation)
        # We need to fetch items using detailed list or direct lookup (which exposes details)
        # Note: the lists include size, type, starred, category, confidenceScore, tags, versionValue, classification.
        # Storage path is not exposed on StorageDto.Item, but we can verify it via analytics savings increment!
        anal_after = get_analytics(self.token_a).json()
        savings_after = anal_after["duplicateSavings"]
        usage_after = anal_after["storageUsage"]

        # The duplicate savings should increase by exactly the size of the duplicate file (30 bytes)
        self.assertEqual(savings_after - savings_before, item1["size"])
        # Storage usage counts the metadata size, which goes up by 30 bytes
        self.assertEqual(usage_after - usage_before, item1["size"])

    # --- 4. AI CLASSIFICATION & OVERRIDE ---
    def test_04_ai_classification(self):
        print("Running: AI Classification & Override Tests...")
        res = upload_file(self.token_a, "my_invoice_details.pdf", "Invoice details")
        self.assertEqual(res.status_code, 200)
        item = self._get_item_by_name(self.token_a, "my_invoice_details.pdf")
        self.created_files_a.append(item["id"])

        # Assert AI categorized correctly
        self.assertEqual(item["category"], "Invoice")
        self.assertIsNotNone(item["confidenceScore"])

        # Manual Override
        res_override = update_category(self.token_a, item["id"], "Resume")
        self.assertEqual(res_override.status_code, 200)

        # Assert override is applied and confidenceScore is set to 1.0 (100%)
        updated_items = list_items(self.token_a).json()
        updated_item = next(i for i in updated_items if i["id"] == item["id"])
        self.assertEqual(updated_item["category"], "Resume")
        self.assertEqual(updated_item["confidenceScore"], 1.0)

    # --- 5. RENAME SCENARIOS ---
    def test_05_rename_scenarios(self):
        print("Running: Rename Scenarios...")
        res = upload_file(self.token_a, "rename_me.txt", "Rename content")
        item = self._get_item_by_name(self.token_a, "rename_me.txt")
        self.created_files_a.append(item["id"])

        # Rename once
        res_ren1 = rename_item(self.token_a, item["id"], False, "renamed_once.txt")
        self.assertEqual(res_ren1.status_code, 200)
        self.assertIsNotNone(self._get_item_by_name(self.token_a, "renamed_once.txt"))

        # Rename twice
        res_ren2 = rename_item(self.token_a, item["id"], False, "renamed_twice.txt")
        self.assertEqual(res_ren2.status_code, 200)
        self.assertIsNotNone(self._get_item_by_name(self.token_a, "renamed_twice.txt"))

        # Rename to empty name -> assert 400 Bad Request
        res_ren_empty = rename_item(self.token_a, item["id"], False, "")
        self.assertEqual(res_ren_empty.status_code, 400)

        # Rename deleted file -> assert 404/400 (cannot rename a deleted file)
        soft_delete_item(self.token_a, item["id"], False)
        res_ren_deleted = rename_item(self.token_a, item["id"], False, "renamed_deleted.txt")
        self.assertEqual(res_ren_deleted.status_code, 400)
        
        # Restore for subsequent checks
        restore_item(self.token_a, item["id"], False)

        # Rename unauthorized file -> assert 403 Forbidden
        res_ren_unauth = rename_item(self.token_b, item["id"], False, "hacked_name.txt")
        self.assertEqual(res_ren_unauth.status_code, 403)

    # --- 6. MOVE SCENARIOS ---
    def test_06_move_scenarios(self):
        print("Running: Move Scenarios...")
        # Create Folder A and Folder B
        create_folder(self.token_a, "Folder_A")
        f_a = self._get_item_by_name(self.token_a, "Folder_A")
        self.created_folders_a.append(f_a["id"])

        create_folder(self.token_a, "Folder_B")
        f_b = self._get_item_by_name(self.token_a, "Folder_B")
        self.created_folders_a.append(f_b["id"])

        # Upload file in root
        upload_file(self.token_a, "move_file.txt", "Move content")
        file_item = self._get_item_by_name(self.token_a, "move_file.txt")
        self.created_files_a.append(file_item["id"])

        # Move file to Folder A
        res_move = move_item(self.token_a, file_item["id"], False, f_a["id"])
        self.assertEqual(res_move.status_code, 200)

        # Verify not in root and is in Folder A
        self.assertIsNone(self._get_item_by_name(self.token_a, "move_file.txt"))
        self.assertIsNotNone(self._get_item_by_name(self.token_a, "move_file.txt", f_a["id"]))

        # Move Folder B inside Folder A
        res_move_fold = move_item(self.token_a, f_b["id"], True, f_a["id"])
        self.assertEqual(res_move_fold.status_code, 200)
        self.assertIsNotNone(self._get_item_by_name(self.token_a, "Folder_B", f_a["id"]))

        # Cyclic Move Prevention: Try to move Folder A inside Folder B (which is inside Folder A) -> assert 400 Bad Request
        res_cyclic = move_item(self.token_a, f_a["id"], True, f_b["id"])
        self.assertEqual(res_cyclic.status_code, 400)

        # Move to nonexistent folder -> assert 404 Not Found
        res_invalid_parent = move_item(self.token_a, file_item["id"], False, 999999)
        self.assertEqual(res_invalid_parent.status_code, 404)

        # Move soft-deleted file -> assert 400
        soft_delete_item(self.token_a, file_item["id"], False)
        res_move_del = move_item(self.token_a, file_item["id"], False, f_a["id"])
        self.assertEqual(res_move_del.status_code, 400)
        restore_item(self.token_a, file_item["id"], False)

    # --- 7. COPY SCENARIOS ---
    def test_07_copy_scenarios(self):
        print("Running: Copy Scenarios...")
        create_folder(self.token_a, "Copy_Folder")
        fold = self._get_item_by_name(self.token_a, "Copy_Folder")
        self.created_folders_a.append(fold["id"])

        upload_file(self.token_a, "copy_source.txt", "Copy content")
        file_item = self._get_item_by_name(self.token_a, "copy_source.txt")
        self.created_files_a.append(file_item["id"])
        
        # Add tags and classification
        update_tags(self.token_a, file_item["id"], "tag1,tag2")
        update_classification(self.token_a, file_item["id"], "Confidential")

        # Copy file to Folder
        res_copy = copy_item(self.token_a, file_item["id"], False, fold["id"])
        self.assertEqual(res_copy.status_code, 200)

        # Verify copy exists inside folder
        copied_item = self._get_item_by_name(self.token_a, "Copy of copy_source.txt", fold["id"])
        self.assertIsNotNone(copied_item)
        self.created_files_a.append(copied_item["id"])
        
        # Verify metadata copied
        self.assertEqual(copied_item["tags"], "tag1,tag2")
        self.assertEqual(copied_item["classification"], "Confidential")
        self.assertEqual(copied_item["category"], file_item["category"])

        # Copy folder
        res_copy_fold = copy_item(self.token_a, fold["id"], True, None)
        self.assertEqual(res_copy_fold.status_code, 200)
        
        copied_fold = self._get_item_by_name(self.token_a, "Copy of Copy_Folder")
        self.assertIsNotNone(copied_fold)
        self.created_folders_a.append(copied_fold["id"])

        # Verify recursive nested file copy (naming prefix applied)
        copied_nested_file = self._get_item_by_name(self.token_a, "Copy of Copy of copy_source.txt", copied_fold["id"])
        self.assertIsNotNone(copied_nested_file)
        self.created_files_a.append(copied_nested_file["id"])

    # --- 8. TRASH FLOW & IDEMPOTENCY ---
    def test_08_trash_flow(self):
        print("Running: Trash and Soft/Permanent Delete Tests...")
        upload_file(self.token_a, "trash_test.txt", "Trash test content")
        item = self._get_item_by_name(self.token_a, "trash_test.txt")
        self.created_files_a.append(item["id"])

        # Soft Delete
        res_del = soft_delete_item(self.token_a, item["id"], False)
        self.assertEqual(res_del.status_code, 200)
        
        # Check active and trash lists
        self.assertIsNone(self._get_item_by_name(self.token_a, "trash_test.txt"))
        trash = list_trash(self.token_a).json()
        self.assertTrue(any(t["id"] == item["id"] for t in trash))

        # Soft Delete already deleted -> Should be idempotent (return 200)
        res_del_twice = soft_delete_item(self.token_a, item["id"], False)
        self.assertEqual(res_del_twice.status_code, 200)

        # Delete nonexistent -> assert 404 Not Found
        res_del_nonexistent = soft_delete_item(self.token_a, 999999, False)
        self.assertEqual(res_del_nonexistent.status_code, 404)

        # Restore
        res_res = restore_item(self.token_a, item["id"], False)
        self.assertEqual(res_res.status_code, 200)
        self.assertIsNotNone(self._get_item_by_name(self.token_a, "trash_test.txt"))

        # Restore already restored -> Should be idempotent (return 200)
        res_res_twice = restore_item(self.token_a, item["id"], False)
        self.assertEqual(res_res_twice.status_code, 200)

        # Restore nonexistent -> assert 404 Not Found
        res_res_nonexistent = restore_item(self.token_a, 999999, False)
        self.assertEqual(res_res_nonexistent.status_code, 404)

        # Permanent Delete
        soft_delete_item(self.token_a, item["id"], False)
        res_perm = permanent_delete_item(self.token_a, item["id"], False)
        self.assertEqual(res_perm.status_code, 200)
        
        # Ensure completely gone
        self.assertIsNone(self._get_item_by_name(self.token_a, "trash_test.txt"))
        trash = list_trash(self.token_a).json()
        self.assertFalse(any(t["id"] == item["id"] for t in trash))

    # --- 9. STARRED (FAVORITES) ---
    def test_09_starred(self):
        print("Running: Starred Files Tests...")
        upload_file(self.token_a, "starred_test.txt", "Starred content")
        item = self._get_item_by_name(self.token_a, "starred_test.txt")
        self.created_files_a.append(item["id"])

        # Star
        res_star = toggle_star(self.token_a, item["id"])
        self.assertEqual(res_star.status_code, 200)
        starred = list_starred(self.token_a).json()
        self.assertTrue(any(s["id"] == item["id"] for s in starred))

        # Star Twice (Toggles back to unstarred)
        res_star_twice = toggle_star(self.token_a, item["id"])
        self.assertEqual(res_star_twice.status_code, 200)
        starred = list_starred(self.token_a).json()
        self.assertFalse(any(s["id"] == item["id"] for s in starred))

        # Star deleted file -> assert 400 Bad Request
        soft_delete_item(self.token_a, item["id"], False)
        res_star_del = toggle_star(self.token_a, item["id"])
        self.assertEqual(res_star_del.status_code, 400)
        restore_item(self.token_a, item["id"], False)

    # --- 10. DOCUMENT TAGGING ---
    def test_10_tags(self):
        print("Running: Document Tagging Tests...")
        upload_file(self.token_a, "tag_test.txt", "Tags content")
        item = self._get_item_by_name(self.token_a, "tag_test.txt")
        self.created_files_a.append(item["id"])

        # Add tags
        res_tag = update_tags(self.token_a, item["id"], "finance,q1")
        self.assertEqual(res_tag.status_code, 200)
        item_updated = self._get_item_by_name(self.token_a, "tag_test.txt")
        self.assertEqual(item_updated["tags"], "finance,q1")

        # Edit/Update tags
        res_tag_edit = update_tags(self.token_a, item["id"], "finance,q2,invoice")
        self.assertEqual(res_tag_edit.status_code, 200)
        item_updated = self._get_item_by_name(self.token_a, "tag_test.txt")
        self.assertEqual(item_updated["tags"], "finance,q2,invoice")

        # Remove tags (set empty string)
        res_tag_clear = update_tags(self.token_a, item["id"], "")
        self.assertEqual(res_tag_clear.status_code, 200)
        item_updated = self._get_item_by_name(self.token_a, "tag_test.txt")
        self.assertEqual(item_updated["tags"], "")

    # --- 11. SECURE SHARING ---
    def test_11_secure_sharing(self):
        print("Running: Secure Sharing Tests...")
        content = "Secret invoice contents."
        upload_file(self.token_a, "share_test.txt", content)
        item = self._get_item_by_name(self.token_a, "share_test.txt")
        self.created_files_a.append(item["id"])

        # Create Password-Protected link with Download Limit = 1
        res_share = share_file(self.token_a, item["id"], password="123", download_limit=1)
        self.assertEqual(res_share.status_code, 200)
        share = res_share.json()
        token_share = share["token"]
        self.assertEqual(share["downloadLimit"], 1)

        # Get public share details (password is required, so fileName is hidden)
        info = get_public_info(token_share).json()
        self.assertTrue(info["passwordRequired"])
        self.assertNotIn("fileName", info)

        # Create an open public link without password to verify metadata disclosure
        res_pub = share_file(self.token_a, item["id"], password=None)
        self.assertEqual(res_pub.status_code, 200)
        token_pub = res_pub.json()["token"]
        info_pub = get_public_info(token_pub).json()
        self.assertFalse(info_pub["passwordRequired"])
        self.assertEqual(info_pub["fileName"], "share_test.txt")
        self.assertEqual(info_pub["size"], item["size"])

        # Download without password -> assert 400
        dl_no_pass = download_public_file(token_share)
        self.assertEqual(dl_no_pass.status_code, 400)

        # Download with incorrect password -> assert 400
        dl_wrong_pass = download_public_file(token_share, "wrong")
        self.assertEqual(dl_wrong_pass.status_code, 400)

        # Download with correct password -> assert 200
        dl_ok = download_public_file(token_share, "123")
        self.assertEqual(dl_ok.status_code, 200)
        self.assertEqual(dl_ok.text, content)

        # Download limit boundary check: Try download again -> assert 400 (download limit exceeded)
        dl_limit_exceeded = download_public_file(token_share, "123")
        self.assertEqual(dl_limit_exceeded.status_code, 400)

        # Unlimited download check
        res_share_unlimit = share_file(self.token_a, item["id"], password="123", download_limit=None)
        token_share_unlimit = res_share_unlimit.json()["token"]
        for _ in range(3):
            dl = download_public_file(token_share_unlimit, "123")
            self.assertEqual(dl.status_code, 200)

        # Expired link check: expiryDays = -1 creates link in the past
        res_share_expired = share_file(self.token_a, item["id"], password=None, expiry_days=-1)
        token_share_expired = res_share_expired.json()["token"]
        dl_expired = download_public_file(token_share_expired)
        self.assertEqual(dl_expired.status_code, 400)

        # Disabled share check
        res_share_disabled = share_file(self.token_a, item["id"], password=None)
        share_disabled = res_share_disabled.json()
        # Disable it using the API
        headers = {"Authorization": f"Bearer {self.token_a}"}
        res_disable = requests.delete(f"{BASE_URL}/share/{share_disabled['id']}", headers=headers)
        self.assertEqual(res_disable.status_code, 200)
        # Attempt download -> assert 400 (disabled link)
        dl_disabled = download_public_file(share_disabled["token"])
        self.assertEqual(dl_disabled.status_code, 400)

        # Share deleted file -> assert 400
        soft_delete_item(self.token_a, item["id"], False)
        res_share_deleted = share_file(self.token_a, item["id"], password=None)
        self.assertEqual(res_share_deleted.status_code, 400)
        restore_item(self.token_a, item["id"], False)

        # Share nonexistent file -> assert 404
        res_share_nonexistent = share_file(self.token_a, 999999)
        self.assertEqual(res_share_nonexistent.status_code, 404)

    # --- 12. CROSS-USER AUTHORIZATION CONTROLS ---
    def test_12_cross_user_authorization(self):
        print("Running: Cross-User Authorization Tests...")
        upload_file(self.token_a, "user_a_private.txt", "Secret User A content")
        item = self._get_item_by_name(self.token_a, "user_a_private.txt")
        self.created_files_a.append(item["id"])

        # User B attempts to access User A's file
        # Rename -> assert 403 Forbidden
        res_ren = rename_item(self.token_b, item["id"], False, "hacked.txt")
        self.assertEqual(res_ren.status_code, 403)

        # Soft Delete -> assert 403 Forbidden
        res_del = soft_delete_item(self.token_b, item["id"], False)
        self.assertEqual(res_del.status_code, 403)

        # Restore -> assert 403 Forbidden
        res_restore = restore_item(self.token_b, item["id"], False)
        self.assertEqual(res_restore.status_code, 403)

        # Permanent Delete -> assert 403 Forbidden
        res_perm = permanent_delete_item(self.token_b, item["id"], False)
        self.assertEqual(res_perm.status_code, 403)

        # Toggle Star -> assert 403 Forbidden
        res_star = toggle_star(self.token_b, item["id"])
        self.assertEqual(res_star.status_code, 403)

        # Share File -> assert 403 Forbidden
        res_share = share_file(self.token_b, item["id"], password=None)
        self.assertEqual(res_share.status_code, 403)

        # Move File -> assert 403 Forbidden
        res_move = move_item(self.token_b, item["id"], False, None)
        self.assertEqual(res_move.status_code, 403)

        # Copy File -> assert 403 Forbidden
        res_copy = copy_item(self.token_b, item["id"], False, None)
        self.assertEqual(res_copy.status_code, 403)

        # IDOR Direct Object Reference Download Check -> assert 403 Forbidden
        res_download = requests.get(f"{BASE_URL}/storage/download/{item['id']}", headers={"Authorization": f"Bearer {self.token_b}"})
        self.assertEqual(res_download.status_code, 403)

    # --- 13. API CONTRACT VALIDATION ---
    def test_13_api_contract_validation(self):
        print("Running: API Contract Validation...")
        upload_file(self.token_a, "schema_test.txt", "Schema checking")
        item = self._get_item_by_name(self.token_a, "schema_test.txt")
        self.created_files_a.append(item["id"])

        # Check response list schema fields and types
        items = list_items(self.token_a).json()
        item_ref = next(i for i in items if i["id"] == item["id"])
        
        self.assertIn("id", item_ref)
        self.assertIsInstance(item_ref["id"], int)
        
        self.assertIn("name", item_ref)
        self.assertIsInstance(item_ref["name"], str)
        
        self.assertIn("type", item_ref)
        self.assertEqual(item_ref["type"], "FILE")
        
        self.assertIn("size", item_ref)
        self.assertIsInstance(item_ref["size"], int)

        self.assertIn("createdDate", item_ref)
        self.assertIsInstance(item_ref["createdDate"], str)

        self.assertIn("starred", item_ref)
        self.assertIsInstance(item_ref["starred"], bool)

        self.assertIn("category", item_ref)
        self.assertIsInstance(item_ref["category"], str)

        self.assertIn("confidenceScore", item_ref)
        self.assertIsInstance(item_ref["confidenceScore"], float)

        self.assertIn("classification", item_ref)
        self.assertIsInstance(item_ref["classification"], str)

    # --- 14. ANALYTICS API SCENARIOS ---
    def test_14_analytics_verification(self):
        print("Running: Analytics Metrics Tests...")
        # Get baseline analytics
        base = get_analytics(self.token_a).json()
        base_files = base["fileCount"]
        base_usage = base["storageUsage"]

        # Upload a file (size 10 bytes)
        res = upload_file(self.token_a, "anal_upload.txt", "1234567890")
        item = self._get_item_by_name(self.token_a, "anal_upload.txt")
        self.created_files_a.append(item["id"])

        # Star the file
        toggle_star(self.token_a, item["id"])

        # Upload a soft-deleted file
        upload_file(self.token_a, "anal_soft_deleted.txt", "deleted")
        item_del = self._get_item_by_name(self.token_a, "anal_soft_deleted.txt")
        self.created_files_a.append(item_del["id"])
        soft_delete_item(self.token_a, item_del["id"], False)

        # Check updated analytics
        updated = get_analytics(self.token_a).json()
        
        self.assertEqual(updated["fileCount"] - base_files, 1) # anal_upload.txt is active, anal_soft_deleted.txt is not
        self.assertEqual(updated["storageUsage"] - base_usage, 10)
        self.assertEqual(updated["starredCount"], 1)
        self.assertEqual(updated["trashCount"], 1)

    # --- 15. DATABASE INTEGRITY & CASCADE RULES ---
    def test_15_cascading_operations(self):
        print("Running: Folder Cascading and Integrity Tests...")
        # Create Folder
        create_folder(self.token_a, "Parent_Folder")
        parent = self._get_item_by_name(self.token_a, "Parent_Folder")
        self.created_folders_a.append(parent["id"])

        # Create nested file
        res = upload_file(self.token_a, "nested_file.txt", "Nested", parent["id"])
        self.assertEqual(res.status_code, 200)
        nested = self._get_item_by_name(self.token_a, "nested_file.txt", parent["id"])
        self.created_files_a.append(nested["id"])

        # Soft Delete parent folder
        res_del = soft_delete_item(self.token_a, parent["id"], True)
        self.assertEqual(res_del.status_code, 200)

        # Assert nested file is soft-deleted (not in active listing and exists in trash)
        active_items = list_items(self.token_a, parent["id"]).json()
        self.assertEqual(len(active_items), 0)
        
        trash = list_trash(self.token_a).json()
        self.assertTrue(any(t["id"] == nested["id"] for t in trash))
        self.assertTrue(any(t["id"] == parent["id"] for t in trash))

        # Restore parent folder
        res_restore = restore_item(self.token_a, parent["id"], True)
        self.assertEqual(res_restore.status_code, 200)

        # Assert nested items are restored to active listing
        active_items = list_items(self.token_a, parent["id"]).json()
        self.assertEqual(len(active_items), 1)
        self.assertEqual(active_items[0]["id"], nested["id"])

        # Permanent cascade delete
        soft_delete_item(self.token_a, parent["id"], True)
        res_perm = permanent_delete_item(self.token_a, parent["id"], True)
        self.assertEqual(res_perm.status_code, 200)

        # Ensure parent folder and nested file are completely gone from DB
        trash_after = list_trash(self.token_a).json()
        self.assertFalse(any(t["id"] == parent["id"] for t in trash_after))
        self.assertFalse(any(t["id"] == nested["id"] for t in trash_after))


def test_all():
    print("==========================================================")
    print("STARTING ADVANCED ENTERPRISE INTEGRATION TEST SUITE")
    print("==========================================================")

    # Use unittest to run the tests and display step-by-step results
    suite = unittest.TestLoader().loadTestsFromTestCase(CloudStorageIntegrationTests)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    print("\n==========================================================")
    if result.wasSuccessful():
        print("[SUCCESS] ALL ENTERPRISE INTEGRATION TESTS PASSED!")
        print("==========================================================")
        sys.exit(0)
    else:
        print("[FAIL] INTEGRATION TEST SUITE ENCOUNTERED FAILURES.")
        print("==========================================================")
        sys.exit(1)


if __name__ == "__main__":
    test_all()
