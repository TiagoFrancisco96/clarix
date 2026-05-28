'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, signUp } from '@/lib/auth-client';
import './login.css';

export default function LoginPage() {
    const router = useRouter();
    const [isSignUp, setIsSignUp] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showForgot, setShowForgot] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotSent, setForgotSent] = useState(false);
    const [forgotLoading, setForgotLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isSignUp) {
                const res = await signUp.email({
                    name,
                    email,
                    password,
                });
                if (res.error) {
                    setError(res.error.message || 'Sign up failed');
                } else {
                    router.push('/chat');
                }
            } else {
                const res = await signIn.email({
                    email,
                    password,
                });
                if (res.error) {
                    setError(res.error.message || 'Sign in failed');
                } else {
                    router.push('/chat');
                }
            }
        } catch {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        await signIn.social({
            provider: 'google',
            callbackURL: '/chat',
        });
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!forgotEmail.trim()) return;
        setForgotLoading(true);
        try {
            const res = await fetch('/api/auth/forget-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: forgotEmail, redirectTo: '/login' }),
            });
            if (!res.ok) throw new Error('Failed');
            setForgotSent(true);
        } catch {
            // Show success even if it fails (don't leak whether email exists)
            setForgotSent(true);
        } finally {
            setForgotLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-bg" />

            <div className="login-card">
                <div className="login-logo">
                    <span className="login-logo__icon">C</span>
                    <span className="login-logo__text">Clarix AI</span>
                </div>

                <h1 className="login-title">
                    {showForgot ? 'Reset your password' : isSignUp ? 'Create your account' : 'Welcome back'}
                </h1>
                <p className="login-subtitle">
                    {showForgot
                        ? 'Enter your email and we\u2019ll send you a reset link'
                        : isSignUp
                            ? 'Start creating with AI today'
                            : 'Sign in to your AI workspace'}
                </p>

                {/* Google OAuth */}
                <button
                    type="button"
                    className="login-google"
                    onClick={handleGoogleSignIn}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Continue with Google
                </button>

                <div className="login-divider">
                    <span>or</span>
                </div>

                {/* Email/Password Form */}
                {showForgot ? (
                    forgotSent ? (
                        <div className="login-form" style={{ textAlign: 'center', padding: '20px 0' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '12px' }}>✉️</div>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                                Check your email for a password reset link.
                            </p>
                            <button
                                type="button"
                                className="login-submit"
                                onClick={() => { setShowForgot(false); setForgotSent(false); setForgotEmail(''); }}
                            >
                                Back to Sign In
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleForgotPassword} className="login-form">
                            <div className="login-field">
                                <label htmlFor="forgot-email">Email</label>
                                <input
                                    id="forgot-email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={forgotEmail}
                                    onChange={(e) => setForgotEmail(e.target.value)}
                                    required
                                />
                            </div>
                            {error && <div className="login-error">{error}</div>}
                            <button type="submit" className="login-submit" disabled={forgotLoading}>
                                {forgotLoading ? <span className="login-spinner" /> : 'Send Reset Link'}
                            </button>
                            <p className="login-toggle">
                                <button type="button" onClick={() => { setShowForgot(false); setError(''); }}>
                                    ← Back to Sign In
                                </button>
                            </p>
                        </form>
                    )
                ) : (
                <form onSubmit={handleSubmit} className="login-form">
                    {isSignUp && (
                        <div className="login-field">
                            <label htmlFor="name">Name</label>
                            <input
                                id="name"
                                type="text"
                                placeholder="Your name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                    )}

                    <div className="login-field">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="login-field">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={8}
                        />
                    </div>

                    {!isSignUp && (
                        <p className="login-forgot">
                            <button type="button" onClick={() => { setShowForgot(true); setError(''); }}>
                                Forgot password?
                            </button>
                        </p>
                    )}

                    {error && <div className="login-error">{error}</div>}

                    <button
                        type="submit"
                        className="login-submit"
                        disabled={loading}
                    >
                        {loading ? (
                            <span className="login-spinner" />
                        ) : isSignUp ? (
                            'Create Account'
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>
                )}

                <p className="login-toggle">
                    {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                    <button
                        type="button"
                        onClick={() => {
                            setIsSignUp(!isSignUp);
                            setError('');
                            setShowForgot(false);
                        }}
                    >
                        {isSignUp ? 'Sign in' : 'Sign up'}
                    </button>
                </p>
            </div>
        </div>
    );
}
