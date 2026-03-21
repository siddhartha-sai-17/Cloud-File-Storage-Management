import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Icons } from './Icons';
import { useAuth } from '../auth/AuthContext';

export default function Layout({ children }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();
    const username = user?.username || 'User';

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="layout">
            <aside className="sidebar">
                <div className="brand">
                    <div className="logo-circle">
                        <Icons.Folder />
                    </div>
                    <h2>CloudBox</h2>
                </div>

                <nav>
                    <button className={`nav-item ${location.pathname === '/dashboard' ? 'active' : ''}`} onClick={() => navigate('/dashboard')}>
                        <Icons.Folder /> My Files
                    </button>
                    <button className={`nav-item ${location.pathname === '/shared' ? 'active' : ''}`} onClick={() => navigate('/shared')}>
                        <Icons.Share /> Shared
                    </button>
                </nav>

                <div className="bottom-actions">
                    <button className="nav-item logout" onClick={handleLogout}>
                        <Icons.LogOut /> Logout
                    </button>
                </div>
            </aside>

            <main className="main-content">
                <header className="top-bar">
                    <div className="search-bar">
                        <Icons.Search />
                        <input type="text" placeholder="Search your files..." />
                    </div>
                    <div className="user-profile">
                        <div className="avatar">{username[0]}</div>
                        <span>{username}</span>
                    </div>
                </header>

                <div className="page-content">
                    {children}
                </div>
            </main>
        </div>
    );
}
