# User Guide — Enterprise Cloud File Storage System

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Signing In](#2-signing-in)
3. [Dashboard Overview](#3-dashboard-overview)
4. [Uploading Files](#4-uploading-files)
5. [Managing Files & Folders](#5-managing-files--folders)
6. [Search & OCR](#6-search--ocr)
7. [Version History](#7-version-history)
8. [File Sharing](#8-file-sharing)
9. [Team Workspaces](#9-team-workspaces)
10. [Comments & Collaboration](#10-comments--collaboration)
11. [Favorites & Recent Files](#11-favorites--recent-files)
12. [Trash & Recovery](#12-trash--recovery)
13. [Notifications](#13-notifications)
14. [Keyboard Shortcuts](#14-keyboard-shortcuts)

---

## 1. Getting Started

### Registration

1. Navigate to the application URL in your browser.
2. Click **Create Account** on the login page.
3. Fill in your name, email address, and a secure password (minimum 8 characters).
4. Click **Register**.
5. You are automatically signed in and redirected to the Dashboard.

### Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one number or special character

---

## 2. Signing In

1. Go to the application login page.
2. Enter your **email** and **password**.
3. Click **Sign In**.

### Forgot Password

1. Click **Forgot Password** on the login page.
2. Enter your registered email address.
3. Click **Send Reset Link**.
4. Check your email inbox for the reset link.
5. Click the link and enter a new password.

### Session Expiry

Your session automatically expires after 24 hours. You will be redirected to the login page. Your files are never affected by session expiry.

---

## 3. Dashboard Overview

The dashboard is your home screen after logging in. It shows:

| Section | Description |
|---|---|
| **Storage Usage** | Pie chart of your current storage utilization |
| **Recent Files** | The last 10 files you accessed |
| **Quick Upload** | Drag-and-drop upload area |
| **File Types** | Breakdown of files by category (documents, images, video) |
| **Team Activity** | Recent file operations in shared workspaces |

### Navigation Sidebar

| Item | Description |
|---|---|
| 🏠 Dashboard | Return to the home screen |
| 📁 Files | Browse all your files and folders |
| 🔍 Search | Search files by name or content |
| ⭐ Favorites | View your starred files |
| 🕐 Recent | Recently opened files |
| 🗑️ Trash | Deleted files awaiting permanent removal |
| 📊 Analytics | Detailed storage and usage analytics |
| 🏢 Workspaces | Team workspaces |
| 🔔 Notifications | System and collaboration notifications |

---

## 4. Uploading Files

### Drag and Drop

1. Navigate to **Files** or the **Dashboard**.
2. Drag files or folders from your computer directly onto the file area.
3. A progress bar appears for each file with speed and ETA.
4. Uploaded files appear in the current folder immediately.

### Browse & Upload

1. Click the **Upload** button (or the `+` icon in the top bar).
2. Select one or multiple files from the file dialog.
3. Files are uploaded with real-time progress feedback.

### Upload Limits

- **Maximum file size**: Configurable by administrator (default 5 GB per file).
- **Simultaneous uploads**: Up to 5 files at once.
- **File types**: All file types are accepted.

### Upload Status

During upload you'll see:
- File name and current progress percentage
- Upload speed (e.g., `23.4 MB/s`)
- Estimated time remaining
- A checkmark ✓ when complete

> **Tip**: You can navigate to other pages while uploads run. Progress is shown in the notification icon.

---

## 5. Managing Files & Folders

### Creating Folders

1. In the **Files** view, click **New Folder**.
2. Type a name and press `Enter`.

### File Actions (Right-click Menu or Context Menu)

| Action | Description |
|---|---|
| **Download** | Save the file to your computer |
| **Rename** | Change the file or folder name |
| **Move** | Move to a different folder |
| **Copy** | Duplicate the file |
| **Share** | Create a shareable link |
| **Version History** | View all previous versions |
| **Add to Favorites** | Star the file for quick access |
| **Delete** | Move to trash |

### Multi-Select

- **Windows**: Hold `Ctrl` and click files to select multiple.
- **Mac**: Hold `⌘` and click files to select multiple.
- **Range**: Click first item, then `Shift+Click` the last to select a range.

Right-click any selected item to apply actions to all selected files at once.

### Views

Toggle between **Grid View** (thumbnails) and **List View** (details) with the view toggle button in the top-right of the files area.

### Sorting

Click any column header in list view to sort by that column. Click again to reverse the order.
Available sort options: **Name**, **Date Modified**, **Size**, **Type**.

---

## 6. Search & OCR

### Basic Search

1. Click the **Search** icon (🔍) in the navigation or press `Ctrl+K`.
2. Type your search term.
3. Results update in real-time as you type.

### Advanced Filters

Use the filter panel to narrow results:

| Filter | Options |
|---|---|
| **File Type** | Document, Image, Video, Audio, Archive, Other |
| **Date Range** | Today, Last 7 days, Last 30 days, Custom range |
| **Size** | Less than 1 MB, 1–100 MB, Greater than 100 MB |
| **Workspace** | Filter by specific team workspace |

### OCR — Search Inside Documents

The system automatically extracts text from:
- **PDF documents**
- **JPEG, PNG, TIFF images** containing printed or handwritten text

This means you can search for **words that appear inside** a scanned document or image, not just by filename.

> **Example**: Upload a scanned invoice PDF. Then search "Invoice #12345" and the system will find it even though the filename is `scan_001.pdf`.

OCR extraction happens automatically in the background after upload. It may take a few seconds for large documents.

---

## 7. Version History

Every time you upload a new version of an existing file, the system preserves all previous versions.

### Viewing Versions

1. Right-click any file → **Version History**.
2. The Version History panel slides in from the right.
3. See all versions with: version number, date uploaded, file size, and uploader.

### Restoring a Version

1. Open Version History for a file.
2. Find the version you want to restore.
3. Click **Restore** next to that version.
4. The selected version becomes the current version. The previous current version is preserved as another version entry.

### Downloading a Specific Version

1. In Version History, click **Download** next to any version.
2. The specific version downloads without affecting the current version.

---

## 8. File Sharing

### Creating a Share Link

1. Right-click a file → **Share**.
2. The Share dialog opens.
3. Configure the share options:

| Option | Description |
|---|---|
| **Permission** | `View Only` (stream/preview) or `Download` (save file) |
| **Expiry Date** | Optional. Link stops working after this date |
| **Password** | Optional. Recipients must enter a password to access |
| **Share Type** | `Public` (anyone with link) or `Private` (only invited users) |

4. Click **Create Link**.
5. Copy the generated link and share it.

### Managing Share Links

1. Right-click a file → **Share** → **Manage Links**.
2. See all active links, their access counts, and expiry dates.
3. Click **Revoke** to immediately invalidate a link.

### Downloading via Share Link

Recipients who open a share link can:
- Preview the file in the browser (images, PDFs, videos)
- Click **Download** if download permission was granted
- Enter the password if the link is password-protected

---

## 9. Team Workspaces

Workspaces let you collaborate with teammates on shared file collections.

### Creating a Workspace

1. Click **Workspaces** in the sidebar.
2. Click **New Workspace**.
3. Enter a workspace name and optional description.
4. Click **Create**.

### Inviting Members

1. Open a workspace.
2. Click **Members** → **Invite Member**.
3. Enter the email address of the person to invite.
4. Select their role:

| Role | Permissions |
|---|---|
| **Viewer** | View and download files |
| **Editor** | Upload, edit, move, delete files |
| **Admin** | Manage members, workspace settings |

5. Click **Send Invitation**.
6. The invitee receives an email with an invitation link.

### Accepting an Invitation

1. Click the invitation link in the email.
2. If not logged in, you'll be prompted to log in or register.
3. The workspace is added to your workspace list automatically.

### Workspace Files

All files uploaded inside a workspace are visible to all workspace members according to their role.

---

## 10. Comments & Collaboration

### Adding a Comment

1. Right-click a file and select **Open Comments**, or click the comment bubble icon.
2. The Comments panel opens on the right.
3. Type your comment in the text box at the bottom.
4. Press `Enter` or click **Post**.

### Replying to Comments

Click **Reply** under any comment to start a threaded conversation.

### Mentioning Teammates

Type `@` followed by a name to mention a workspace member:
- `@john` — a dropdown appears with matching members.
- Select a name to insert the mention.
- The mentioned user receives a notification.

### Editing and Deleting Comments

Hover over your own comment to see the **Edit** ✏️ and **Delete** 🗑️ icons.

---

## 11. Favorites & Recent Files

### Adding to Favorites

- Click the ⭐ icon next to any file in list view.
- Or right-click → **Add to Favorites**.
- The star turns yellow to confirm.

### Viewing Favorites

Click **Favorites** (⭐) in the sidebar to see all starred files across all workspaces.

### Recent Files

Click **Recent** (🕐) in the sidebar to see the 20 most recently accessed files, sorted by last accessed time.

---

## 12. Trash & Recovery

### Deleting Files

Files are not immediately deleted. They go to **Trash** first. This is a safety net.

### Recovering from Trash

1. Click **Trash** (🗑️) in the sidebar.
2. Find the file you want to recover.
3. Click **Restore**.
4. The file is returned to its original location.

### Permanent Deletion

1. Go to **Trash**.
2. Select the file(s) to permanently delete.
3. Click **Delete Permanently** → confirm the dialog.

> ⚠️ **Warning**: Permanently deleted files **cannot be recovered**. There is no undo.

### Auto-Purge

Files in Trash are automatically and permanently deleted after **30 days** (configurable by administrator).

---

## 13. Notifications

The bell icon 🔔 in the top navigation bar shows your unread notification count.

### Notification Types

| Type | Trigger |
|---|---|
| **File Shared** | Someone shared a file with you |
| **Comment** | Someone commented on your file |
| **Mention** | You were @mentioned in a comment |
| **Workspace Invite** | You received a workspace invitation |
| **Upload Complete** | Background upload finished |
| **Version Restored** | A file version was restored |

### Marking Read

- Click a notification to mark it as read and navigate to the relevant item.
- Click **Mark All Read** to clear the unread count.

---

## 14. Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+K` | Open global search |
| `Ctrl+U` | Open file upload dialog |
| `Delete` | Move selected files to trash |
| `F2` | Rename selected file |
| `Ctrl+A` | Select all files in current view |
| `Escape` | Close any open dialog or panel |
| `Ctrl+Z` | Undo last file operation (where supported) |
| `?` | Show keyboard shortcuts help |

> **Mac users**: Replace `Ctrl` with `⌘`.
