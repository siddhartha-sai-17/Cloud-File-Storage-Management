import requests

BASE_URL = "http://localhost:8080/api"

def test_flow():
    # 1. Register
    print("1. Registering...")
    try:
        auth_res = requests.post(f"{BASE_URL}/auth/register", json={
            "username": "py_tester_new",
            "password": "password",
            "email": "py_new@test.com"
        })
    except:
         # If already exists, try login
         pass
         
    login_res = requests.post(f"{BASE_URL}/auth/login", json={
        "username": "py_tester_new",
        "password": "password"
    })
    
    if login_res.status_code != 200:
        print(f"Login failed: {login_res.text}")
        return

    token = login_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"Login Success. Token obtained.")

    # 2. Create Folder
    print("2. Creating Folder...")
    folder_res = requests.post(f"{BASE_URL}/storage/folder", params={"name": "TestFolder"}, headers=headers)
    if folder_res.status_code != 200:
        print(f"Folder creation failed: {folder_res.status_code} - {folder_res.text}")
    else:
        print("Folder created successfully.")

    # 3. Upload File
    print("3. Uploading Large File (10MB)...")
    large_content = "A" * 10 * 1024 * 1024 # 10MB
    files = {'file': ('large_file.txt', large_content, 'text/plain')}
    # Increase timeout for large upload
    upload_res = requests.post(f"{BASE_URL}/storage/upload", files=files, headers=headers)
    
    if upload_res.status_code != 200:
        print(f"Upload failed: {upload_res.status_code} - {upload_res.text}")
        return
    else:
        print("Upload success with 200 OK.")
        
    # 4. List Files (to get ID)
    print("4. Listing Files to get ID...")
    list_res = requests.get(f"{BASE_URL}/storage", headers=headers)
    files = list_res.json()
    # Find our file
    uploaded_file = next((f for f in files if f['name'] == 'large_file.txt'), None)
    
    if uploaded_file:
        file_id = uploaded_file['id']
        print(f"File found in list. ID: {file_id}. Downloading...")
        
        # 5. Download File
        download_res = requests.get(f"{BASE_URL}/storage/download/{file_id}", headers=headers)
        if download_res.status_code == 200:
            content = download_res.text
            # Check size or start of content, don't print 10MB
            # print(f"Download content length: {len(content)}")
            if len(content) == 10 * 1024 * 1024:
                print("VERIFICATION SUCCESS: Content length matches.")
            else:
                print("VERIFICATION FAILED: Content length mismatch.")
        else:
            print(f"Download failed: {download_res.status_code} - {download_res.text}")
    else:
        print("File not found in list.")

if __name__ == "__main__":
    test_flow()
