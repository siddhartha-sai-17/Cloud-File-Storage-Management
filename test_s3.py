import os
from aws_s3 import upload_file, download_file, list_files, delete_file, generate_presigned_url

def main():
    print("--- Starting AWS S3 Tests ---")
    
    # Setup test file
    test_local_file = "downloads/test_upload.txt"
    test_download_file = "downloads/test_download.txt"
    test_s3_key = "test_folder/test_file.txt"
    
    os.makedirs("downloads", exist_ok=True)
    with open(test_local_file, "w") as f:
        f.write("Hello from AWS S3 Test!")

    # 1. Test Upload
    print("\n1. Testing Upload...")
    success = upload_file(test_local_file, test_s3_key)
    print(f"Upload Success: {success}")

    # 2. Test List
    print("\n2. Testing List...")
    files = list_files(prefix="test_folder/")
    print(f"Files in 'test_folder/': {files}")

    # 3. Test Generate Presigned URL
    print("\n3. Testing Presigned URL...")
    url = generate_presigned_url(test_s3_key)
    print(f"Presigned URL: {url}")

    # 4. Test Download
    print("\n4. Testing Download...")
    success = download_file(test_s3_key, test_download_file)
    print(f"Download Success: {success}")
    if os.path.exists(test_download_file):
        with open(test_download_file, "r") as f:
            print(f"Downloaded Content: {f.read()}")

    # 5. Test Delete
    print("\n5. Testing Delete...")
    success = delete_file(test_s3_key)
    print(f"Delete Success: {success}")

    # Cleanup local files
    if os.path.exists(test_local_file):
        os.remove(test_local_file)
    if os.path.exists(test_download_file):
        os.remove(test_download_file)

    print("\n--- AWS S3 Tests Completed ---")

if __name__ == "__main__":
    main()
