import requests
import time

BASE_URL = "http://localhost:8080/api"

def test_share_flow():
    print("--- STARTING SHARE FEATURE TEST ---")
    
    import uuid
    username = f"share_tester_{uuid.uuid4().hex[:6]}"
    password = "password"
    
    try:
        requests.post(f"{BASE_URL}/auth/register", json={
            "username": username,
            "password": password,
            "email": f"{username}@test.com"
        })
    except:
        pass
        
    login_res = requests.post(f"{BASE_URL}/auth/login", json={
        "username": username,
        "password": password
    })
    
    if login_res.status_code != 200:
        print(f"Login failed: {login_res.status_code} - {login_res.text}")
        return

    print(f"Login Response: {login_res.text}")
    try:
        token = login_res.json()["token"]
    except Exception as e:
        print(f"Failed to parse login JSON: {e}")
        return
    headers = {"Authorization": f"Bearer {token}"}
    print("1. Login Success.")

    # 2. Upload File
    content_str = "This is a shared file content."
    files = {'file': ('share_test.txt', content_str, 'text/plain')}
    upload_res = requests.post(f"{BASE_URL}/storage/upload", files=files, headers=headers)
    if upload_res.status_code != 200:
        print(f"Upload failed: {upload_res.text}")
        return
    print("2. Upload Success.")

    # 3. Get File ID
    list_res = requests.get(f"{BASE_URL}/storage", headers=headers)
    file_id = next((f['id'] for f in list_res.json() if f['name'] == 'share_test.txt'), None)
    if not file_id:
        print("File not found.")
        return
    print(f"3. File ID obtained: {file_id}")

    # 4. Create Share Link
    print(f"4. Creating Share Link for File {file_id}...")
    share_res = requests.post(f"{BASE_URL}/share/{file_id}", headers=headers)
    if share_res.status_code != 200:
        print(f"Share creation failed: {share_res.text}")
        return
    
    share_data = share_res.json()
    share_token = share_data['token']
    share_id = share_data['id']
    print(f"   Share Token: {share_token}")
    print(f"   Share ID: {share_id}")

    # 5. Public Access (No Auth)
    print("5. Testing Public Access...")
    public_res = requests.get(f"{BASE_URL}/public/{share_token}")
    if public_res.status_code == 200:
        if public_res.text == content_str:
             print("   SUCCESS: Public access worked and content matches.")
        else:
             print("   FAILED: Content mismatch.")
    else:
        print(f"   FAILED: Public access failed with {public_res.status_code}")

    # 6. List My Shares
    print("6. Listing My Shares...")
    my_shares_res = requests.get(f"{BASE_URL}/share", headers=headers)
    if any(s['token'] == share_token for s in my_shares_res.json()):
        print("   SUCCESS: Share found in list.")
    else:
        print("   FAILED: Share not found in list.")

    # 7. Disable Share
    print("7. Disabling Share...")
    del_res = requests.delete(f"{BASE_URL}/share/{share_id}", headers=headers)
    if del_res.status_code == 200:
        print("   Disable request success.")
    else:
        print(f"   Disable failed: {del_res.status_code}")

    # 8. Verify Public Access (Should fail)
    print("8. Verifying Disabled Access...")
    pub_fail_res = requests.get(f"{BASE_URL}/public/{share_token}")
    if pub_fail_res.status_code != 200:
        print(f"   SUCCESS: Access denied as expected ({pub_fail_res.status_code}).")
    else:
        print("   FAILED: Link is still active!")

if __name__ == "__main__":
    test_share_flow()
