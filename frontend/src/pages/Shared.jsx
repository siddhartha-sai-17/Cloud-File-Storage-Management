import { useEffect, useState } from 'react';
import api from '../api';
import Layout from '../components/Layout';
import { Icons } from '../components/Icons';
import { useToast } from '../components/Toast';

export default function Shared() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        fetchSharedItems();
    }, []);

    const fetchSharedItems = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/share');
            setItems(res.data);
        } catch (err) {
            console.error(err);
            addToast('Failed to load shared items', 'error');
        } finally {
            setLoading(false);
        }
    };

    const disableShare = async (id) => {
        if (!confirm('Are you sure you want to stop sharing this file? The link will stop working.')) return;
        try {
            await api.delete(`/api/share/${id}`);
            addToast('Share link disabled', 'success');
            fetchSharedItems();
        } catch (err) {
            console.error(err);
            addToast('Failed to disable share', 'error');
        }
    };

    const copyLink = (token) => {
        const link = `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/public/${token}`;
        navigator.clipboard.writeText(link);
        addToast('Link copied', 'success');
    };

    return (
        <Layout>
            <div className="dashboard-actions">
                <div className="breadcrumb">
                    <h2>Shared Files</h2>
                </div>
            </div>

            {loading && items.length === 0 ? (
                <div className="loading-state">Loading...</div>
            ) : (
                <div className="shared-list">
                    {items.length === 0 ? (
                        <div className="empty-state">
                            <Icons.Share />
                            <p>You haven't shared any files yet.</p>
                        </div>
                    ) : (
                        <table className="shared-table">
                            <thead>
                                <tr>
                                    <th>File</th>
                                    <th>Created</th>
                                    <th>Status</th>
                                    <th>Link</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map(item => (
                                    <tr key={item.id} className={!item.active ? 'inactive' : ''}>
                                        <td>
                                            <div className="file-cell">
                                                <Icons.File /> {item.fileName}
                                            </div>
                                        </td>
                                        <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                                        <td>
                                            <span className={`status-badge ${item.active ? 'active' : 'inactive'}`}>
                                                {item.active ? 'Active' : 'Disabled'}
                                            </span>
                                        </td>
                                        <td>
                                            <button className="icon-btn" onClick={() => copyLink(item.token)} title="Copy Link">
                                                <Icons.Link />
                                            </button>
                                        </td>
                                        <td>
                                            {item.active && (
                                                <button className="icon-btn danger" onClick={() => disableShare(item.id)} title="Disable Share">
                                                    <Icons.Trash />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </Layout>
    );
}
