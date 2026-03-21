import React, { useEffect } from 'react';

const ToastContext = React.createContext();

export function ToastProvider({ children }) {
    const [toasts, setToasts] = React.useState([]);

    const addToast = (message, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => removeToast(id), 3000);
    };

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <div className="toast-container">
                {toasts.map(toast => (
                    <div key={toast.id} className={`toast toast-${toast.type}`}>
                        {toast.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export const useToast = () => React.useContext(ToastContext);

// Add styles for toast
// .toast-container { position: fixed; bottom: 20px; right: 20px; z-index: 1000; display: flex; flex-direction: column; gap: 10px; }
// .toast { padding: 12px 24px; border-radius: 8px; color: white; animation: slideIn 0.3s ease; }
// .toast-success { background: #10b981; }
// .toast-error { background: #ef4444; }
// .toast-info { background: #3b82f6; }
