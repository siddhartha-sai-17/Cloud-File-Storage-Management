import streamlit as st
import requests
import os
from dotenv import load_dotenv
import io

load_dotenv()

# --- Configuration ---
# Use the Render URL from your previous deployment or localhost for testing
DEFAULT_BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8080")

st.set_page_config(page_title="Cloud Storage Manager", layout="wide", initial_sidebar_state="expanded")

# --- Session State ---
if 'token' not in st.session_state:
    st.session_state.token = None
if 'username' not in st.session_state:
    st.session_state.username = None
if 'current_folder_id' not in st.session_state:
    st.session_state.current_folder_id = None

# --- Helper Functions ---
def get_headers():
    return {"Authorization": f"Bearer {st.session_state.token}"} if st.session_state.token else {}

def handle_response(response):
    if response.status_code == 401:
        st.session_state.token = None
        st.error("Session expired. Please login again.")
        st.rerun()
    return response

# --- Auth ---
def login_page():
    st.title("🔐 Login to Cloud Storage")
    with st.form("login_form"):
        username = st.text_input("Username")
        password = st.text_input("Password", type="password")
        submit = st.form_submit_button("Login")
        
        if submit:
            res = requests.post(f"{st.session_state.backend_url}/api/auth/login", 
                                json={"username": username, "password": password})
            if res.status_code == 200:
                st.session_state.token = res.json().get("token")
                st.session_state.username = username
                st.success("Login successful!")
                st.rerun()
            else:
                st.error("Invalid credentials")

    if st.button("Don't have an account? Register here"):
        st.session_state.auth_mode = "register"
        st.rerun()

def register_page():
    st.title("📝 Create an Account")
    with st.form("register_form"):
        username = st.text_input("Username")
        email = st.text_input("Email")
        password = st.text_input("Password", type="password")
        submit = st.form_submit_button("Register")
        
        if submit:
            res = requests.post(f"{st.session_state.backend_url}/api/auth/register", 
                                json={"username": username, "password": password, "email": email})
            if res.status_code == 200:
                st.success("Registration successful! Please login.")
                st.session_state.auth_mode = "login"
                st.rerun()
            else:
                st.error(f"Registration failed: {res.text}")

    if st.button("Already have an account? Login here"):
        st.session_state.auth_mode = "login"
        st.rerun()

# --- Main App ---
def main_dashboard():
    st.sidebar.title(f"👋 High, {st.session_state.username}")
    if st.sidebar.button("Logout"):
        st.session_state.token = None
        st.rerun()

    st.title("📁 My Files")
    
    # Navigation
    if st.session_state.current_folder_id:
        if st.button("⬅️ Back to Root"):
            st.session_state.current_folder_id = None
            st.rerun()

    # File List
    res = requests.get(f"{st.session_state.backend_url}/api/storage", 
                      params={"folderId": st.session_state.current_folder_id},
                      headers=get_headers())
    
    if res.status_code == 200:
        items = res.json()
        if not items:
            st.info("No files or folders here.")
        else:
            for item in items:
                cols = st.columns([0.1, 0.5, 0.2, 0.2])
                icon = "📁" if item['type'] == 'FOLDER' else "📄"
                cols[0].write(icon)
                if item['type'] == 'FOLDER':
                    if cols[1].button(item['name'], key=f"folder_{item['id']}"):
                        st.session_state.current_folder_id = item['id']
                        st.rerun()
                else:
                    cols[1].write(item['name'])
                    
                # Download Button for files
                if item['type'] == 'FILE':
                    dl_res = requests.get(f"{st.session_state.backend_url}/api/storage/download/{item['id']}", 
                                         headers=get_headers())
                    if dl_res.status_code == 200:
                        cols[2].download_button(label="Download", data=dl_res.content, file_name=item['name'])
                
                # Share Button
                if cols[3].button("🔗 Share", key=f"share_{item['id']}"):
                    share_res = requests.post(f"{st.session_state.backend_url}/api/share/{item['id']}", 
                                             headers=get_headers())
                    if share_res.status_code == 200:
                        st.success(f"Share link created: {share_res.json()['token']}")
                    else:
                        st.error("Failed to share")

    # Actions Sidebar
    st.sidebar.markdown("---")
    st.sidebar.subheader("Actions")
    
    # Upload
    uploaded_file = st.sidebar.file_uploader("Upload a file")
    if uploaded_file:
        if st.sidebar.button("Confirm Upload"):
            files = {"file": (uploaded_file.name, uploaded_file.getvalue(), uploaded_file.type)}
            upload_res = requests.post(f"{st.session_state.backend_url}/api/storage/upload", 
                                      files=files, 
                                      params={"folderId": st.session_state.current_folder_id},
                                      headers=get_headers())
            if upload_res.status_code == 200:
                st.sidebar.success("Upload successful!")
                st.rerun()
            else:
                st.sidebar.error("Upload failed")

    # New Folder
    new_folder_name = st.sidebar.text_input("New Folder Name")
    if st.sidebar.button("Create Folder"):
        folder_res = requests.post(f"{st.session_state.backend_url}/api/storage/folder", 
                                  params={"name": new_folder_name, "parentId": st.session_state.current_folder_id},
                                  headers=get_headers())
        if folder_res.status_code == 200:
            st.sidebar.success("Folder created!")
            st.rerun()

# --- Entry Point ---
if "backend_url" not in st.session_state:
    st.session_state.backend_url = DEFAULT_BACKEND_URL

if "auth_mode" not in st.session_state:
    st.session_state.auth_mode = "login"

# Backend configuration in sidebar
with st.sidebar:
    st.session_state.backend_url = st.text_input("Backend URL", value=st.session_state.backend_url)

if st.session_state.token:
    main_dashboard()
else:
    if st.session_state.auth_mode == "login":
        login_page()
    else:
        register_page()
