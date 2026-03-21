import { useEffect, useState, useRef } from 'react';
import api from '../api';
import Layout from '../components/Layout';
import { Icons } from '../components/Icons';
import { useToast } from '../components/Toast';

export default function Dashboard() {
    const [items, setItems] = useState([]);
    const [currentFolder, setCurrentFolder] = useState(null);
    const [folderHistory, setFolderHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [shareLink, setShareLink] = useState('');
    const fileInputRef = useRef(null);
    const { addToast } = useToast();

    useEffect(() => {
        fetchItems(currentFolder);
    }, [currentFolder]);

    const fetchItems = async (folderId) => {
        setLoading(true);
        try {
            const url = folderId ? `/api/storage?folderId=${folderId}` : '/api/storage';
            const res = await api.get(url);
            setItems(res.data);
        } catch (err) {
            console.error(err);
            // Error handling is partly done by interceptor (401), but we can toast other errors
            if (err.response && err.response.status !== 401) {
                addToast('Failed to load items. Please try again.', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        if (currentFolder) {
            formData.append('folderId', currentFolder);
        }

        try {
            setLoading(true);

            // Should be /api/storage/upload based on context
            await api.post('/api/storage/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            addToast('File uploaded successfully', 'success');
            fetchItems(currentFolder);
        } catch (err) {
            console.error(err);
            addToast(err.response?.data?.message || 'Upload failed', 'error');
        }
        // Reset input
        e.target.value = null;
    };

    const createFolder = async () => {
        const name = prompt('Folder name:');
        if (!name) return;
        try {
            const params = { name };
            if (currentFolder) params.parentId = currentFolder;

            await api.post('/api/storage/folder', null, { params });
            addToast('Folder created', 'success');
            fetchItems(currentFolder);
        } catch (err) {
            console.error(err);
            addToast(err.response?.data?.message || 'Folder creation failed', 'error');
        }
    };

    const downloadFile = async (id, name) => {
        try {
            const res = await api.get(`/api/storage/download/${id}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', name);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            addToast('Download started', 'success');
        } catch (err) {
            console.error(err);
            addToast('Download failed', 'error');
        }
    };

    const handleShare = async (e, fileId) => {
        e.stopPropagation();
        try {
            const res = await api.post(`/api/share/${fileId}`);
            // Construct full URL pointing to Backend Public Endpoint
            // Requirement says "Clicking link opens file in browser and downloads file (public route)"
            // Using backend URL directly for this.
            const link = `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/public/${res.data.token}`;
            setShareLink(link);
            setShareModalOpen(true);
        } catch (err) {
            console.error(err);
            addToast('Failed to create share link', 'error');
        }
    };

    const enterFolder = (id) => {
        setFolderHistory([...folderHistory, currentFolder]);
        setCurrentFolder(id);
    };

    const goBack = () => {
        const prev = folderHistory.pop();
        setFolderHistory([...folderHistory]);
        setCurrentFolder(prev);
    }

    const triggerUpload = () => {
        fileInputRef.current.click();
    }

    const copyToClipboard = () => {
        navigator.clipboard.writeText(shareLink);
        addToast('Link copied to clipboard', 'success');
    };

    return (
        <Layout>
            <div className="dashboard-actions">
                <div className="breadcrumb">
                    <button
                        className="nav-btn"
                        onClick={() => {
                            setFolderHistory([]);
                            setCurrentFolder(null);
                        }}
                        disabled={!currentFolder}
                    >
                        Home
                    </button>
                    {currentFolder && (
                        <>
                            <span>/</span>
                            <button className="nav-btn active" onClick={goBack}>Back</button>
                        </>
                    )}
                </div>
                <div className="action-buttons">
                    <button className="btn btn-secondary" onClick={createFolder}>
                        <Icons.Plus /> New Folder
                    </button>
                    <button className="btn btn-primary" onClick={triggerUpload}>
                        <Icons.Upload /> Upload File
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleUpload}
                        style={{ display: 'none' }}
                    />
                </div>
            </div>

            {loading && items.length === 0 ? (
                <div className="loading-state">Loading...</div>
            ) : (
                <div className="file-grid">
                    {items.map(item => (
                        <div
                            key={item.id}
                            className={`item-card ${item.type.toLowerCase()}`}
                            onClick={() => item.type === 'FOLDER' ? enterFolder(item.id) : downloadFile(item.id, item.name)}
                        >
                            <div className="icon-wrapper">
                                {item.type === 'FOLDER' ? <Icons.Folder /> : <Icons.File />}
                            </div>
                            <div className="item-info">
                                <span className="item-name">{item.name}</span>
                                <span className="item-meta">{item.type === 'FILE' ? (item.size / 1024).toFixed(1) + ' KB' : 'Folder'}</span>
                            </div>
                            {item.type === 'FILE' && (
                                <button className="share-btn" onClick={(e) => handleShare(e, item.id)} title="Share File">
                                    <Icons.Share />
                                </button>
                            )}
                        </div>
                    ))}

                    {items.length === 0 && !loading && (
                        <div className="empty-state">
                            <Icons.Folder />
                            <p>This folder is empty</p>
                            <button className="btn btn-primary" onClick={triggerUpload}>Upload your first file</button>
                        </div>
                    )}
                </div>
            )}

            {shareModalOpen && (
                <div className="modal-overlay" onClick={() => setShareModalOpen(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>Share File</h3>
                        <p>Anyone with this link can download the file.</p>
                        <div className="share-link-box">
                            <input type="text" readOnly value={shareLink} />
                            <button onClick={copyToClipboard}><Icons.Link /></button>
                        </div>
                        <button className="btn btn-secondary" onClick={() => setShareModalOpen(false)}>Close</button>
                    </div>
                </div>
            )}
        </Layout>
    );
}
