import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../auth/AuthContext';
import './Login.css';

/* ═══════════════════════════════════════════════════════
   CLOUD CANVAS HOOK
   - 3 parallax cloud layers (far / mid / near)
   - Stars that fade as you scroll
   - Sky color transitions from deep night → azure dawn
   - Cyan + purple ambient glows
═══════════════════════════════════════════════════════ */
function useCloudCanvas(canvasRef) {
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animId;
        let time = 0;
        let scrollY = 0;

        /* generate cloud objects for each layer */
        function genClouds(count, yRange, scaleRange, alphaRange) {
            return Array.from({ length: count }, () => ({
                x: -200 + Math.random() * 2600,
                y: yRange[0] + Math.random() * (yRange[1] - yRange[0]),
                scale: scaleRange[0] + Math.random() * (scaleRange[1] - scaleRange[0]),
                alpha: alphaRange[0] + Math.random() * (alphaRange[1] - alphaRange[0]),
                drift: 0.06 + Math.random() * 0.18,
            }));
        }

        const layers = [
            { parallax: 0.07, clouds: genClouds(10, [60, 430], [0.80, 1.50], [0.22, 0.42]) },  // far
            { parallax: 0.20, clouds: genClouds(8, [100, 390], [0.60, 1.10], [0.32, 0.55]) },  // mid
            { parallax: 0.42, clouds: genClouds(6, [140, 350], [0.45, 0.85], [0.28, 0.52]) },  // near
        ];

        /* star field */
        const stars = Array.from({ length: 200 }, () => ({
            x: Math.random(),
            y: Math.random() * 0.78,
            r: 0.3 + Math.random() * 1.8,
            phase: Math.random() * Math.PI * 2,
        }));

        function resize() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        resize();
        window.addEventListener('resize', resize);

        /* ── Draw one cloud cluster ──────────────────────── */
        function drawCloud(cx, cy, scale, alpha, ratio) {
            /* shape: [dx, dy, radius] */
            const parts = [
                [0, 0, 52],
                [44, -26, 40],
                [86, -12, 48],
                [122, 7, 36],
                [24, 15, 32],
                [65, 19, 30],
                [104, 22, 28],
            ];

            /* sky-driven color shift: stormy blue → dawn azure */
            const rb = 18 + Math.round(ratio * 22);
            const gb = 42 + Math.round(ratio * 45);
            const bb = 108 + Math.round(ratio * 65);

            ctx.save();
            parts.forEach(([dx, dy, r]) => {
                const px = cx + dx * scale;
                const py = cy + dy * scale;
                const g = ctx.createRadialGradient(px, py - r * 0.28 * scale, 0, px, py, r * scale);
                g.addColorStop(0, `rgba(${rb + 52}, ${gb + 72}, ${bb + 55}, ${alpha * 0.94})`);
                g.addColorStop(0.42, `rgba(${rb + 18}, ${gb + 28}, ${bb + 28}, ${alpha * 0.68})`);
                g.addColorStop(0.80, `rgba(${rb},      ${gb},      ${bb},      ${alpha * 0.30})`);
                g.addColorStop(1, `rgba(${rb},      ${gb},      ${bb},      0)`);
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(px, py, r * scale, 0, Math.PI * 2);
                ctx.fill();
            });

            /* cyan rim highlight on top puffs */
            const rim = ctx.createRadialGradient(
                cx + 44 * scale, cy - 32 * scale, 0,
                cx + 65 * scale, cy - 18 * scale, 82 * scale
            );
            rim.addColorStop(0, `rgba(0, 218, 255, ${alpha * 0.20})`);
            rim.addColorStop(1, 'rgba(0, 140, 255, 0)');
            ctx.globalCompositeOperation = 'screen';
            ctx.fillStyle = rim;
            ctx.beginPath();
            ctx.ellipse(cx + 65 * scale, cy - 6 * scale, 82 * scale, 46 * scale, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
            ctx.restore();
        }

        /* ── Main render loop ───────────────────────────── */
        function draw() {
            time += 0.0022;

            const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
            const ratio = Math.min(scrollY / maxScroll, 1);
            const W = canvas.width, H = canvas.height;

            ctx.clearRect(0, 0, W, H);

            /* Sky gradient */
            const sky = ctx.createLinearGradient(0, 0, 0, H);
            const r0 = 4 + Math.round(ratio * 10);
            const g0 = 8 + Math.round(ratio * 16);
            const b0 = 16 + Math.round(ratio * 44);
            sky.addColorStop(0, `rgb(${r0},${g0},${b0})`);
            sky.addColorStop(0.6, `rgb(${r0 + 8},${g0 + 16},${b0 + 32})`);
            sky.addColorStop(1, `rgb(${r0 + 14},${g0 + 28},${b0 + 58})`);
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, W, H);

            /* Stars — fade out as ratio increases */
            const starFade = Math.max(0, 1 - ratio * 2.8);
            if (starFade > 0.01) {
                stars.forEach(s => {
                    const twinkle = 0.5 + 0.5 * Math.sin(time * 1.7 + s.phase);
                    ctx.beginPath();
                    ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(195, 225, 255, ${starFade * twinkle * 0.82})`;
                    ctx.fill();
                });
            }

            /* Cloud layers — parallax + horizontal drift */
            layers.forEach(layer => {
                layer.clouds.forEach(cloud => {
                    cloud.x -= cloud.drift;
                    if (cloud.x + 220 * cloud.scale < 0) {
                        cloud.x = W + 60 + Math.random() * 220;
                        cloud.y = 50 + Math.random() * (H * 0.66);
                    }
                    const py = cloud.y - scrollY * layer.parallax;
                    if (py > -160 * cloud.scale && py < H + 110 * cloud.scale) {
                        drawCloud(cloud.x, py, cloud.scale, cloud.alpha, ratio);
                    }
                });
            });

            /* Ambient cyan glow — top-left */
            const cg = ctx.createRadialGradient(W * 0.18, 0, 0, W * 0.18, 0, W * 0.55);
            cg.addColorStop(0, `rgba(0, 210, 255, ${0.055 + ratio * 0.04})`);
            cg.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = cg;
            ctx.fillRect(0, 0, W, H);

            /* Ambient purple glow — bottom-right */
            const pg = ctx.createRadialGradient(W * 0.85, H, 0, W * 0.85, H, W * 0.48);
            pg.addColorStop(0, `rgba(100, 55, 220, ${0.065 + ratio * 0.03})`);
            pg.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = pg;
            ctx.fillRect(0, 0, W, H);

            /* Vignette */
            const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.07, W / 2, H / 2, H * 0.88);
            vig.addColorStop(0, 'rgba(0,0,0,0)');
            vig.addColorStop(1, 'rgba(0,0,0,0.58)');
            ctx.fillStyle = vig;
            ctx.fillRect(0, 0, W, H);

            animId = requestAnimationFrame(draw);
        }

        draw();

        const onScroll = () => { scrollY = window.scrollY; };
        window.addEventListener('scroll', onScroll, { passive: true });

        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', resize);
            window.removeEventListener('scroll', onScroll);
        };
    }, [canvasRef]);
}

/* ═══════════════════════════════════════════════════════
   LOGIN COMPONENT
═══════════════════════════════════════════════════════ */
export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [remember, setRemember] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const navigate = useNavigate();
    const { login } = useAuth();
    const cardRef = useRef(null);
    const btnRef = useRef(null);
    const canvasRef = useRef(null);

    /* cloud canvas */
    useCloudCanvas(canvasRef);

    /* 3-D card tilt on mouse move */
    useEffect(() => {
        const onMove = (e) => {
            if (!cardRef.current) return;
            const cx = window.innerWidth / 2;
            const cy = window.innerHeight / 2;
            const dx = (e.clientX - cx) / (window.innerWidth / 2);
            const dy = (e.clientY - cy) / (window.innerHeight / 2);
            cardRef.current.style.transform = `rotateY(${dx * 10}deg) rotateX(${-dy * 8}deg)`;
        };
        const onLeave = () => {
            if (cardRef.current)
                cardRef.current.style.transform = 'rotateY(0deg) rotateX(0deg)';
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseleave', onLeave);
        return () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseleave', onLeave);
        };
    }, []);

    /* card glow on field focus */
    const handleInputFocus = useCallback(() => {
        if (cardRef.current)
            cardRef.current.style.boxShadow = [
                '0 0 0 1px rgba(0,230,255,0.06)',
                '0 40px 80px rgba(0,0,0,0.7)',
                'inset 0 1px 0 rgba(255,255,255,0.06)',
                '0 0 70px rgba(0,230,255,0.12)',
            ].join(',');
    }, []);
    const handleInputBlur = useCallback(() => {
        if (cardRef.current)
            cardRef.current.style.boxShadow = [
                '0 0 0 1px rgba(0,230,255,0.06)',
                '0 40px 80px rgba(0,0,0,0.7)',
                'inset 0 1px 0 rgba(255,255,255,0.06)',
            ].join(',');
    }, []);

    /* ripple */
    const createRipple = useCallback((btn, e) => {
        const rect = btn.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height) * 2;
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        const r = document.createElement('span');
        r.className = 'lp-ripple';
        r.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px;`;
        btn.appendChild(r);
        setTimeout(() => r.remove(), 700);
    }, []);

    /* social ripple */
    const socialRipple = useCallback((e) => {
        const btn = e.currentTarget;
        const rect = btn.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height) * 2;
        const r = document.createElement('span');
        r.className = 'lp-ripple';
        r.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size / 2}px;top:${e.clientY - rect.top - size / 2}px;`;
        btn.appendChild(r);
        setTimeout(() => r.remove(), 700);
    }, []);

    /* login */
    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        if (!username.trim() || !password) {
            setError('Please enter your username and password.');
            return;
        }
        if (btnRef.current) createRipple(btnRef.current, e.nativeEvent || e);
        setLoading(true);
        try {
            const res = await api.post('/api/auth/login', { username, password });
            login(res.data.token);
            if (cardRef.current) {
                cardRef.current.style.transition = 'transform 0.5s cubic-bezier(0.22,1,0.36,1), box-shadow 0.3s ease';
                cardRef.current.style.transform = 'scale(1.025) rotateY(0deg) rotateX(0deg)';
                setTimeout(() => {
                    if (cardRef.current)
                        cardRef.current.style.transform = 'scale(1) rotateY(0deg) rotateX(0deg)';
                }, 450);
            }
            setSuccess(true);
            setTimeout(() => navigate('/dashboard'), 2000);
        } catch {
            setError('Invalid credentials. Please check your username and password.');
        } finally {
            setLoading(false);
        }
    };

    /* enter key */
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Enter') btnRef.current?.click(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);

    return (
        <>
            {/* Scroll space — gives the page height so scroll events fire */}
            <div className="lp-scroll-space" />

            {/* Cloud canvas — fixed, behind everything */}
            <canvas ref={canvasRef} className="lp-cloud-canvas" />

            {/* Fixed UI layer */}
            <div className="lp-root">
                <div className="lp-scene">
                    <div className="lp-card-wrap">
                        <div className="lp-card" ref={cardRef}>

                            {/* Success overlay */}
                            <div className={`lp-success-overlay${success ? ' visible' : ''}`}>
                                <div className="lp-success-icon">
                                    <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                                </div>
                                <div className="lp-success-title">Access Granted</div>
                                <div className="lp-success-subtitle">Redirecting to your vault…</div>
                            </div>

                            {/* Logo */}
                            <div className="lp-logo-wrap">
                                <div className="lp-vault-icon">
                                    <div className="lp-vault-ring" />
                                    <div className="lp-vault-ring" />
                                    <div className="lp-vault-core">
                                        <svg viewBox="0 0 24 24">
                                            <rect x="3" y="11" width="18" height="11" rx="2" />
                                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="lp-logo-name">Cloud<span>Vault</span></div>
                                <div className="lp-logo-tagline">File Storage Management</div>
                            </div>

                            {/* Error */}
                            <div className={`lp-error-msg${error ? ' visible' : ''}`}>{error}</div>

                            <form onSubmit={handleLogin} noValidate>
                                {/* Username */}
                                <div className="lp-field lp-field-1">
                                    <label className="lp-field-label" htmlFor="lp-username">Username</label>
                                    <div className="lp-input-wrap">
                                        <svg className="lp-input-icon" viewBox="0 0 24 24">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                            <circle cx="12" cy="7" r="4" />
                                        </svg>
                                        <input
                                            id="lp-username"
                                            className="lp-field-input"
                                            placeholder="Enter your username"
                                            value={username}
                                            onChange={e => setUsername(e.target.value)}
                                            autoComplete="username"
                                            onFocus={handleInputFocus}
                                            onBlur={handleInputBlur}
                                        />
                                    </div>
                                </div>

                                {/* Password */}
                                <div className="lp-field lp-field-2">
                                    <label className="lp-field-label" htmlFor="lp-password">Password</label>
                                    <div className="lp-input-wrap">
                                        <svg className="lp-input-icon" viewBox="0 0 24 24">
                                            <rect x="3" y="11" width="18" height="11" rx="2" />
                                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                        </svg>
                                        <input
                                            id="lp-password"
                                            className="lp-field-input"
                                            type={showPass ? 'text' : 'password'}
                                            placeholder="Enter your password"
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            autoComplete="current-password"
                                            onFocus={handleInputFocus}
                                            onBlur={handleInputBlur}
                                        />
                                        <button type="button" className="lp-pw-toggle" onClick={() => setShowPass(v => !v)}>
                                            {showPass ? (
                                                <svg viewBox="0 0 24 24">
                                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" />
                                                </svg>
                                            ) : (
                                                <svg viewBox="0 0 24 24">
                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Options */}
                                <div className="lp-field lp-field-3 lp-options-row">
                                    <label className="lp-remember-label">
                                        <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
                                        Keep me signed in
                                    </label>
                                    <button type="button" className="lp-forgot-btn">Forgot password?</button>
                                </div>

                                {/* Submit */}
                                <div className="lp-btn-wrap">
                                    <button
                                        id="lp-login-btn"
                                        ref={btnRef}
                                        type="submit"
                                        className={`lp-btn-login${loading ? ' is-loading' : ''}`}
                                        disabled={loading}
                                    >
                                        <span className="lp-btn-text">Access Vault</span>
                                        <div className="lp-btn-loader">
                                            <span className="dot" /><span className="dot" /><span className="dot" />
                                        </div>
                                    </button>
                                </div>
                            </form>

                            {/* Divider + Social */}
                            <div className="lp-divider"><span>or continue with</span></div>
                            <div className="lp-social-row">
                                <button type="button" className="lp-btn-social" onClick={socialRipple}>
                                    <svg viewBox="0 0 24 24" fill="none">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                    </svg>
                                    Google
                                </button>
                                <button type="button" className="lp-btn-social" onClick={socialRipple}>
                                    <svg viewBox="0 0 24 24" fill="rgba(255,255,255,0.65)">
                                        <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.34-3.369-1.34-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                                    </svg>
                                    GitHub
                                </button>
                            </div>

                            {/* Footer */}
                            <div className="lp-card-footer">
                                No account?{' '}<Link to="/register">Request access &rarr;</Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Scroll hint */}
                <div className="lp-scroll-hint">
                    <span>Scroll to fly through the clouds</span>
                    <div className="lp-scroll-arrow">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 5v14M5 12l7 7 7-7" />
                        </svg>
                    </div>
                </div>
            </div>
        </>
    );
}
